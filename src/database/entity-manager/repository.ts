import {
  BaseEntity, EntityDefinition, EntityRow, Relation,
} from '../types';
import Query from './query';

export default abstract class Repository<T> {
  protected relationFields: string[];

  constructor(
    readonly definition: EntityDefinition,
    readonly tableName: string,
    readonly getRepository: (name: string, namespace?: string) => Repository<any>,
  ) {
    this.relationFields = definition.relations?.map((relation: Relation) => relation.field);
  }

  public async getById(id: string): Promise<T | null> {
    return this.queryById(id);
  }

  public async getOneByQuery(query: Query): Promise<T|null> {
    const result: T[] = await this.getByQuery(query);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }

  protected async transformQueryResultRows(rows: EntityRow[]): Promise<T[]> {
    const result: T[] = [];

    const promises = [];
    for (let iter = 0; iter < rows.length; iter += 1) {
      const promise = this.transformQueryResultRow(rows[iter]);
      promises.push(promise);
      result[iter] = await promise;
    }
    await Promise.all(promises);
    return result;
  }

  protected async transformQueryResultRow(row: EntityRow): Promise<T> {
    const parsedContents = JSON.parse(row.contents);
    return ({
      ...this.definition.template,
      ...await this.fillInRelations(parsedContents),
      id: row.id, // always make the row the leading ID field
    } as unknown as T);
  }

  protected async fillInRelations(entity: T): Promise<T> {
    if (!this.definition.relations?.length) {
      return entity;
    }

    const clone: T = JSON.parse(JSON.stringify(entity)); // TODO replace with clone function

    const promises: Promise<any>[] = [];
    this.definition.relations.forEach(async (relation: Relation) => {
      const repository = this.getRepository(relation.name, relation.namespace);

      if (!relation.multiple) {
        // @ts-expect-error Suppress the TS error because there is no guarantee that the attribute exists.
        const id = clone[relation.field];
        if (typeof id === 'string') {
          const promise = repository.getById(id);
          promises.push(promise);
          const relatedEntity = await promise;
          if (!relatedEntity) {
            // @ts-expect-error Suppress the TS error because there is no guarantee that the attribute exists.
            throw new Error(`Unable to find related entity ${relation.name} with id ${entity[relation.field]}`);
          }
          // @ts-expect-error Suppress the TS error because there is no guarantee that the attribute exists.
          clone[relation.field] = relatedEntity;
        }
      } else {
        // @ts-expect-error Suppress the TS error because there is no guarantee that the attribute exists.
        const promise = this.mapRelationToMultiple(relation, clone[relation.field]);
        promises.push(promise);
        const mappedEntities = await promise;
        // @ts-expect-error Suppress the TS error because there is no guarantee that the attribute exists.
        clone[relation.field] = mappedEntities;
      }
    });
    await Promise.all(promises);
    return clone;
  }

  protected async mapRelationToMultiple(relation: Relation, arr: string[]): Promise<BaseEntity[]> {
    if (!Array.isArray(arr)) {
      return [];
    }
    const repository = this.getRepository(relation.name, relation.namespace);
    const repositoryResults = await repository.getByIds(arr);

    // preserve the ordering
    const resultsMap = new Map<string, BaseEntity>();
    repositoryResults.forEach((result) => {
      resultsMap.set(result.id, result);
    });

    const mappedResults: BaseEntity[] = [];
    arr.forEach((id) => {
      if (resultsMap.get(id)) {
        mappedResults.push(resultsMap.get(id) as BaseEntity);
      }
    });
    return mappedResults;
  }

  /**
   * Reads of the attributes marked as relations. Flattens it to a string id.
   * @param entity any
   * @returns any
   */
  protected simplifyRelations(entity: any): T { // eslint-disable-line @typescript-eslint/explicit-module-boundary-types
    if (this.definition.relations.length === 0) {
      return entity;
    }

    const clone = { ...entity };
    this.definition.relations.forEach((relation: Relation) => {
      if (!clone[relation.field]) {
        return;
      }
      if (relation.multiple) {
        clone[relation.field] = entity[relation.field].map(
          // if it is an object, use its id, else the entity is already represented by its as as string, use that immediately
          (relationEntity: BaseEntity) => (typeof relationEntity === 'string' ? relationEntity : relationEntity.id),
        );
      } else {
        // if it is an object, use its id, else the entity is already represented by its as as string, use that immediately
        clone[relation.field] = typeof clone[relation.field] === 'string'
          ? clone[relation.field]
          : clone[relation.field].id;
      }
    });
    return clone;
  }

  public createQuery(): Query {
    return new Query(this.definition.filterSortFields || {});
  }

  public abstract getAll(): Promise<T[]>;

  public abstract getByQuery(query: Query): Promise<T[]>;

  public abstract deleteUsingId(id: string): Promise<void>;

  public abstract create(obj: Omit<T, 'id'>): Promise<T>;

  public abstract update(obj: T): Promise<T>;

  public abstract getByIds(ids: string[]): Promise<T[]>;

  protected abstract queryById(id: string): Promise<T | null>;
}
