import Debug, { Debugger } from 'debug';
import { PoolConnection, Pool } from 'mysql';
import { EntityDefinition, FilterSortField } from '../../types';
import Repository from './repository';
import BaseRepository from '../repository';
import { isEqual } from '../utils';
import { getQuery, executeQuery, getConnectionFromPool } from './utils';

const debug: Debugger = Debug('supersave:db:sync');

const enum MysqlType {
  TEXT = 'text',
  INTEGER = 'int(11)',
  BOOLEAN = 'tinyint(4)',
}

type MysqlDescRow = {
  Field: string,
  Type: MysqlType,
  Null: 'YES'|'NO',
  Key: string,
  Extra: string,
};

const filterSortFieldTypeMap = {
  string: MysqlType.TEXT,
  number: MysqlType.INTEGER,
  boolean: MysqlType.BOOLEAN,
};

async function getTableColumns(
  connection: PoolConnection,
  tableName: string,
  entity: EntityDefinition,
): Promise<Record<string, MysqlType>> {
  const query = `DESC \`${tableName}\`;`;
  const columns = await getQuery<MysqlDescRow>(connection, query);

  if (columns === undefined) {
    throw new Error(`Unable to query table structure for ${tableName}.`);
  }

  if (columns.length === 2 && !entity.filterSortFields) {
    debug('Only id column found and no additional filterSortFields defined.');
    return {};
  }

  const mysqlTypeMap: Record<MysqlType|string, FilterSortField> = {
    'varchar(32)': 'string', // the id
    [MysqlType.TEXT]: 'string',
    [MysqlType.INTEGER]: 'number',
    [MysqlType.BOOLEAN]: 'number',
  };

  const mappedColumns: Record<string, MysqlType> = {};
  columns.forEach((column: MysqlDescRow) => {
    if (column.Field === 'contents' || column.Field === 'id') {
      return;
    }
    if (!mysqlTypeMap[column.Type]) {
      throw new Error(`Unrecognized Mysql column type ${column.Type}`);
    }
    mappedColumns[column.Field] = column.Type;
  });
  return mappedColumns;
}

function hasTableChanged(
  mysqlColumns: Record<string, MysqlType>,
  mappedFilterSortTypeFields: Record<string, MysqlType>,
): boolean {
  const tablesAreEqual: boolean = isEqual(mysqlColumns, mappedFilterSortTypeFields);
  if (!tablesAreEqual) {
    debug('Table changed', mysqlColumns, mappedFilterSortTypeFields);
  }
  return !tablesAreEqual;
}

function mapFilterSortFieldsToColumns(filterSortFields: Record<string, FilterSortField>): Record<string, MysqlType> {
  const result: Record<string, MysqlType> = {};
  Object.entries(filterSortFields).forEach(([fieldName, filter]: [string, FilterSortField]) => {
    result[fieldName] = filterSortFieldTypeMap[filter];
  });
  delete result.id; // We do not check the ID, since that is not a TEXT column.
  return result;
}

export default async (
  entity: EntityDefinition,
  tableName: string,
  pool: Pool,
  repository: Repository<any>,
  getRepository: (name: string, namespace?: string) => BaseRepository<any>,
): Promise<void> => {
  if (typeof entity.filterSortFields === 'undefined') {
    return;
  }

  const connection: PoolConnection = await getConnectionFromPool(pool);
  const mysqlColumns = await getTableColumns(connection, tableName, entity);
  const newMysqlColumns: Record<string, MysqlType> = mapFilterSortFieldsToColumns(entity.filterSortFields);
  if (!hasTableChanged(mysqlColumns, newMysqlColumns)) {
    debug('Table has not changed, not making changes.');
    connection.release();
    return;
  }

  const newTableName = `${tableName}_2`;
  const columns = [
    'id VARCHAR(32) PRIMARY KEY',
    'contents TEXT NOT NULL',
  ];
  const indexes = [];

  const filterSortFieldNames: string[] = Object.keys(entity.filterSortFields);
  for (let iter = 0; iter < filterSortFieldNames.length; iter += 1) {
    const fieldName = filterSortFieldNames[iter];
    const filterSortFieldType = entity.filterSortFields[fieldName];
    if (typeof filterSortFieldTypeMap[filterSortFieldType] === 'undefined') {
      throw new Error(`Unrecognized field type ${filterSortFieldType}.`);
    }

    if (fieldName !== 'id') {
      columns.push(`${pool.escapeId(fieldName)} ${filterSortFieldTypeMap[filterSortFieldType]} NULL`);
      indexes.push(fieldName);
    }
  }

  await executeQuery(connection, `DROP TABLE IF EXISTS ${pool.escapeId(newTableName)};`);
  let createQuery = `CREATE TABLE ${pool.escapeId(newTableName)} (${columns.join(',')}`;
  if (indexes.length > 0) {
    createQuery = `${createQuery}, ${indexes.map((index) => `INDEX(${pool.escapeId(index)}${(entity.filterSortFields as Record<string, FilterSortField>)[index] === 'string' ? '(999)' : ''})`).join(',')})`;
  } else {
    createQuery = `${createQuery})`;
  }

  // TODO start a transaction
  debug('Creating temporary table.', createQuery);
  await executeQuery(connection, createQuery);

  // debug('Setting indexes.');
  // for (let iter = indexes.length - 1; iter >= 0; iter -= 1) {
  //   await executeQuery(connection, indexes[iter]);
  // }

  // copy the fields
  debug('Copying contents to new table.');
  const newRepository = new Repository(entity, newTableName, getRepository, pool);

  const oldAll = await repository.getAll();
  for (let iter = 0; iter < oldAll.length; iter += 1) {
    await newRepository.create(oldAll[iter]);
  }

  debug(`Completed copy. Dropping table ${tableName} and renaming temporary table ${newTableName}.`);
  await executeQuery(connection, `DROP TABLE ${pool.escapeId(tableName)}`);
  await executeQuery(connection, `ALTER TABLE ${pool.escapeId(newTableName)} RENAME ${pool.escapeId(tableName)}`);

  connection.release();
};
