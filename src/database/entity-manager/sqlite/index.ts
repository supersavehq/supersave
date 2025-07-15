import type { Database } from 'better-sqlite3';
import type { Debugger } from 'debug';
import Debug from 'debug';
import slug from 'slug';
import type { BaseEntity, EntityDefinition } from '../../types';
import EntityManager from '../entity-manager';
import type BaseRepository from '../repository';
import Repository from './repository';
import sync from './sync';

const debug: Debugger = Debug('supersave:db:em:sqlite');

class SqliteEntityManager extends EntityManager {
  constructor(private readonly connection: Database) {
    super();
  }

  public async addEntity<T extends BaseEntity>(
    entity: EntityDefinition
  ): Promise<BaseRepository<T>> {
    const { filterSortFields = {} } = entity;
    filterSortFields.id = 'string';

    const updatedEntity: EntityDefinition = {
      ...entity,
      filterSortFields,
    };

    const fullEntityName = this.getFullEntityName(
      entity.name,
      entity.namespace
    );
    const tableName = slug(fullEntityName).replace(/-/g, '_'); // sqlite does not allow - (dash) in table names.
    this.createTable(tableName);

    const repository: Repository<T> = new Repository(
      updatedEntity,
      tableName,
      (name: string, namespace?: string) => this.getRepository(name, namespace),
      this.connection
    );
    await sync(
      updatedEntity,
      tableName,
      this.connection,
      repository,
      (name: string, namespace?: string) => this.getRepository(name, namespace)
    );

    this.repositories.set(fullEntityName, repository);
    return this.getRepository(entity.name, entity.namespace);
  }

  protected createTable(tableName: string): Promise<void> {
    debug(`Creating table ${tableName}.`);
    this.connection.exec(
      `CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents TEXT NOT NULL)`
    );
    return Promise.resolve();
  }

  public close(): Promise<void> {
    this.connection.close();
    return Promise.resolve();
  }

  public getConnection(): Database {
    return this.connection;
  }
}

export default SqliteEntityManager;
