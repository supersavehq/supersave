import slug from 'slug';
import { Database } from 'sqlite';
import Repository from './Repository';
import { BaseEntity, EntityDefinition } from '../types';

class EntityManager {
  private repositories = new Map<string, Repository<any>>();

  constructor(readonly connection: Database) { }

  public async addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    const fullEntityName = this.getFullEntityName(entity.name, entity.namespace);
    const tableName = slug(fullEntityName);
    await this.createTable(tableName);
    this.repositories.set(
      fullEntityName,
      new Repository(
        entity,
        tableName,
        (name: string, namespace?: string) => this.getRepository(name, namespace),
        this.connection
      )
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

  private async createTable(tableName: string) {
    await this.connection.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents BLOG NOT NULL)`);
  }
}

export default EntityManager;
