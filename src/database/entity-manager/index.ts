import type { Debugger } from 'debug';
import Debug from 'debug';
import EntityManager from './entity-manager';
import type { MysqlOptions } from './mysql/connection';
import type { PostgresOptions } from './postgres/connection'; // Added for Postgres
import Query from './query';
import Repository from './repository';

const debug: Debugger = Debug('supersave:db:em');

export { Repository, Query, EntityManager };

export const MYSQL = 'mysql';
export const SQLITE = 'sqlite';
export const POSTGRES = 'postgres'; // Added for Postgres

type SqliteOptions = {
  file: string;
};

export default async (
  type: typeof MYSQL | typeof SQLITE | typeof POSTGRES, // Added POSTGRES
  options: SqliteOptions | MysqlOptions | PostgresOptions // Added PostgresOptions
): Promise<EntityManager> => {
  if (type === SQLITE) { // Used constant
    const { default: Sqlite } = await import('./sqlite');
    const { default: connection } = await import('./sqlite/connection');
    debug('Setting up connection for sqlite', options);
    const conn = await connection((options as SqliteOptions).file);
    return new Sqlite(conn);
  }
  if (type === MYSQL) { // Used constant
    const { default: Mysql } = await import('./mysql');
    const { default: pool } = await import('./mysql/connection');
    debug('Setting up connection for mysql.');
    const conn = await pool((options as MysqlOptions).connection);
    return new Mysql(conn);
  }
  if (type === POSTGRES) { // Added Postgres case
    const { default: Postgres } = await import('./postgres');
    const { default: pool } = await import('./postgres/connection');
    debug('Setting up connection for postgres.');
    const conn = await pool((options as PostgresOptions).connection);
    return new Postgres(conn);
  }

  throw new Error(`Unrecognized db type ${type}.`);
};
