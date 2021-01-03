import { Repository } from '../database/EntityManager';
import { EntityDefinition } from '../database/types';

export type HttpCollection = {
  name: string,
  description?: string,
  endpoint: string,
  [key: string]: any,
};

export type Collection = {
  name: string,
  description?: string,
  namespace?: string,
  entity: EntityDefinition,
  additionalProperties?: Record<string, any>
};

export interface ManagedCollection<T = any> extends Collection {
  repository: Repository<T>
}
