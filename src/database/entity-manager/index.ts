import Debug, { Debugger } from 'debug';
import EntityManager from './entity-manager';
import { MysqlOptions } from './mysql/connection';
import Query from './query';
import Repository from './repository';

const debug: Debugger = Debug('supersave:db:em');

export { Repository, Query, EntityManager };

export const MYSQL = 'mysql';
export const SQLITE = 'sqlite';

type SqliteOptions = {
  file: string;
};

export default async (
  type: typeof MYSQL | typeof SQLITE,
  options: SqliteOptions | MysqlOptions
): Promise<EntityManager> => {
  if (type === 'sqlite') {
    const { default: Sqlite } = await import('./sqlite');
    const { default: connection } = await import('./sqlite/connection');
    debug('Setting up connection for', options);
    const conn = await connection((options as SqliteOptions).file);
    return new Sqlite(conn);
  }
  if (type === 'mysql') {
    const { default: Mysql } = await import('./mysql');
    const { default: pool } = await import('./mysql/connection');
    debug('Setting up connection for mysql.');
    const conn = await pool((options as MysqlOptions).connection);
    return new Mysql(conn);
  }

  throw new Error(`Unrecognized db type ${type}.`);
};
