import type { Debugger } from "debug";
import Debug from "debug";
import type { Database } from "sqlite";
import Repository from "./repository";
import type { EntityDefinition, FilterSortField } from "../../types";
import type BaseRepository from "../repository";
import { isEqual } from "../utils";

const debug: Debugger = Debug("supersave:db:sync");

const enum SqliteType {
  TEXT = "TEXT",
  INTEGER = "INTEGER",
  BOOLEAN = "INTEGER",
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

async function getTableColumns(
  connection: Database,
  tableName: string,
  entity: EntityDefinition,
): Promise<Record<string, SqliteType>> {
  const query = `pragma table_info('${tableName}');`;
  const columns = await connection.all<SqlitePragmaColumn[]>(query);
  if (columns === undefined) {
    throw new Error(`Unable to query table structure for ${tableName}.`);
  }

  if (columns.length === 2 && !entity.filterSortFields) {
    debug("Only id column found and no additional filterSortFields defined.");
    return {};
  }

  const sqliteTypeMap: Record<SqliteType, FilterSortField> = {
    [SqliteType.TEXT]: "string",
    [SqliteType.INTEGER]: "number",
    // [SqliteType.BOOLEAN]: 'number', Its also maps to integer
  };

  const mappedColumns: Record<string, SqliteType> = {};
  columns.forEach((column: SqlitePragmaColumn) => {
    if (column.name === "contents") {
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
  mappedFilterSortTypeFields: Record<string, SqliteType>,
): boolean {
  const tablesAreEqual: boolean = isEqual(
    sqliteColumns,
    mappedFilterSortTypeFields,
  );
  if (!tablesAreEqual) {
    debug("Table changed", sqliteColumns, mappedFilterSortTypeFields);
  }
  return !tablesAreEqual;
}

function mapFilterSortFieldsToColumns(
  filterSortFields: Record<string, FilterSortField>,
): Record<string, SqliteType> {
  const result: Record<string, SqliteType> = {};
  Object.entries(filterSortFields).forEach(
    ([fieldName, filter]: [string, FilterSortField]) => {
      result[fieldName] = filterSortFieldSqliteTypeMap[filter];
    },
  );
  return result;
}

export default async (
  entity: EntityDefinition,
  tableName: string,
  connection: Database,
  repository: Repository<any>,
  getRepository: (name: string, namespace?: string) => BaseRepository<any>,
): Promise<void> => {
  if (typeof entity.filterSortFields === "undefined") {
    return;
  }

  const sqliteColumns = await getTableColumns(connection, tableName, entity);
  const newSqliteColumns: Record<string, SqliteType> =
    mapFilterSortFieldsToColumns(entity.filterSortFields);
  if (!hasTableChanged(sqliteColumns, newSqliteColumns)) {
    debug("Table has not changed, not making changes.");
    return;
  }

  const newTableName = `${tableName}_2`;
  const columns = ["id TEXT PRIMARY KEY", "contents TEXT NOT NULL"];
  const indexes = [];

  const filterSortFieldNames: string[] = Object.keys(entity.filterSortFields);
  for (const fieldName of filterSortFieldNames) {
    const filterSortFieldType = entity.filterSortFields[fieldName];
    if (
      typeof filterSortFieldSqliteTypeMap[filterSortFieldType] === "undefined"
    ) {
      throw new TypeError(`Unrecognized field type ${filterSortFieldType}.`);
    }

    if (fieldName !== "id") {
      columns.push(
        `"${fieldName}" ${filterSortFieldSqliteTypeMap[filterSortFieldType]} NULL`,
      );
      indexes.push(
        `CREATE INDEX IF NOT EXISTS idx_${fieldName} ON ${newTableName}("${fieldName}")`,
      );
    }
  }

  await connection.run(`DROP TABLE IF EXISTS ${newTableName};`);
  const createQuery = `CREATE TABLE ${newTableName} (${columns.join(",")})`;

  // TODO start a transaction
  debug("Creating temporary table.", createQuery);
  await connection.run(createQuery);

  debug("Setting indexes.");
  for (let iter = indexes.length - 1; iter >= 0; iter -= 1) {
    await connection.run(indexes[iter]);
  }

  // copy the fields
  debug("Copying contents to new table.");
  const newRepository = new Repository(
    entity,
    newTableName,
    getRepository,
    connection,
  );

  const oldAll = await repository.getAll();
  for (const element of oldAll) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await newRepository.create(element);
  }

  debug(
    `Completed copy. Dropping table ${tableName} and renaming temporary table ${newTableName}.`,
  );
  await connection.run(`DROP TABLE ${tableName}`);
  await connection.run(`ALTER TABLE ${newTableName} RENAME TO ${tableName}`);
};
