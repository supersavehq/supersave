import Debug, { Debugger } from 'debug';
import { Database } from 'sqlite';
import { EntityDefinition, FilterSortField } from '../types';
import Repository from './Repository';

const debug: Debugger = Debug('supersave:db:sync');

const enum SqliteType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
}

type SqlitePragmaColumn = {
  name: string,
  notnull: number,
  type: SqliteType,
  pk: number,
};

const filterSortFieldSqliteTypeMap = {
  string: SqliteType.TEXT,
  number: SqliteType.INTEGER,
  boolean: SqliteType.INTEGER,
};

async function getTableColumns(
  connection: Database,
  tableName: string,
  entity: EntityDefinition,
): Promise<Record<string, FilterSortField>> {
  const query = `pragma table_info('${tableName}');`;
  const columns = await connection.all<SqlitePragmaColumn[]>(query);
  if (columns === undefined) {
    throw new Error(`Unable to query table structure for ${tableName}.`);
  }

  if (columns.length === 2 && !entity.filterSortFields) {
    debug('Only id column found and no additional filterSortFields defined.');
    return {};
  }

  const sqliteTypeMap: Record<SqliteType, FilterSortField> = {
    [SqliteType.TEXT]: 'string',
    [SqliteType.INTEGER]: 'number',
    [SqliteType.INTEGER]: 'number',
  };

  const mappedColumns: Record<string, FilterSortField> = {};
  columns.forEach((column: SqlitePragmaColumn) => {
    if (column.name === 'id' || column.name === 'contents') {
      return;
    }
    if (!sqliteTypeMap[column.type]) {
      throw new Error(`Unrecognized Sqlite column type ${column.type}`);
    }
    mappedColumns[column.name] = sqliteTypeMap[column.type];
  });
  return mappedColumns;
}

function hasTableChanged(
  sqliteColumns: Record<string, FilterSortField>,
  filterSortTypeFields: Record<string, FilterSortField>,
): boolean {
  return JSON.stringify(sqliteColumns) !== JSON.stringify(filterSortTypeFields);
}

export default async (
  entity: EntityDefinition,
  tableName: string,
  connection: Database,
  repository: Repository<any>,
  getRepository: (name: string, namespace?: string) => Repository<any>,
): Promise<void> => {
  if (typeof entity.filterSortFields === 'undefined') {
    return;
  }

  const sqliteColumns = await getTableColumns(connection, tableName, entity);
  if (!hasTableChanged(sqliteColumns, entity.filterSortFields)) {
    debug('Table has not changed, skipping making changes.');
    return;
  }

  const newTableName = `${tableName}_2`;
  const columns = [
    'id TEXT PRIMARY KEY',
    'contents TEXT NOT NULL',
  ];
  const indexes = [];

  const filterSortFieldNames: string[] = Object.keys(entity.filterSortFields);
  for (let iter = 0; iter < filterSortFieldNames.length; iter += 1) {
    const fieldName = filterSortFieldNames[iter];
    const filterSortFieldType = entity.filterSortFields[fieldName];
    if (typeof filterSortFieldSqliteTypeMap[filterSortFieldType] === 'undefined') {
      throw new Error(`Unrecognized field type ${filterSortFieldType}.`);
    }

    columns.push(`${fieldName} ${filterSortFieldSqliteTypeMap[filterSortFieldType]} NULL`);
    indexes.push(`CREATE INDEX idx_${fieldName} ON ${newTableName}(${fieldName})`);
  }

  const createQuery = `CREATE TABLE ${newTableName} (${columns.join(',')})`;

  // TODO start a transaction
  debug('Creating temporary table.', createQuery);
  await connection.run(createQuery);

  debug('Setting indexes.');
  for (let iter = indexes.length - 1; iter >= 0; iter -= 1) {
    await connection.run(indexes[iter]);
  }

  // copy the fields
  debug('Copying contents to new table.');
  const newRepository = new Repository(entity, newTableName, getRepository, connection);

  const oldAll = await repository.getAll();
  for (let iter = 0; iter < oldAll.length; iter += 1) {
    await newRepository.create(oldAll[iter]);
  }

  debug('Completed copy. Dropping table and renaming temporary table.');
  await connection.run(`DROP TABLE ${tableName}`);
  await connection.run(`ALTER TABLE ${newTableName} RENAME TO ${tableName}`);
};
