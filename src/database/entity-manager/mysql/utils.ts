import Debug, { Debugger } from 'debug';
import { Pool, PoolConnection } from 'mysql';

const debug: Debugger = Debug('supersave:db:em:mysql');

export const getQuery = async <T>(
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> =>
  new Promise((resolve, reject) => {
    debug('Fetching results for query.', query, values);

    connection.query(query, values, (error, results) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(results);
    });
  });

export const executeQuery = async (
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> =>
  new Promise((resolve, reject) => {
    debug('Executing query', query);
    connection.query(query, values, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

export const getConnectionFromPool = async (pool: Pool): Promise<PoolConnection> =>
  new Promise((resolve, reject) => {
    pool.getConnection((error, connection) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(connection);
    });
  });
