import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Pool, PoolClient } from 'pg';
import type { EntityDefinition, FilterSortField } from '../../types';
import type BaseRepository from '../repository';
import { escapeId } from './utils';
import type PostgresRepository from './repository'; // Assuming this is the correct name for your pg repo
import { isEqual } from '../utils';

const debug: Debugger = Debug('supersave:db:postgres:sync');

const enum PostgresType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  JSONB = 'JSONB',
  VARCHAR32 = 'VARCHAR(32)', // For ID
}

// Mapping from your abstract FilterSortField types to PostgreSQL types
const filterSortFieldToPostgresTypeMap: Record<FilterSortField, PostgresType> = {
  string: PostgresType.TEXT,
  number: PostgresType.INTEGER,
  boolean: PostgresType.BOOLEAN,
};

type PostgresColumnInfo = {
  column_name: string;
  data_type: string; // e.g., 'integer', 'text', 'boolean', 'jsonb'
  is_nullable: 'YES' | 'NO';
  column_default: string | null; // e.g., 'uuid_generate_v4()' or a literal
  // generation_expression: string | null; // For generated columns
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
  const result = await connection.query<PostgresColumnInfo>(query, [tableName]);
  if (!result.rows || result.rows.length === 0) {
    // Table might not exist yet, which is fine.
    return {};
  }

  const columns: Record<string, { type: string; generation_expression?: string }> = {};
  result.rows.forEach((row) => {
    columns[row.column_name] = {
      type: row.data_type.toUpperCase(), // Normalize to uppercase for easier comparison
      generation_expression: row.generation_expression || undefined,
    };
  });
  return columns;
}

// Helper to construct the generation expression for a column
function getGenerationExpression(fieldName: string, type: FilterSortField): string {
  const pgType = filterSortFieldToPostgresTypeMap[type];
  // Ensure fieldName is safe for inclusion in a query string if it's dynamic,
  // though here it comes from entityDefinition so it should be controlled.
  // Example: contents->>'${fieldName}' or (contents->>'${fieldName}')::integer
  // The exact casting depends on how you store data in JSONB and want to query it.
  switch (pgType) {
    case PostgresType.TEXT:
      return `(contents->>'${fieldName}')`;
    case PostgresType.INTEGER:
      return `((contents->>'${fieldName}')::integer)`;
    case PostgresType.BOOLEAN:
      return `((contents->>'${fieldName}')::boolean)`;
    default:
      throw new Error(`Unsupported type for generated column: ${type}`);
  }
}

function hasTableChanged(
  existingColumns: Record<string, { type: string; generation_expression?: string }>,
  entityDefinition: EntityDefinition
): boolean {
  if (!entityDefinition.filterSortFields) {
    // If no filter/sort fields, only id and contents are expected.
    // This case might need more specific checks if the base structure can vary.
    return !(existingColumns.id && existingColumns.contents && Object.keys(existingColumns).length === 2);
  }

  // Check for id and contents columns
  if (!existingColumns.id || existingColumns.id.type !== PostgresType.VARCHAR32 || existingColumns.id.generation_expression) {
    debug('ID column mismatch');
    return true;
  }
  if (!existingColumns.contents || existingColumns.contents.type !== PostgresType.JSONB || existingColumns.contents.generation_expression) {
    debug('Contents column mismatch');
    return true;
  }

  const expectedGeneratedColumns: Record<string, { type: PostgresType; expression: string }> = {};
  for (const [fieldName, fieldType] of Object.entries(entityDefinition.filterSortFields)) {
    if (fieldName === 'id') continue; // ID is a primary key, not generated in this manner.
    expectedGeneratedColumns[fieldName] = {
      type: filterSortFieldToPostgresTypeMap[fieldType],
      expression: getGenerationExpression(fieldName, fieldType),
    };
  }

  // Check existing generated columns
  for (const [fieldName, fieldDef] of Object.entries(entityDefinition.filterSortFields)) {
    if (fieldName === 'id') continue;

    const existingColumn = existingColumns[fieldName];
    const expectedColumn = expectedGeneratedColumns[fieldName];

    if (!existingColumn) {
      debug(`Missing generated column: ${fieldName}`);
      return true; // Column is missing
    }
    if (existingColumn.type.toUpperCase() !== expectedColumn.type.toUpperCase()) {
      debug(`Type mismatch for ${fieldName}: expected ${expectedColumn.type}, got ${existingColumn.type}`);
      return true; // Type mismatch
    }
    // Normalize and compare generation expressions
    // This can be tricky due to potential variations in how PostgreSQL stores/reports these.
    // A more robust comparison might involve parsing or canonicalizing the expression.
    const normalizeExpr = (expr?: string) => expr?.replace(/\s+/g, '').toLowerCase();
    if (normalizeExpr(existingColumn.generation_expression) !== normalizeExpr(expectedColumn.expression)) {
      debug(`Generation expression mismatch for ${fieldName}:
        Expected: ${expectedColumn.expression} (normalized: ${normalizeExpr(expectedColumn.expression)})
        Got: ${existingColumn.generation_expression} (normalized: ${normalizeExpr(existingColumn.generation_expression)})`);
      return true; // Expression mismatch
    }
  }

  // Check if there are any extra columns in the DB not defined in the entity (excluding id, contents)
  const expectedFieldNames = new Set(['id', 'contents', ...Object.keys(entityDefinition.filterSortFields)]);
  for (const columnName in existingColumns) {
    if (!expectedFieldNames.has(columnName)) {
      debug(`Extra column found in DB: ${columnName}`);
      return true;
    }
  }

  // Check if any defined fields are missing (already covered by loop above, but good for clarity)
  for (const fieldName in expectedGeneratedColumns) {
    if (!existingColumns[fieldName]) {
        debug(`Defined field ${fieldName} is missing from DB columns.`);
        return true;
    }
  }


  return false; // No significant changes detected
}


