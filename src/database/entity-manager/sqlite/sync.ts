import type { Database } from 'better-sqlite3';
import type { Debugger } from 'debug';
import Debug from 'debug';
import type { EntityDefinition, FilterSortField } from '../../types';
import type BaseRepository from '../repository';
import { isEqual } from '../utils';
import Repository from './repository';

const debug: Debugger = Debug('supersave:db:sync');

enum SqliteType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'INTEGER',
}

type SqlitePragmaColumn = {
  name: string;
  notnull: number;
  type: SqliteType;
  pk: number;
};

const filterSortFieldSqliteTypeMap = {
  string: SqliteType.TEXT,
  number: SqliteType.INTEGER,
  boolean: SqliteType.BOOLEAN,
};

function getTableColumns(
  connection: Database,
  tableName: string,
  entity: EntityDefinition
): Record<string, SqliteType> {
  const query = `pragma table_info('${tableName}');`;
  const stmt = connection.prepare(query);
  const columns = stmt.all() as SqlitePragmaColumn[];

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
    // [SqliteType.BOOLEAN]: 'number', Its also maps to integer
  };

  const mappedColumns: Record<string, SqliteType> = {};
  columns.forEach((column: SqlitePragmaColumn) => {
    if (column.name === 'contents') {
      return;
    }
    if (!sqliteTypeMap[column.type]) {
      throw new Error(`Unrecognized Sqlite column type ${column.type}`);
    }
    mappedColumns[column.name] = column.type;
  });
  return mappedColumns;
}

function hasTableChanged(
  sqliteColumns: Record<string, SqliteType>,
  mappedFilterSortTypeFields: Record<string, SqliteType>
): boolean {
  const tablesAreEqual: boolean = isEqual(
    sqliteColumns,
    mappedFilterSortTypeFields
  );
  if (!tablesAreEqual) {
    debug('Table changed', sqliteColumns, mappedFilterSortTypeFields);
  }
  return !tablesAreEqual;
}

function mapFilterSortFieldsToColumns(
  filterSortFields: Record<string, FilterSortField>
): Record<string, SqliteType> {
  const result: Record<string, SqliteType> = {};
  Object.entries(filterSortFields).forEach(
    ([fieldName, filter]: [string, FilterSortField]) => {
      const sqliteType = filterSortFieldSqliteTypeMap[filter];
      if (!sqliteType) {
        throw new TypeError(
          `Unsupported filter type "${filter}" for "${fieldName}"`
        );
      }
      result[fieldName] = filterSortFieldSqliteTypeMap[filter];
    }
  );

  return result;
}

export default async (
  entity: EntityDefinition,
  tableName: string,
  connection: Database,

  repository: Repository<any>,

  getRepository: (name: string, namespace?: string) => BaseRepository<any>
): Promise<void> => {
  if (typeof entity.filterSortFields === 'undefined') {
    return;
  }

  const sqliteColumns = getTableColumns(connection, tableName, entity);
  const newSqliteColumns: Record<string, SqliteType> =
    mapFilterSortFieldsToColumns(entity.filterSortFields);

  if (!hasTableChanged(sqliteColumns, newSqliteColumns)) {
    debug('Table has not changed, not making changes.');
    return;
  }

  const newTableName = `${tableName}_2`;
  const columns = ['id TEXT PRIMARY KEY', 'contents TEXT NOT NULL'];
  const indexes = [];

  const filterSortFieldNames: string[] = Object.keys(entity.filterSortFields);
  for (const fieldName of filterSortFieldNames) {
    const filterSortFieldType = entity.filterSortFields[fieldName];
    if (
      typeof filterSortFieldSqliteTypeMap[filterSortFieldType] === 'undefined'
    ) {
      throw new TypeError(`Unrecognized field type ${filterSortFieldType}.`);
    }

    if (fieldName !== 'id') {
      columns.push(
        `"${fieldName}" ${filterSortFieldSqliteTypeMap[filterSortFieldType]} NULL`
      );
      indexes.push(
        `CREATE INDEX IF NOT EXISTS idx_${fieldName} ON ${newTableName}("${fieldName}")`
      );
    }
  }

  connection.prepare(`DROP TABLE IF EXISTS ${newTableName};`).run();
  const createQuery = `CREATE TABLE ${newTableName} (${columns.join(',')})`;

  // TODO start a transaction
  debug('Creating temporary table.', createQuery);
  connection.prepare(createQuery).run();

  debug('Setting indexes.');
  for (let iter = indexes.length - 1; iter >= 0; iter -= 1) {
    connection.prepare(indexes[iter]).run();
  }

  // copy the fields
  debug('Copying contents to new table.');
  const newRepository = new Repository(
    entity,
    newTableName,
    getRepository,
    connection
  );

  const oldAll = await repository.getAll();
  for (const element of oldAll) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await newRepository.create(element);
  }

  debug(
    `Completed copy. Dropping table ${tableName} and renaming temporary table ${newTableName}.`
  );
  connection.prepare(`DROP TABLE ${tableName}`).run();
  connection
    .prepare(`ALTER TABLE ${newTableName} RENAME TO ${tableName}`)
    .run();
};
