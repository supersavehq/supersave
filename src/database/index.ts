import Debug, { Debugger } from 'debug';
import connection from './connection';
import EntityManager from './EntityManager';

const debug: Debugger = Debug('supersave:db');

export default async (file: string): Promise<EntityManager> => {
  debug('Setting up connection for', file);
  const conn = await connection(file);
  return new EntityManager(conn);
};
