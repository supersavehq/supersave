import Debug, { Debugger } from 'debug';
import { Database } from 'sqlite';
import shortUuid from 'short-uuid';
import {
  BaseEntity,
  EntityDefinition,
  FilterSortField,
  QueryFilter,
  QueryOperatorEnum,
  QuerySort,
  Relation,
} from '../../types';
import Query from '../query';
import BaseRepository from '../repository';

const debug: Debugger = Debug('supersave:db:sqlite:repo');

class Repository<T extends BaseEntity> extends BaseRepository<T> {
  constructor(
    readonly definition: EntityDefinition,
    readonly tableName: string,
    readonly getRepository: (name: string, namespace?: string) => BaseRepository<any>,
    readonly connection: Database
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

    query.getWhere().forEach((queryFilter: QueryFilter) => {
      if (queryFilter.operator === QueryOperatorEnum.IN) {
        const placeholders: string[] = [];
        queryFilter.value.forEach((value: string, order: number) => {
          const placeholder = `:${queryFilter.field}_${order}`;
          placeholders.push(placeholder);
          values[placeholder] = value;
        });

        where.push(`"${queryFilter.field}" IN(${placeholders.join(',')})`);
      } else {
        where.push(`"${queryFilter.field}" ${queryFilter.operator} :${queryFilter.field}`);
        if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
          values[`:${queryFilter.field}`] = ['1', 1, 'true', true].includes(queryFilter.value) ? 1 : 0;
        } else if (queryFilter.operator === QueryOperatorEnum.LIKE) {
          values[`:${queryFilter.field}`] = `${queryFilter.value}`.replace(/\*/g, '%');
        } else {
          values[`:${queryFilter.field}`] = queryFilter.value;
        }
      }
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

  public async create(obj: Omit<T, 'id'>): Promise<T> {
    const columns: string[] = ['id', 'contents'];
    const uuid = typeof obj.id === 'string' ? (obj.id as string) : shortUuid.generate();

    const values: Record<string, string | number | null> = {
      ':id': uuid,
      ':contents': JSON.stringify({
        ...this.definition.template,
        ...this.simplifyRelations(obj),
      }),
    };
    if (typeof this.definition.filterSortFields !== 'undefined') {
      // eslint-disable-next-line max-len
      Object.entries(this.definition.filterSortFields).forEach(
        ([field, type]: [field: string, type: FilterSortField]) => {
          columns.push(field);
          if (type === 'boolean') {
            values[`:${field}`] = obj[field] === true ? 1 : 0;
          } else if (this.relationsMap.has(field)) {
            const relation = this.relationsMap.get(field) as Relation;
            if (Array.isArray(obj[field]) && relation.multiple) {
              // If an filterSortField is a list, store its ids , separated, so we can filter on it using a LIKE.
              values[`:${field}`] = obj[field].map((entity: BaseEntity) => entity.id).join(',');
            } else if (relation.multiple) {
              // Its a list, but no array is set.
              values[`:${field}`] = null;
            } else {
              // Store the individual value.
              values[`:${field}`] = obj[field]?.id;
            }
          } else if (field !== 'id') {
            values[`:${field}`] = typeof obj[field] !== 'undefined' && obj[field] !== null ? obj[field] : null;
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

  public async update(obj: T): Promise<T> {
    const columns = ['contents'];
    const simplifiedObject: any = this.simplifyRelations(obj);
    delete simplifiedObject.id; // the id is already stored as a column

    const values: Record<string, string | number | boolean | null> = {
      ':contents': JSON.stringify(simplifiedObject),
      ':id': obj.id || '',
    };

    if (typeof this.definition.filterSortFields !== 'undefined') {
      Object.entries(this.definition.filterSortFields).forEach(
        ([field, type]: [field: string, type: FilterSortField]) => {
          if (field === 'id') {
            return;
          }
          if (typeof obj[field] !== 'undefined') {
            columns.push(field);
            if (type === 'boolean') {
              values[`:${field}`] = obj[field] === true ? 1 : 0;
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
    return this.queryById(obj.id as string) as unknown as T;
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
