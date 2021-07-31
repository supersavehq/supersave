import getConnection from './connection';
import mysql, { Connection } from 'mysql';

export const clear = async (): Promise<void> => {
  const connectionString = getConnection();

  if (connectionString.substring(0, 9) === 'sqlite://') {
    return;
  }

  const connection: Connection = mysql.createConnection(connectionString);

  const tables: Record<string, any>[] = await getQuery(connection, 'SHOW TABLES');
  const promises: Promise<void>[] = [];
  Object.values(tables).forEach(async (tableRow) => {
    promises.push(
      executeQuery(connection, `DROP TABLE ${connection.escapeId(Object.values(tableRow)[0] as string)}`)
    );
  });
  await Promise.all(promises);
  connection.end();
};


const executeQuery = async (
  connection: Connection,
  query: string,
  values: (string|number|boolean|null)[] = [],
): Promise<void> => new Promise((resolve, reject) => {
  connection.query(query, values, (err) => {
    if (err) {
      reject(err);
      return;
    }
    resolve();
  });
});

const getQuery = async <T>(
  connection: Connection,
  query: string,
  values: (string|number|boolean|null)[] = [],
): Promise<T[]> => new Promise((resolve, reject) => {
  connection.query(query, values, (err, results) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(results);
  });
});
