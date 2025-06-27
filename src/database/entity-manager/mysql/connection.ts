import type { Pool } from "mysql2/promise";
import mysql from "mysql2/promise";

export type MysqlOptions = {
  connection: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async (connectionString: string): Promise<Pool> =>
  mysql.createPool(connectionString);
