import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Pool, PoolClient } from 'pg';
import type { EntityDefinition, FilterSortField } from '../../types';
import type BaseRepository from '../repository';
import { escapeId } from './utils';
import type PostgresRepository from './repository';

const debug: Debugger = Debug('supersave:db:postgres:sync');

const enum PostgresType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  JSONB = 'JSONB',
  VARCHAR32 = 'VARCHAR(32)', // For ID
}

const filterSortFieldToPostgresTypeMap: Record<FilterSortField, PostgresType> = {
  string: PostgresType.TEXT,
  number: PostgresType.INTEGER,
  boolean: PostgresType.BOOLEAN,
};

// Keep existing PostgresColumnInfo and getTableColumns as they are useful for fetching current schema
type PostgresColumnInfo = {
  column_name: string;
  data_type: string;
  generation_expression: string | null;
};

async function getTableColumns(
  connection: PoolClient,
  tableName: string
): Promise<Record<string, { type: string; generation_expression?: string }>> {
  const query = `
    SELECT column_name, data_type, generation_expression
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = $1;
  `;
  // Ensure result.rows is properly handled if query returns no rows (e.g. table does not exist)
  const result = await connection.query<PostgresColumnInfo>(query, [tableName]);
  if (!result.rows) {
      return {};
  }
  const columns: Record<string, { type: string; generation_expression?: string }> = {};
  result.rows.forEach((row) => {
    columns[row.column_name] = {
      type: row.data_type.toUpperCase(),
      generation_expression: row.generation_expression || undefined,
    };
  });
  return columns;
}

