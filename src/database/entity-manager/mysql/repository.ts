import Debug, { Debugger } from 'debug';
import { Connection } from 'mysql';
import shortUuid from 'short-uuid';
import {
  BaseEntity, EntityDefinition, EntityRow, FilterSortField, QueryFilter, QueryOperatorEnum, QuerySort,
} from '../../types';
import Query from '../query';
import BaseRepository from '../repository';
import { getQuery, executeQuery } from './utils';

const debug: Debugger = Debug('supersave:db:mysql:repo');

class Repository<T extends BaseEntity> extends BaseRepository<T> {
  constructor(
    readonly definition: EntityDefinition,
    readonly tableName: string,
    readonly getRepository: (name: string, namespace?: string) => BaseRepository<any>,
    readonly connection: Connection,
  ) {
    super(definition, tableName, getRepository);
  }

  public async getByIds(ids: string[]): Promise<T[]> {
    const wherePlaceholders: string[] = [];
    const whereValues: (string|number|boolean)[] = [];

    ids.forEach((value) => {
      wherePlaceholders.push('?');
      whereValues.push(value);
    });

    const query = `SELECT id,contents FROM ${this.connection.escapeId(this.tableName)} WHERE id IN(${wherePlaceholders.join(',')})`;
    const result = await getQuery<EntityRow>(this.connection, query, whereValues);
    const transformResult: T[] = [];
    if (result) {
      const promises = [];
      for (let iter = 0; iter < result.length; iter += 1) {
        const promise = this.transformQueryResultRow(result[iter]);
        promises.push(promise);
        transformResult[iter] = await promise;
      }
      await Promise.all(promises);
      return transformResult;
    }
    return [];
  }

  public async getAll(): Promise<T[]> {
    const query = `SELECT id,contents FROM ${this.connection.escapeId(this.tableName)}`;
    const result = await getQuery<EntityRow>(this.connection, query);

    if (result) {
      const newResults = await this.transformQueryResultRows(result);
      return newResults;
    }
    return [];
  }

  public async getByQuery(query: Query): Promise<T[]> {
    const values: (string|number|boolean)[] = [];
    const where: string[] = [];

    query.getWhere().forEach((queryFilter: QueryFilter) => {
      if (queryFilter.operator === QueryOperatorEnum.IN) {
        const placeholders: string[] = [];
        queryFilter.value.forEach((value: string) => {
          const placeholder = '?';
          placeholders.push(placeholder);
          values.push(value);
        });

        where.push(`"${this.connection.escapeId(queryFilter.field)}" IN(${placeholders.join(',')})`);
      } else {
        where.push(`"${this.connection.escapeId(queryFilter.field)}" ${queryFilter.operator} ?`);
        if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
          values.push(['1', 1, 'true', true].includes(queryFilter.value) ? 1 : 0);
        } else if (queryFilter.operator === QueryOperatorEnum.LIKE) {
          values.push(`${queryFilter.value}`.replace(/\*/g, '%'));
        } else {
          values.push(queryFilter.value);
        }
      }
    });

    let sqlQuery = `SELECT id,contents FROM ${this.connection.escapeId(this.tableName)}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    `;
    if (query.getSort().length > 0) {
      sqlQuery = `${sqlQuery} ORDER BY ${query.getSort().map((sort: QuerySort) => `"${this.connection.escapeId(sort.field)}" ${sort.direction}`).join(',')}`;
    }
    if (query.getLimit()) {
      sqlQuery = `${sqlQuery} LIMIT ${typeof query.getOffset() !== 'undefined' ? `${query.getOffset()},${query.getLimit()}` : query.getLimit()}`;
    }

    debug('Querying data using query.', sqlQuery);
    const result = await getQuery<EntityRow>(this.connection, sqlQuery, values);
    debug('Found result count', result.length);
    if (result) {
      return this.transformQueryResultRows(result);
    }
    return [];
  }

  public async deleteUsingId(id: string): Promise<void> {
    const query = `DELETE FROM ${this.connection.escapeId(this.tableName)} WHERE id = ?`;
    await executeQuery(this.connection, query, [id]);
  }

  public async create(obj: Omit<T, 'id'>): Promise<T> {
    const columns: string[] = ['id', 'contents'];
    const uuid = typeof obj.id === 'string' ? (obj.id as string) : shortUuid.generate();

    const values: (string|number|null)[] = [
      uuid,
      JSON.stringify({
        ...this.definition.template,
        ...this.simplifyRelations(obj),
      }),
    ];
    if (typeof this.definition.filterSortFields !== 'undefined') {
      // eslint-disable-next-line max-len
      Object.entries(this.definition.filterSortFields).forEach(([field, type]: [field: string, type: FilterSortField]) => {
        columns.push(field);
        if (type === 'boolean') {
          values.push(obj[field] === true ? 1 : 0);
        } else if (this.relationFields.includes(field)) {
          values.push(obj[field]?.id);
        } else if (field !== 'id') {
          values.push((typeof obj[field] !== 'undefined' && obj[field] !== null) ? obj[field] : null);
        }
      });
    }

    const query = `INSERT INTO ${this.connection.escapeId(this.tableName)} (${columns.map((column: string) => `"${this.connection.escapeId(column)}"`).join(',')}) VALUES(
      ${columns.map(() => '?')}
    )`;
    debug('Generated create query.', query);

    await executeQuery(this.connection, query, values);

    return (this.getById(uuid) as unknown as T);
  }

  public async update(obj: T): Promise<T> {
    const columns = ['contents'];
    const simplifiedObject: any = this.simplifyRelations(obj);
    const values: (string|number|boolean|null)[] = [
      JSON.stringify(simplifiedObject),
    ];

    if (typeof this.definition.filterSortFields !== 'undefined') {
      Object.entries(this.definition.filterSortFields).forEach(([field, type]: [field: string, type: FilterSortField]) => {
        if (typeof obj[field] !== 'undefined') {
          columns.push('?');
          if (type === 'boolean') {
            values.push(obj[field] === true ? 1 : 0);
          } else {
            values.push(simplifiedObject[field] || null);
          }
        }
      });
    }

    const query = `UPDATE ${this.connection.escapeId(this.tableName)} SET
      ${columns.map((column: string) => `"${column}" = ?`)}
      WHERE id = ?
    `;
    values.push(obj.id || '');
    debug('Generated update query.', query);
    await executeQuery(this.connection, query, values);
    return (this.getById(obj.id as string) as unknown as T);
  }

  protected async queryById(id: string): Promise<T | null> {
    const query = `SELECT id,contents FROM ${this.connection.escapeId(this.tableName)} WHERE id = ? LIMIT 1`;
    debug('Query for getById', query, id);
    const result = await getQuery<EntityRow>(this.connection, query, [id]);
    if (result.length > 0) {
      return this.transformQueryResultRow(result[0]);
    }
    debug('No result for queryById().');
    return null;
  }
}

export default Repository;
