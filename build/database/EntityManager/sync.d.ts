import { Database } from 'sqlite';
import { EntityDefinition } from '../types';
import Repository from './Repository';
declare const _default: (entity: EntityDefinition, tableName: string, connection: Database, repository: Repository<any>, getRepository: (name: string, namespace?: string | undefined) => Repository<any>) => Promise<void>;
export default _default;
