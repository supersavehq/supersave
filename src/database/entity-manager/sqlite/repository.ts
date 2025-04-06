import type { Debugger } from 'debug';
import Debug from 'debug';
import shortUuid from 'short-uuid';
import type { Database } from 'sqlite';
import type {
  BaseEntity,
  EntityDefinition,
  FilterSortField,
  QueryFilter,
  QuerySort,
  Relation} from '../../types';
import {
  QueryOperatorEnum
} from '../../types';
import type Query from '../query';
import BaseRepository from '../repository';

const debug: Debugger = Debug('supersave:db:sqlite:repo');

class Repository<T extends BaseEntity> extends BaseRepository<T> {
  constructor(
    protected readonly definition: EntityDefinition,
    protected readonly tableName: string,
    protected readonly getRepository: (name: string, namespace?: string) => BaseRepository<any>,
    protected readonly connection: Database
  ) {
    super(definition, tableName, getRepository);
  }

  public async getByIds(ids: string[]): Promise<T[]> {
    const wherePlaceholders: string[] = [];
    const whereValues: { [key: string]: string } = {};

    ids.forEach((value, idx) => {
      const key = `:p${idx}`;
      wherePlaceholders.push(key);
      whereValues[key] = value;
    });

    const query = `SELECT id,contents FROM ${this.tableName} WHERE id IN(${wherePlaceholders.join(',')})`;
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
    const query = `SELECT id,contents FROM ${this.tableName}`;
    const result = await this.connection.all(query);

    if (result) {
      const newResults = await this.transformQueryResultRows(result);
      return newResults;
    }
    return [];
  }

  public async getByQuery(query: Query): Promise<T[]> {
    const values: Record<string, string | number> = {};
    const where: string[] = [];

    let uniquePostfix = 1; // We use this to generate a unique placeholder, so that the attribute name can be used multiple times.
    query.getWhere().forEach((queryFilter: QueryFilter) => {
      const placeholderName = `${queryFilter.field}_${uniquePostfix}`;
      if (queryFilter.operator === QueryOperatorEnum.IN) {
        const placeholders: string[] = [];
        queryFilter.value.forEach((value: string, order: number) => {
          const placeholder = `:${placeholderName}_${order}`;
          placeholders.push(placeholder);
          values[placeholder] = value;
        });

        where.push(`"${queryFilter.field}" IN(${placeholders.join(',')})`);
      } else {
        where.push(`"${queryFilter.field}" ${queryFilter.operator} :${placeholderName}`);
        if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
          values[`:${placeholderName}`] = ['1', 1, 'true', true].includes(queryFilter.value) ? 1 : 0;
        } else if (queryFilter.operator === QueryOperatorEnum.LIKE) {
          values[`:${placeholderName}`] = `${queryFilter.value}`.replace(/\*/g, '%');
        } else {
          values[`:${placeholderName}`] = queryFilter.value;
        }
      }
      uniquePostfix++;
    });

    let sqlQuery = `SELECT id,contents FROM ${this.tableName}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    `;
    if (query.getSort().length > 0) {
      sqlQuery = `${sqlQuery} ORDER BY ${query
        .getSort()
        .map((sort: QuerySort) => `"${sort.field}" ${sort.direction}`)
        .join(',')}`;
    }
    if (query.getLimit()) {
      sqlQuery = `${sqlQuery} LIMIT ${
        typeof query.getOffset() !== 'undefined' ? `${query.getOffset()},${query.getLimit()}` : query.getLimit()
      }`;
    }

    debug('Querying data using query.', sqlQuery);
    const result = await this.connection.all(sqlQuery, values, values);
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

