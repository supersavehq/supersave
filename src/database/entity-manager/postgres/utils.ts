import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Pool, PoolClient, QueryResult } from 'pg';

const debug: Debugger = Debug('supersave:db:em:postgres');

export async function getQuery<T>(
  connection: PoolClient | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> {
  debug('Fetching results for query.', query, values);

  const results: QueryResult = await connection.query(query, values);
  return results.rows as T[];
}

export async function executeQuery(
  connection: PoolClient | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> {
  debug('Executing query', query, values);
  await connection.query(query, values);
}

export async function getConnectionFromPool(pool: Pool): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

// PostgreSQL uses $1, $2, etc. for placeholders, unlike MySQL's ?
// We need a way to escape identifiers (table/column names) correctly.
// The pg driver does not have a built-in function like mysql.escapeId.
// A simple and relatively safe way is to double-quote them.
// More robust solutions might involve a dedicated SQL query builder or a more comprehensive escaping function.
export function escapeId(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}
