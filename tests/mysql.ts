import getConnection from './connection';
import mysql, { Connection } from 'mysql2/promise';

export const clear = async (): Promise<void> => {
  const connectionString = getConnection();

  if (connectionString.substring(0, 9) === 'sqlite://') {
    return;
  }

  const connection: Connection = await mysql.createConnection(connectionString);

  const tables: Record<string, any>[] = await getQuery(connection, 'SHOW TABLES');
  const promises: Promise<void>[] = [];
  Object.values(tables).forEach(async (tableRow) => {
    promises.push(executeQuery(connection, `DROP TABLE ${connection.escapeId(Object.values(tableRow)[0] as string)}`));
  });
  await Promise.all(promises);
  await connection.end();
};

async function executeQuery(
  connection: Connection,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<void> {
  await connection.query(query, values);
}

async function getQuery<T>(
  connection: Connection,
  query: string,
  values: (string | number | boolean | null)[] = []
): Promise<T[]> {
  const [results] = await connection.query(query, values);
  return results as unknown as T[];
}