  public async create(object: T): Promise<T> {
    const columns: string[] = ['id', 'contents'];
    const uuid = typeof object.id === 'string' ? object.id : shortUuid.generate();

    const values: Record<string, string | number | null> = {
      ':id': uuid,
      ':contents': JSON.stringify({
        ...this.definition.template,
        ...this.simplifyRelations(object),
      }),
    };
    if (typeof this.definition.filterSortFields !== 'undefined') {
      // eslint-disable-next-line max-len
      Object.entries(this.definition.filterSortFields).forEach(
        ([field, type]: [field: string, type: FilterSortField]) => {
          columns.push(field);
          if (type === 'boolean') {
            values[`:${field}`] = object[field] === true ? 1 : 0;
          } else if (this.relationsMap.has(field)) {
            const relation = this.relationsMap.get(field) as Relation;
            if (Array.isArray(object[field]) && relation.multiple) {
              // If an filterSortField is a list, store its ids , separated, so we can filter on it using a LIKE.
              values[`:${field}`] = object[field].map((entity: BaseEntity) => entity.id).join(',');
            } else if (relation.multiple) {
              // Its a list, but no array is set.
              values[`:${field}`] = null;
            } else {
              // Store the individual value.
              if (typeof object[field] !== 'object') {
                throw new TypeError(`The provided relation value for ${field}/${type} is not an object. It should be.`);
              }
              values[`:${field}`] = object[field]?.id;
            }
          } else if (field !== 'id') {
            values[`:${field}`] = typeof object[field] !== 'undefined' && object[field] !== null ? object[field] : null;
          }
        }
      );
    }

    const query = `INSERT INTO ${this.tableName} (${columns.map((column: string) => `"${column}"`).join(',')}) VALUES(
      ${columns.map((column: string) => `:${column}`)}
    )`;
    debug('Generated create query.', query, values);

    await this.connection.run(query, values);

    return this.getById(uuid) as unknown as T;
  }

  public async update(object: T): Promise<T> {
    const columns = ['contents'];
    const simplifiedObject: any = this.simplifyRelations(object);
    delete simplifiedObject.id; // the id is already stored as a column

    const values: Record<string, string | number | boolean | null> = {
      ':contents': JSON.stringify(simplifiedObject),
      ':id': object.id || '',
    };

    if (typeof this.definition.filterSortFields !== 'undefined') {
      Object.entries(this.definition.filterSortFields).forEach(
        ([field, type]: [field: string, type: FilterSortField]) => {
          if (field === 'id') {
            return;
          }
          if (typeof object[field] !== 'undefined') {
            columns.push(field);
            if (type === 'boolean') {
              values[`:${field}`] = object[field] === true ? 1 : 0;
            } else if (this.relationsMap.has(field)) {
              const relation = this.relationsMap.get(field) as Relation;
              if (Array.isArray(simplifiedObject[field]) && relation.multiple) {
                // If an filterSortField is a list, store its ids , separated, so we can filter on it using a LIKE.
                values[`:${field}`] = simplifiedObject[field].map((entity: BaseEntity) => entity.id).join(',');
              } else if (relation.multiple) {
                // Its a list, but no array is set.
                values[`:${field}`] = null;
              } else {
                // Store the individual value.
                if (typeof object[field] !== 'object') {
                  throw new TypeError(
                    `The provided relation value for ${field}/${type} is not an object. It should be.`
                  );
                }
                values[`:${field}`] = object[field]?.id;
              }
            } else {
              values[`:${field}`] = simplifiedObject[field] || null;
            }
          }
        }
      );
    }

    const query = `UPDATE ${this.tableName} SET
      ${columns.map((column: string) => `"${column}" = :${column}`)}
      WHERE id = :id
    `;
    debug('Generated update query.', query);

    await this.connection.run(query, values);
    return this.queryById(object.id as string) as unknown as T;
  }

  protected async queryById(id: string): Promise<T | null> {
    const query = `SELECT id,contents FROM ${this.tableName} WHERE id = :id LIMIT 1`;
    debug('Query for getById', query, id);
    const result = await this.connection.get(query, { ':id': id });
    if (result) {
      return this.transformQueryResultRow(result);
    }
    debug('No result for queryById().');
    return null;
  }
}

export default Repository;
