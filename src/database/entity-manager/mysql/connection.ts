import mysql, { Connection } from 'mysql';

export type MysqlOptions = {
  connection: string,
};

export default async (connectionString: string): Promise<Connection> => {
  const connection = mysql.createConnection(connectionString);

  return new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(connection);
    });
  });
};
