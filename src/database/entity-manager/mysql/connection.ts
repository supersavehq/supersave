import mysql, { Pool } from 'mysql2/promise';

export type MysqlOptions = {
  connection: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async (connectionString: string): Promise<Pool> => mysql.createPool(connectionString);
