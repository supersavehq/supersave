import slug from 'slug';
import { Database } from 'sqlite';
import Repository from './Repository';
import Query from './Query';
import { BaseEntity, EntityDefinition } from '../types';
import sync from './sync';

export {
  Repository,
  Query,
};

class EntityManager {
  private repositories = new Map<string, Repository<any>>();

  constructor(readonly connection: Database) { }

  public async addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    const fullEntityName = this.getFullEntityName(entity.name, entity.namespace);
    const tableName = slug(fullEntityName);
    await this.createTable(tableName);

    const repository: Repository<T> = new Repository(
      entity,
      tableName,
      (name: string, namespace?: string) => this.getRepository(name, namespace),
      this.connection,
    );
    await sync(
      entity,
      tableName,
      this.connection,
      repository,
      (name: string, namespace?: string) => this.getRepository(name, namespace),
    );

    this.repositories.set(
      fullEntityName,
      repository,
    );
    return this.getRepository(entity.name, entity.namespace);
  }

  private getFullEntityName(name: string, namespace?: string): string {
    return typeof namespace !== 'undefined' ? `${namespace}_${name}` : name;
  }

  public getRepository<T extends BaseEntity>(name: string, namespace?: string): Repository<T> {
    const fullEntityName = this.getFullEntityName(name, namespace);
    const repository = this.repositories.get(fullEntityName);
    if (typeof repository === 'undefined') {
      throw new Error(`Entity ${fullEntityName} not defined. Existing are: (${Array.from(this.repositories.keys()).join(', ')})`);
    }
    return repository;
  }

  private async createTable(tableName: string): Promise<void> {
    await this.connection.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents TEXT NOT NULL)`);
  }
}

export default EntityManager;
