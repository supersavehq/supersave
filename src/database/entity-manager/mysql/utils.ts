import Debug, { Debugger } from 'debug';
import { Pool, PoolConnection } from 'mysql2/promise';

const debug: Debugger = Debug('supersave:db:em:mysql');

export async function getQuery<T>(
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> {
  debug('Fetching results for query.', query, values);

  const [results] = await connection.query(query, values);
  return results as unknown as T[];
}

export async function executeQuery(
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> {
  debug('Executing query', query);
  await connection.query(query, values);
}

export async function getConnectionFromPool(pool: Pool): Promise<PoolConnection> {
  return await pool.getConnection();
}
