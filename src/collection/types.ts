import { Repository } from '../database/entity-manager';
import { FilterSortField, Relation } from '../database/types';

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
  template: any,
  relations: Relation[],
  filterSortFields?: Record<string, FilterSortField>,
  additionalProperties?: Record<string, any>
};

export interface ManagedCollection<T = any> extends Collection {
  repository: Repository<T>
}
