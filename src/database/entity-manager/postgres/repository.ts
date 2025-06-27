import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Pool } from 'pg'; // Changed from mysql2/promise to pg
import shortUuid from 'short-uuid';
import { executeQuery, getQuery, escapeId as pgEscapeId } from './utils'; // Import escapeId from pg utils
import type {
  BaseEntity,
  EntityDefinition,
  EntityRow,
  // FilterSortField, // Not directly used here due to generated columns
  QueryFilter,
  QuerySort,
  // Relation, // Not directly used here due to generated columns
} from '../../types';
import { QueryOperatorEnum } from '../../types';
import type Query from '../query';
import BaseRepository from '../repository';

const debug: Debugger = Debug('supersave:db:postgres:repo'); // Changed debug namespace

class Repository<T extends BaseEntity> extends BaseRepository<T> {
  constructor(
    protected readonly definition: EntityDefinition,
    protected readonly tableName: string,
    protected readonly getRepository: (name: string, namespace?: string) => BaseRepository<any>,
    protected readonly pool: Pool // Changed Pool type to pg.Pool
  ) {
    super(definition, tableName, getRepository);
  }

  // Use the imported escapeId for PostgreSQL
  private escapeId(identifier: string): string {
    return pgEscapeId(identifier);
  }

  public async getByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }
    // Use $1, $2, etc. for placeholders in PostgreSQL
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const query = `SELECT id, contents FROM ${this.escapeId(this.tableName)} WHERE id IN(${placeholders})`;
    const result = await getQuery<EntityRow>(this.pool, query, ids);

    const transformResult: T[] = [];
    if (result) {
      for (const element of result) {
        // Assuming transformQueryResultRow might be async
        transformResult.push(await this.transformQueryResultRow(element));
      }
      return transformResult;
    }
    return [];
  }

  public async getAll(): Promise<T[]> {
    const query = `SELECT id, contents FROM ${this.escapeId(this.tableName)}`;
    const result = await getQuery<EntityRow>(this.pool, query);

    if (result) {
      const newResults: T[] = [];
      for (const row of result) {
        newResults.push(await this.transformQueryResultRow(row));
      }
      return newResults;
    }
    return [];
  }

  public async getByQuery(query: Query): Promise<T[]> {
    const values: (string | number | boolean | (string | number | boolean)[])[] = [];
    const where: string[] = [];
    let valueCounter = 1; // For $1, $2 placeholders

    query.getWhere().forEach((queryFilter: QueryFilter) => {
      const fieldName = this.escapeId(queryFilter.field);
      if (queryFilter.operator === QueryOperatorEnum.IN) {
        const inValues = Array.isArray(queryFilter.value) ? queryFilter.value : [queryFilter.value];
        if (inValues.length === 0) {
          where.push('1 = 0'); // Or 'FALSE' for PostgreSQL for empty IN
          return;
        }
        const placeholders = inValues.map(() => `$${valueCounter++}`);
        where.push(`${fieldName} IN (${placeholders.join(',')})`);
        values.push(...inValues);
      } else {
        let value = queryFilter.value;
        if (queryFilter.operator === QueryOperatorEnum.LIKE) {
          value = String(value).replace(/\*/g, '%');
        }
        if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
          // PostgreSQL boolean literals are TRUE and FALSE
          value = ['1', 1, 'true', true, 't'].includes(queryFilter.value) ? true : false;
        }
        where.push(`${fieldName} ${queryFilter.operator} $${valueCounter++}`);
        values.push(value);
      }
    });

    let sqlQuery = `SELECT id, contents FROM ${this.escapeId(this.tableName)}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    `;

    if (query.getSort().length > 0) {
      sqlQuery = `${sqlQuery} ORDER BY ${query
        .getSort()
        .map((sort: QuerySort) => `${this.escapeId(sort.field)} ${sort.direction.toUpperCase()}`) // ASC/DESC
        .join(',')}`;
    }

    if (query.getLimit()) {
      sqlQuery = `${sqlQuery} LIMIT $${valueCounter++}`;
      values.push(query.getLimit());
      if (typeof query.getOffset() !== 'undefined' && query.getOffset() !== null) { // Check for null also
        sqlQuery = `${sqlQuery} OFFSET $${valueCounter++}`;
        values.push(query.getOffset());
      }
    }

    debug('Querying data using query.', sqlQuery, values);
    const result = await getQuery<EntityRow>(this.pool, sqlQuery, values);
    debug('Found result count', result.length);

    if (result) {
      const transformedRows: T[] = [];
      for (const row of result) {
        transformedRows.push(await this.transformQueryResultRow(row));
      }
      return transformedRows;
    }
    return [];
  }

  public async deleteUsingId(id: string): Promise<void> {
    const query = `DELETE FROM ${this.escapeId(this.tableName)} WHERE id = $1`;
    await executeQuery(this.pool, query, [id]);
  }

  public async create(object: Omit<T, 'id'>): Promise<T> {
    const uuid = typeof object.id === 'string' ? (object.id as string) : shortUuid.generate();

    // With generated columns, we only insert 'id' and 'contents'.
    // Other 'filterSortFields' are generated by PostgreSQL based on 'contents'.
    const valuesToInsert: (string | number | null)[] = [
      uuid,
      JSON.stringify({
        ...this.definition.template,
        ...this.simplifyRelations(object), // simplifyRelations prepares the object for JSON storage
      }),
    ];

    // Use RETURNING id to get the id back, useful if not self-generated or to confirm.
    const query = `INSERT INTO ${this.escapeId(this.tableName)} (id, contents) VALUES ($1, $2) RETURNING id`;
    debug('Generated create query.', query, valuesToInsert);

    await executeQuery(this.pool, query, valuesToInsert);

    // Fetch the entity by ID to get all fields, including those generated by the DB.
    const newEntity = await this.getById(uuid);
    if (!newEntity) {
      // This case should ideally not happen if insert was successful and ID is correct.
      throw new Error('Failed to retrieve entity after creation.');
    }
    return newEntity;
  }

  public async update(object: T): Promise<T> {
    if (!object.id) {
      throw new Error('Cannot update an object without an ID.');
    }
    const simplifiedObject: any = this.simplifyRelations(object);
    delete simplifiedObject.id; // ID is used in WHERE, not in SET for contents

    // Only 'contents' needs to be explicitly updated. Generated columns update automatically.
    const valuesToUpdate: (string | number | boolean | null)[] = [
      JSON.stringify(simplifiedObject),
      object.id, // For WHERE id = $2
    ];

    const query = `UPDATE ${this.escapeId(this.tableName)} SET contents = $1 WHERE id = $2`;
    debug('Generated update query.', query, valuesToUpdate);
    await executeQuery(this.pool, query, valuesToUpdate);

    // Fetch the updated entity to get its current state, including any changes to generated columns.
    const updatedEntity = await this.queryById(object.id as string);
    if (!updatedEntity) {
      // This case should ideally not happen if update was successful and ID is correct.
      throw new Error('Failed to retrieve entity after update.');
    }
    return updatedEntity;
  }

  protected async queryById(id: string): Promise<T | null> {
    const query = `SELECT id, contents FROM ${this.escapeId(this.tableName)} WHERE id = $1 LIMIT 1`;
    debug('Query for getById', query, id);
    const result = await getQuery<EntityRow>(this.pool, query, [id]);
    if (result.length > 0) {
      return this.transformQueryResultRow(result[0]);
    }
    debug('No result for queryById().');
    return null;
  }
}

export default Repository;
