import { PoolConnection, Pool } from 'mysql';
import Debug, { Debugger } from 'debug';

const debug: Debugger = Debug('supersave:db:em:mysql');

export const getQuery = async <T>(
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = [],
): Promise<T[]> => new Promise((resolve, reject) => {
  debug('Fetching results for query.', query, values);

  connection.query(query, values, (err, results) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(results);
  });
});

export const executeQuery = async (
  connection: PoolConnection | Pool,
  query: string,
  values: (string | number | boolean | null)[] = [],
): Promise<void> => new Promise((resolve, reject) => {
  debug('Executing query', query);
  connection.query(query, values, (err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

export const getConnectionFromPool = async (pool: Pool): Promise<PoolConnection> => new Promise((resolve, reject) => {
  pool.getConnection((err, connection) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(connection);
  });
});