export default async (
  entity: EntityDefinition,
  tableName: string,
  pool: Pool, // pg.Pool
  repository: PostgresRepository<any>, // Use the specific PostgreSQL repository
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getRepository: (name: string, namespace?: string) => BaseRepository<any>
): Promise<void> => {
  const client = await pool.connect();
  try {
    const existingColumns = await getTableColumns(client, tableName);

    if (Object.keys(existingColumns).length > 0 && !hasTableChanged(existingColumns, entity)) {
      debug(`Table ${tableName} schema is up to date.`);
      return;
    }

    debug(`Table ${tableName} schema needs update or creation.`);
    // Begin transaction
    await client.query('BEGIN');

    const tempTableName = `${tableName}_supersave_temp`;
    await client.query(`DROP TABLE IF EXISTS ${escapeId(tempTableName)}`);

    // Define base columns: id and contents
    const columnDefinitions: string[] = [
      `${escapeId('id')} ${PostgresType.VARCHAR32} PRIMARY KEY`,
      `${escapeId('contents')} ${PostgresType.JSONB} NOT NULL`,
    ];
    const indexes: string[] = []; // For actual indexes on generated columns

    // Add generated columns for filterSortFields
    if (entity.filterSortFields) {
      for (const [fieldName, fieldType] of Object.entries(entity.filterSortFields)) {
        if (fieldName === 'id') continue; // ID is already defined as primary key

        const pgType = filterSortFieldToPostgresTypeMap[fieldType];
        const generationExpression = getGenerationExpression(fieldName, fieldType);
        columnDefinitions.push(
          `${escapeId(fieldName)} ${pgType} GENERATED ALWAYS AS (${generationExpression}) STORED`
        );
        // Add index for the generated column
        indexes.push(
          `CREATE INDEX IF NOT EXISTS ${escapeId(`idx_${tableName}_${fieldName}`)} ON ${escapeId(tempTableName)}(${escapeId(fieldName)})`
        );
      }
    }

    const createTableQuery = `CREATE TABLE ${escapeId(tempTableName)} (${columnDefinitions.join(', ')})`;
    debug('Creating temp table:', createTableQuery);
    await client.query(createTableQuery);

    // Apply indexes to the temp table
    for (const indexQuery of indexes) {
      debug('Applying index:', indexQuery);
      await client.query(indexQuery);
    }

    let dataCopied = false;
    if (Object.keys(existingColumns).length > 0) {
        debug(`Copying data from ${escapeId(tableName)} to ${escapeId(tempTableName)}`);
        // Only copy id and contents. Generated columns will be populated automatically.
        // Make sure 'repository' can fetch all data, possibly without relying on generated columns if old table didn't have them
        // This might require a temporary, simpler repository or a special method if the main one heavily relies on current schema.
        // For now, assume repository.getAll() fetches raw 'id' and 'contents' if possible, or adapt.
        // A safer bet: query directly for id, contents if repository methods are too complex/schema-dependent.
        const oldData = await client.query(`SELECT id, contents FROM ${escapeId(tableName)}`);
        if (oldData.rows.length > 0) {
            // Construct multi-row insert for efficiency
            const insertPromises = oldData.rows.map(row => {
                 const insertQuery = `INSERT INTO ${escapeId(tempTableName)} (id, contents) VALUES ($1, $2)`;
                 return client.query(insertQuery, [row.id, row.contents]);
            });
            await Promise.all(insertPromises);
            debug(`Copied ${oldData.rows.length} rows.`);
            dataCopied = true;
        } else {
            debug('No data to copy.');
        }
    }


    // Rename tables
    if (Object.keys(existingColumns).length > 0) {
      await client.query(`DROP TABLE ${escapeId(tableName)}`);
      debug(`Dropped old table ${escapeId(tableName)}`);
    }
    await client.query(`ALTER TABLE ${escapeId(tempTableName)} RENAME TO ${escapeId(tableName)}`);
    debug(`Renamed ${escapeId(tempTableName)} to ${escapeId(tableName)}`);

    // Commit transaction
    await client.query('COMMIT');
    debug(`Table ${tableName} synchronized successfully.`);
  } catch (error) {
    await client.query('ROLLBACK');
    debug(`Error during sync for table ${tableName}, rolled back.`, error);
    throw error; // Re-throw error to be handled by caller
  } finally {
    client.release();
  }
};
