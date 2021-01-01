import { Database } from 'sqlite';
import shortUuid from 'short-uuid';
import EntityManager from './index';
import {
  BaseEntity, EntityDefinition, EntityRow, Relation,
} from '../types';

class Repository<T extends BaseEntity> {
  constructor(
    readonly definition: EntityDefinition,
    readonly tableName: string,
    readonly em: EntityManager,
    readonly connection: Database,
  ) { }

  public async getById(id: string): Promise<T | null> {
    return this.queryById(id);
  }

  public async getByIds(ids: string[]): Promise<T[]> {
    const wherePlaceholders: string[] = [];
    const whereValues: { [key: string]: string } = {};

    ids.forEach((value, idx) => {
      const key = `:p${idx}`;
      wherePlaceholders.push(key);
      whereValues[key] = value;
    });

    const query = `SELECT * FROM ${this.tableName} WHERE id IN(${wherePlaceholders.join(',')})`;
    const result = await this.connection.all(query, whereValues);
    if (result) {
      const promises = [];
      for (let iter = 0; iter < result.length; iter += 1) {
        const promise = this.transformQueryResultRow(result[iter]);
        promises.push(promise);
        result[iter] = await promise;
      }
      await Promise.all(promises);
      return result;
    }
    return [];
  }

  public async getAll(): Promise<T[]> {
    const query = `SELECT * FROM ${this.tableName}`;
    const result = await this.connection.all(query);
    if (result) {
      const promises = [];
      for (let iter = 0; iter < result.length; iter += 1) {
        const promise = this.transformQueryResultRow(result[iter]);
        promises.push(promise);
        result[iter] = await promise;
      }
      await Promise.all(promises);
      return result;
    }
    return [];
  }

  public async deleteUsingId(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = :id`;
    await this.connection.run(query, { ':id': id });
  }

  public async create(obj: T): Promise<T> {
    const query = `INSERT INTO ${this.tableName} (id, contents) VALUES(:uuid, :contents)`;
    const uuid = shortUuid.generate();
    await this.connection.run(
      query,
      {
        ':uuid': uuid,
        ':contents': JSON.stringify({
          ...this.definition.template,
          id: uuid,
          ...this.simplifyRelations(obj),
        }),
      },
    );

    return (this.getById(uuid) as unknown as T);
  }

  public async update(obj: T): Promise<T> {
    const query = `UPDATE ${this.tableName} SET contents = :contents WHERE id = :id`;
    await this.connection.run(
      query,
      {
        ':id': obj.id || '',
        ':contents': JSON.stringify(this.simplifyRelations(obj)),
      },
    );
    return obj;
  }

  private async queryById(id: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = :id`;
    const result = await this.connection.get(query, { ':id': id });
    if (result) {
      return this.transformQueryResultRow(result);
    }
    return null;
  }

  private async transformQueryResultRow(row: EntityRow): Promise<T | null> {
    return ({
      ...this.definition.template,
      ...await this.fillInRelations(JSON.parse(row.contents)),
    } as unknown as T);
  }

  private async fillInRelations(entity: T): Promise<T> {
    if (this.definition.relations.length === 0) {
      return entity;
    }

    const clone = JSON.parse(JSON.stringify(entity)); // TODO replace with clone function

    const promises: Promise<any>[] = [];
    this.definition.relations.forEach(async (relation: Relation) => {
      const repository = this.em.getRepository(relation.entity, relation.namespace);

      if (relation.multiple !== true) {
        const id = clone[relation.field];
        if (typeof id === 'string') {
          const promise = repository.getById(id);
          promises.push(promise);
          const relatedEntity = await promise;
          if (!relatedEntity) {
            throw new Error(`Unable to find related entity ${relation.entity} with id ${entity[relation.field]}`);
          }
          clone[relation.field] = relatedEntity;
        }
      } else {
        const promise = this.mapRelationToMultiple(relation, clone[relation.field]);
        promises.push(promise);
        const mappedEntities = await promise;
        clone[relation.field] = mappedEntities;
      }
    });
    await Promise.all(promises);
    return clone;
  }

  private async mapRelationToMultiple(relation: Relation, arr: string[]): Promise<BaseEntity[]> {
    const repository = this.em.getRepository(relation.entity, relation.namespace);
    return repository.getByIds(arr);
  }

  private simplifyRelations(entity: any) {
    if (this.definition.relations.length === 0) {
      return entity;
    }

    const clone = { ...entity };
    this.definition.relations.forEach((relation: Relation) => {
      if (!clone[relation.field]) {
        return;
      }
      if (relation.multiple === true) {
        clone[relation.field] = entity[relation.field].map(
          (relationEntity: BaseEntity) => relationEntity.id,
        );
      } else {
        clone[relation.field] = entity[relation.field].id;
      }
    });
    return clone;
  }
}

export default Repository;
