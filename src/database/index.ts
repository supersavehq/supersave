import type { Debugger } from 'debug';
import Debug from 'debug';
import type { EntityManager } from './entity-manager';
import databaseInitializer from './entity-manager';

const debug: Debugger = Debug('supersave:db');

export default async (connection: string): Promise<EntityManager> => {
  debug('Got connection string', connection);

  if (connection.slice(0, 9) === 'sqlite://') {
    const file: string = connection.slice(9);
    debug('Found sqlite connection string, using file', file);
    return databaseInitializer('sqlite', { file });
  }

  if (connection.slice(0, 8) === 'mysql://') {
    return databaseInitializer('mysql', { connection });
  }

  throw new Error('Unrecognized connection string.');
};
