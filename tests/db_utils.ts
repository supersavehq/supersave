import mysql, { Connection as MySqlConnection } from 'mysql2/promise';
import pg, { PoolClient as PgPoolClient, Pool as PgPool } from 'pg';
import getConnection from './connection'; // Assuming this will give the full connection string

// Helper to identify DB type from connection string
const getDbType = (connectionString: string): 'mysql' | 'postgres' | 'sqlite' | 'unknown' => {
  if (connectionString.startsWith('mysql://')) return 'mysql';
  if (connectionString.startsWith('postgres://') || connectionString.startsWith('postgresql://')) return 'postgres';
  if (connectionString.startsWith('sqlite://')) return 'sqlite';
  return 'unknown';
};

// Generic query execution (for internal use in clear function)
async function executeDbQuery(
  client: MySqlConnection | PgPoolClient,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> {
  if ((client as MySqlConnection).query) { // Check if it's a MySQL connection
    await (client as MySqlConnection).query(query, values);
  } else if ((client as PgPoolClient).query) { // Check if it's a PostgreSQL client
    await (client as PgPoolClient).query(query, values);
  } else {
    throw new Error('Unsupported database client for executeDbQuery');
  }
}

// Generic row fetching (for internal use in clear function)
async function getDbQueryResults<T>(
  client: MySqlConnection | PgPoolClient,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> {
  if ((client as MySqlConnection).query) { // MySQL
    const [results] = await (client as MySqlConnection).query(query, values);
    return results as unknown as T[];
  } else if ((client as PgPoolClient).query) { // PostgreSQL
    const { rows } = await (client as PgPoolClient).query(query, values);
    return rows as T[];
  } else {
    throw new Error('Unsupported database client for getDbQueryResults');
  }
}


export const clear = async (): Promise<void> => {
  const connectionString = getConnection(); // From tests/connection.ts
  const dbType = getDbType(connectionString);

  if (dbType === 'sqlite') {
    // SQLite in-memory is cleared on disconnect/reconnect, or file can be deleted if file-based.
    // For :memory:, typically no explicit DROP TABLES is needed as it's fresh.
    console.log('SQLite in-memory, skipping explicit clear.');
    return;
  }

  if (dbType === 'mysql') {
    let connection: MySqlConnection | null = null;
    try {
      connection = await mysql.createConnection(connectionString);
      const tables = await getDbQueryResults<{ [key: string]: string }>(connection, 'SHOW TABLES');
      const tables = await getDbQueryResults<{ [key: string]: string }>(connection, 'SHOW TABLES');
      const dropPromises: Promise<void>[] = tables.map(tableRow => {
        // SHOW TABLES returns different column names depending on MySQL version
        // Common names: 'Tables_in_<database>', 'Table_name', etc.
        const tableName = Object.values(tableRow)[0] as string;
        if (!tableName) {
          throw new Error('Unable to extract table name from SHOW TABLES result');
        }
        // MySQL escapeId is available on the connection object itself.
        return executeDbQuery(connection!, `DROP TABLE IF EXISTS ${connection!.escapeId(tableName)}`);
      });
      await Promise.all(dropPromises);
    } catch (error) {
      console.error('Error clearing MySQL database:', error);
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  } else if (dbType === 'postgres') {
    const pool = new PgPool({ connectionString });
    let client: PgPoolClient | null = null;
    try {
      client = await pool.connect();
      // Query to get all user-defined tables in the current schema (public by default)
      const query = `
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = current_schema()
          AND tableowner = current_user;
      `;
      const tables = await getDbQueryResults<{ tablename: string }>(client, query);
      if (tables.length > 0) {
        // PostgreSQL uses double quotes for identifiers. A generic escapeId is harder.
        // For DROP TABLE, it's usually safe to just use the name if it's from pg_tables.
        // Using CASCADE to handle foreign key dependencies automatically.
        const dropQuery = tables.map(row => `"${row.tablename}"`).join(', ');
        await executeDbQuery(client, `DROP TABLE IF EXISTS ${dropQuery} CASCADE`);
      }
    } catch (error) {
      console.error('Error clearing PostgreSQL database:', error);
      throw error;
    } finally {
      if (client) client.release();
      await pool.end();
    }
  } else {
    console.warn(`Unsupported database type for clear: ${dbType}`);
  }
};
