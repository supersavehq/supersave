import { Pool } from 'pg';

export type PostgresOptions = {
  connection: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
export default async (connectionString: string): Promise<Pool> => new Pool({ connectionString });