function getGenerationExpression(fieldName: string, type: FilterSortField): string {
  const pgType = filterSortFieldToPostgresTypeMap[type];
  // Sanitize fieldName for use in SQL string, though it comes from definition.
  // For security, if fieldName could ever be user-input, it would need proper escaping.
  const safeFieldName = fieldName.replace(/'/g, "''");

  switch (pgType) {
    case PostgresType.TEXT:
      return `(contents->>'${safeFieldName}')`;
    case PostgresType.INTEGER:
      return `((contents->>'${safeFieldName}')::integer)`;
    case PostgresType.BOOLEAN:
      return `((contents->>'${safeFieldName}')::boolean)`;
    default:
      throw new Error(`Unsupported type for generated column: ${type}`);
  }
}

// Normalize generation expression for comparison
const normalizeExpr = (expr?: string) => expr?.replace(/\s+/g, '').toLowerCase()
  // PostgreSQL might add extra casts or schema qualifications, try to strip some common ones.
  // This is a heuristic and might need refinement based on actual observed expressions.
  .replace(/::text/g, '')
  .replace(/public\./g, '');


export default async (
  entity: EntityDefinition,
  tableName: string,
  pool: Pool,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  repository: PostgresRepository<any>, // Keep for signature consistency, though not used in this version
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRepository: (name: string, namespace?: string) => BaseRepository<any>
): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    debug(`Starting sync for table ${escapeId(tableName)}`);

    const existingColumns = await getTableColumns(client, tableName);
    const tableExists = Object.keys(existingColumns).length > 0;

    if (!tableExists) {
      debug(`Table ${escapeId(tableName)} does not exist. Creating now.`);
      const columnDefinitions: string[] = [
        `${escapeId('id')} ${PostgresType.VARCHAR32} PRIMARY KEY`,
        `${escapeId('contents')} ${PostgresType.JSONB} NOT NULL`,
      ];
      const indexes: string[] = [];

      if (entity.filterSortFields) {
        for (const [fieldName, fieldType] of Object.entries(entity.filterSortFields)) {
          if (fieldName === 'id') continue;
          const pgType = filterSortFieldToPostgresTypeMap[fieldType];
          const generationExpression = getGenerationExpression(fieldName, fieldType);
          columnDefinitions.push(
            `${escapeId(fieldName)} ${pgType} GENERATED ALWAYS AS (${generationExpression}) STORED`
          );
          indexes.push(
            `CREATE INDEX IF NOT EXISTS ${escapeId(`idx_${tableName}_${fieldName}`)} ON ${escapeId(tableName)}(${escapeId(fieldName)})`
          );
        }
      }
      const createTableQuery = `CREATE TABLE ${escapeId(tableName)} (${columnDefinitions.join(', ')})`;
      debug('Creating table:', createTableQuery);
      await client.query(createTableQuery);
      for (const indexQuery of indexes) {
        debug('Applying index:', indexQuery);
        await client.query(indexQuery);
      }
    } else {
      debug(`Table ${escapeId(tableName)} exists. Checking for column additions/removals.`);
      const expectedFields = entity.filterSortFields || {};
      const expectedFieldNames = new Set(Object.keys(expectedFields).filter(name => name !== 'id'));
      const existingGeneratedColumnNames = new Set(
        Object.entries(existingColumns)
              .filter(([name, def]) => name !== 'id' && name !== 'contents' && def.generation_expression)
              .map(([name]) => name)
      );

      // Columns to add
      const columnsToAdd: { name: string; type: FilterSortField }[] = [];
      for (const fieldName of expectedFieldNames) {
        if (!existingGeneratedColumnNames.has(fieldName)) {
          columnsToAdd.push({ name: fieldName, type: expectedFields[fieldName] });
        } else {
          // Optionally, check if existing column's type or generation expression matches.
          // For simplicity, as per request, we are focusing on add/remove.
          // If it exists, assume it's correct or handle complex migrations separately.
          const currentDef = existingColumns[fieldName];
          const expectedPgType = filterSortFieldToPostgresTypeMap[expectedFields[fieldName]];
          const expectedGenExpr = getGenerationExpression(fieldName, expectedFields[fieldName]);

          if (currentDef.type.toUpperCase() !== expectedPgType ||
              normalizeExpr(currentDef.generation_expression) !== normalizeExpr(expectedGenExpr)) {
            debug(`Column ${escapeId(fieldName)} exists but definition differs. Recreating.`);
            // Simplistic approach: drop and add. More sophisticated would be ALTER.
            // This path makes it similar to the original create/rename strategy for changes.
            // For now, just logging. A full diff and ALTER COLUMN would be more robust for actual changes.
            // To strictly follow "only additions or removals", we would not modify existing ones here.
            // However, if a definition *changes*, it's effectively a remove of old + add of new.
            // Sticking to add/remove: if it exists, we don't add. If its definition is "wrong", that's a harder problem.
            // For now, if it exists, we assume it's "good enough" if we only handle pure add/remove.
            // If a field *changes type* in definition, it's a new field from this perspective.
             debug(`Column ${escapeId(fieldName)} definition mismatch. Expected type ${expectedPgType} vs actual ${currentDef.type.toUpperCase()}. Expected expr ${normalizeExpr(expectedGenExpr)} vs actual ${normalizeExpr(currentDef.generation_expression)}. Manual intervention might be needed or a more complex migration strategy if this is frequent.`);
          }
        }
      }

      for (const { name, type } of columnsToAdd) {
        const pgType = filterSortFieldToPostgresTypeMap[type];
        const generationExpression = getGenerationExpression(name, type);
        const addColumnQuery = `ALTER TABLE ${escapeId(tableName)} ADD COLUMN ${escapeId(name)} ${pgType} GENERATED ALWAYS AS (${generationExpression}) STORED`;
        debug(`Adding column ${escapeId(name)}:`, addColumnQuery);
        await client.query(addColumnQuery);
        const indexQuery = `CREATE INDEX IF NOT EXISTS ${escapeId(`idx_${tableName}_${name}`)} ON ${escapeId(tableName)}(${escapeId(name)})`;
        debug('Applying index:', indexQuery);
        await client.query(indexQuery);
      }

      // Columns to remove
      const columnsToRemove: string[] = [];
      for (const columnName of existingGeneratedColumnNames) {
        if (!expectedFieldNames.has(columnName)) {
          // Before removing, ensure this column was indeed one managed by us (i.e., has a generation_expression)
          // This is already filtered by existingGeneratedColumnNames.
          columnsToRemove.push(columnName);
        }
      }

      for (const columnName of columnsToRemove) {
        // Check if it's a known supersave managed column (has generation expression)
        // This is implicitly handled if existingGeneratedColumnNames is built correctly
        if (existingColumns[columnName]?.generation_expression) {
            const dropColumnQuery = `ALTER TABLE ${escapeId(tableName)} DROP COLUMN ${escapeId(columnName)}`;
            debug(`Dropping column ${escapeId(columnName)}:`, dropColumnQuery);
            await client.query(dropColumnQuery); // Associated indexes are dropped automatically
        } else {
            debug(`Skipping drop of column ${escapeId(columnName)} as it does not appear to be a generated column managed by sync.`);
        }
      }
    }

    await client.query('COMMIT');
    debug(`Table ${escapeId(tableName)} synchronized successfully.`);
  } catch (error) {
    await client.query('ROLLBACK');
    debug(`Error during sync for table ${escapeId(tableName)}, rolled back.`, error);
    throw error;
  } finally {
    client.release();
    debug(`Released client for table ${escapeId(tableName)}`);
  }
};
