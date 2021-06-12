import Debug, { Debugger } from 'debug';
import EntityManager from './entity-manager';
import Repository from './repository';
import Query from './query';

const debug: Debugger = Debug('supersave:db:em');

export {
  Repository,
  Query,
  EntityManager,
};

type SqliteOptions = {
  file: string,
};

export default async (type: 'sqlite', options: SqliteOptions): Promise<EntityManager> => {
  if (type === 'sqlite') {
    const { default: Sqlite } = await import('./sqlite');
    const { default: connection } = await import('./sqlite/connection');
    debug('Setting up connection for', options);
    const conn = await connection(options.file);
    return new Sqlite(conn);
  }

  throw new Error(`Unrecognized db type ${type}.`);
};
