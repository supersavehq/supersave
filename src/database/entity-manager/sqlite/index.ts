import Debug, { Debugger } from 'debug';
import slug from 'slug';
import { Database } from 'sqlite';
import Repository from './repository';
import sync from './sync';
import { EntityDefinition } from '../../types';
import EntityManager from '../entity-manager';
import BaseRepository from '../repository';

const debug: Debugger = Debug('supersave:db:em:sqlite');

class SqliteEntityManager extends EntityManager {
  constructor(readonly connection: Database) {
    super();
  }

  public async addEntity<T>(entity: EntityDefinition): Promise<BaseRepository<T>> {
    const { filterSortFields = {} } = entity;
    filterSortFields.id = 'string';

    const updatedEntity: EntityDefinition = {
      ...entity,
      filterSortFields,
    };

    const fullEntityName = this.getFullEntityName(entity.name, entity.namespace);
    const tableName = slug(fullEntityName).replace(/-/g, '_'); // sqlite does not allow - (dash) in table names.
    await this.createTable(tableName);

    const repository: Repository<T> = new Repository(
      updatedEntity,
      tableName,
      (name: string, namespace?: string) => this.getRepository(name, namespace),
      this.connection
    );
    await sync(updatedEntity, tableName, this.connection, repository, (name: string, namespace?: string) =>
      this.getRepository(name, namespace)
    );

    this.repositories.set(fullEntityName, repository);
    return this.getRepository(entity.name, entity.namespace);
  }

  protected async createTable(tableName: string): Promise<void> {
    debug(`Creating table ${tableName}.`);
    await this.connection.exec(
      `CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents TEXT NOT NULL)`
    );
  }

  public async close(): Promise<void> {
    return this.connection.close();
  }

  public getConnection(): Database {
    return this.connection;
  }
}

export default SqliteEntityManager;
