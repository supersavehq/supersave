import mysql, { Pool } from 'mysql';

export type MysqlOptions = {
  connection: string,
};

export default async (connectionString: string): Promise<Pool> => mysql.createPool(connectionString);
