import Debug, { Debugger } from 'debug';
import { Pool } from 'mysql2/promise';
import slug from 'slug';
import Repository from './repository';
import sync from './sync';
import { executeQuery } from './utils';
import { BaseEntity, EntityDefinition } from '../../types';
import EntityManager from '../entity-manager';
import BaseRepository from '../repository';

const debug: Debugger = Debug('supersave:db:em:mysql');

class MysqlEntityManager extends EntityManager {
  constructor(protected readonly pool: Pool) {
    super();
  }

  public async addEntity<T extends BaseEntity>(entity: EntityDefinition): Promise<BaseRepository<T>> {
    const { filterSortFields = {} } = entity;
    filterSortFields.id = 'string';

    const updatedEntity: EntityDefinition = {
      ...entity,
      filterSortFields,
    };

    const fullEntityName = this.getFullEntityName(entity.name, entity.namespace);
    const tableName = slug(fullEntityName).replace(/-/g, '_'); // mysql does not allow - (dash) in table names.;
    await this.createTable(tableName);

    const repository: Repository<T> = new Repository(
      updatedEntity,
      tableName,
      (name: string, namespace?: string) => this.getRepository(name, namespace),
      this.pool
    );
    await sync(updatedEntity, tableName, this.pool, repository, (name: string, namespace?: string) =>
      this.getRepository(name, namespace)
    );

    this.repositories.set(fullEntityName, repository);
    return this.getRepository(entity.name, entity.namespace);
  }

  protected async createTable(tableName: string): Promise<void> {
    debug(`Creating table ${tableName}.`);

    return executeQuery(
      this.pool,
      `CREATE TABLE IF NOT EXISTS ${tableName} (id VARCHAR(32) PRIMARY KEY, contents TEXT NOT NULL)`
    );
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public getConnection(): Pool {
    return this.pool;
  }
}

export default MysqlEntityManager;
