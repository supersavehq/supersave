import Debug, { Debugger } from 'debug';
import { Database } from 'sqlite';
import shortUuid from 'short-uuid';
import {
  BaseEntity, EntityDefinition, EntityRow, FilterSortField, QueryFilter, QueryOperatorEnum, QuerySort, Relation,
} from '../types';
import Query from './Query';

const debug: Debugger = Debug('supersave:db:repo');

class Repository<T extends BaseEntity> {
  constructor(
    readonly definition: EntityDefinition,
    readonly tableName: string,
    readonly getRepository: (name: string, namespace?: string) => Repository<any>,
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
      const newResults = await this.transformQueryResultRows(result);
      return newResults;
    }
    return [];
  }

  public async getOneByQuery(query: Query): Promise<T|null> {
    const result: T[] = await this.getByQuery(query);
    if (result.length === 0) {
      return null;
    }
    return result[0];
  }

  public async getByQuery(query: Query): Promise<T[]> {
    const values: Record<string, string|number> = {};
    const where: string[] = [];

    query.getWhere().forEach((queryFilter: QueryFilter) => {
      if (queryFilter.operator === QueryOperatorEnum.IN) {
        const placeholders: string[] = [];
        queryFilter.value.forEach((value: string, order: number) => {
          const placeholder = `:${queryFilter.field}_${order}`;
          placeholders.push(placeholder);
          values[placeholder] = value; // TODO this one needs escaping
        });

        where.push(`${queryFilter.field} IN(${placeholders.join(',')})`);
      } else {
        where.push(`${queryFilter.field} ${queryFilter.operator} :${queryFilter.field}`);
        if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
          values[`:${queryFilter.field}`] = queryFilter.value === true ? 1 : 0;
        } else if (queryFilter.operator === QueryOperatorEnum.LIKE) {
          values[`:${queryFilter.field}`] = `${queryFilter.value}`.replace(/\*/g, '%');
        } else {
          values[`:${queryFilter.field}`] = queryFilter.value;
        }
      }
    });

    let sqlQuery = `SELECT * FROM ${this.tableName}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    `;
    if (query.getSort().length > 0) {
      sqlQuery = `${sqlQuery} ORDER BY ${query.getSort().map((sort: QuerySort) => `${sort.field} ${sort.direction}`).join(',')}`;
    }
    if (query.getLimit()) {
      sqlQuery = `${sqlQuery} LIMIT ${typeof query.getOffset() !== 'undefined' ? `${query.getOffset()},${query.getLimit()}` : query.getLimit()}`;
    }

    debug('Querying data using query.', sqlQuery);
    const result = await this.connection.all(sqlQuery, values);
    debug('Found result count', result.length);
    if (result) {
      return this.transformQueryResultRows(result);
    }
    return [];
  }

  public async deleteUsingId(id: string): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE id = :id`;
    await this.connection.run(query, { ':id': id });
  }

  public async create(obj: T): Promise<T> {
    const columns: string[] = ['id', 'contents'];
    const uuid = shortUuid.generate();

    const values: Record<string, string|number> = {
      ':id': uuid,
      ':contents': JSON.stringify({
        ...this.definition.template,
        id: uuid,
        ...this.simplifyRelations(obj),
      }),
    };
    if (typeof this.definition.filterSortFields !== 'undefined') {
      // eslint-disable-next-line max-len
      Object.entries(this.definition.filterSortFields).forEach(([field, type]: [field: string, type: FilterSortField]) => {
        columns.push(field);
        if (type === 'boolean') {
          values[`:${field}`] = obj[field] === true ? 1 : 0;
        } else {
          values[`:${field}`] = (typeof obj[field] !== 'undefined' && obj[field] !== null) ? obj[field] : null;
        }
      });
    }

    const query = `INSERT INTO ${this.tableName} (${columns.join(',')}) VALUES(
      ${columns.map((column: string) => `:${column}`)}
    )`;
    debug('Generated create query.', query);

    await this.connection.run(
      query,
      values,
    );

    return (this.getById(uuid) as unknown as T);
  }

  public async update(obj: T): Promise<T> {
    const columns = ['contents'];
    const values: Record<string, string|number> = {
      ':contents': JSON.stringify(this.simplifyRelations(obj)),
      ':id': obj.id || '',
    };

    if (typeof this.definition.filterSortFields !== 'undefined') {
      Object.entries(this.definition.filterSortFields).forEach(([field, type]: [field: string, type: FilterSortField]) => {
        columns.push(field);
        if (type === 'boolean') {
          values[`:${field}`] = obj[field] === true ? 1 : 0;
        } else {
          values[`:${field}`] = obj[field] || null;
        }
      });
    }

    const query = `UPDATE ${this.tableName} SET
      ${columns.map((column: string) => `${column} = :${column}`)}
      WHERE id = :id
    `;
    debug('Generated update query.', query);
    await this.connection.run(
      query,
      values,
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

  private async transformQueryResultRows(rows: EntityRow[]): Promise<T[]> {
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

  private async transformQueryResultRow(row: EntityRow): Promise<T> {
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
      const repository = this.getRepository(relation.entity, relation.namespace);

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
    const repository = this.getRepository(relation.entity, relation.namespace);
    return repository.getByIds(arr);
  }

  private simplifyRelations(entity: any): T {
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

  public createQuery(): Query {
    return new Query();
  }
}

export default Repository;
