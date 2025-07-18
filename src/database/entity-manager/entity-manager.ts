import type { BaseEntity, EntityDefinition } from '../types';
import Query from './query';
import Repository from './repository';

export { Repository, Query };

abstract class EntityManager {
  protected repositories = new Map<string, Repository<any>>();

  public abstract addEntity<T extends BaseEntity>(
    entity: EntityDefinition
  ): Promise<Repository<T>>;

  protected getFullEntityName(name: string, namespace?: string): string {
    return typeof namespace !== 'undefined' ? `${namespace}_${name}` : name;
  }

  public getRepository<T extends BaseEntity>(
    name: string,
    namespace?: string
  ): Repository<T> {
    const fullEntityName = this.getFullEntityName(name, namespace);
    const repository = this.repositories.get(fullEntityName);
    if (typeof repository === 'undefined') {
      throw new TypeError(
        `Entity ${fullEntityName} not defined. Existing are: (${[...this.repositories.keys()].join(', ')})`
      );
    }
    return repository as Repository<T>;
  }

  protected abstract createTable(tableName: string): Promise<void>;

  public abstract close(): Promise<void>;

  public abstract getConnection(): any;
}

export default EntityManager;
