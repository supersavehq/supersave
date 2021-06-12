import Debug, { Debugger } from 'debug';
import dbInitializer, { EntityManager } from './entity-manager';

const debug: Debugger = Debug('supersave:db');

export default async (connection: string): Promise<EntityManager> => {
  debug('Got connection string', connection);

  if (connection.substring(0, 9) === 'sqlite://') {
    const file: string = connection.substring(9);
    debug('Found sqlite connection string, using file', file);
    return dbInitializer('sqlite', { file });
  }

  throw new Error('Unrecognized connection string.');
};
