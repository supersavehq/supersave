import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Request, Response } from 'express';
import type { Query } from '../../../database/entity-manager';
import type { FilterSortField } from '../../../database/types';
import { QueryOperatorEnum } from '../../../database/types';
import type { ManagedCollection } from '../../types';
import transform from './utils';

const debug: Debugger = Debug('supersave:http:get');

function sort(query: Query, sortRequest: string): void {
  const sorts = sortRequest.split(',');
  sorts.forEach((sortField: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    let parsedSortField = sortField;

    if (sortField.startsWith('-')) {
      parsedSortField = sortField.substring(1);
      direction = 'desc';
    }
    query.sort(parsedSortField, direction);
  });
}

function filter(
  collection: ManagedCollection,
  query: Query,
  filters: Record<string, string>
): void {
  if (Object.keys(filters).length === 0) {
    return;
  }
  if (!collection.filterSortFields) {
    throw new Error(
      'There are no fields available to filter on, while filters were provided.'
    );
  }

  // eslint-disable-next-line max-len
  const filterSortFields: Record<string, FilterSortField> =
    collection.filterSortFields;
  Object.entries(filters).forEach(([field, value]: [string, string]) => {
    const matches: string[] | null = (field || '').match(/(.*)\[(.*)\]$/);
    if (matches === null || matches.length !== 3) {
      if (
        collection.filterSortFields &&
        collection.filterSortFields[field] === 'boolean'
      ) {
        query.eq(field, ['1', 1, 'true', true].includes(value));
      } else {
        query.eq(field, value);
      }
      return;
    }

    const filteredField: string = matches[1];
    const operator: string = matches[2];

    if (!filterSortFields[filteredField]) {
      throw new Error(`${filteredField} is not a field you can filter on.`);
    }

    switch (operator) {
      case QueryOperatorEnum.EQUALS: {
        query.eq(filteredField, value);
        break;
      }
      case QueryOperatorEnum.GREATER_THAN: {
        query.gt(filteredField, value);
        break;
      }
      case QueryOperatorEnum.GREATER_THAN_EQUALS: {
        query.gte(filteredField, value);
        break;
      }
      case QueryOperatorEnum.LESS_THAN: {
        query.lt(filteredField, value);
        break;
      }
      case QueryOperatorEnum.LESS_THAN_EQUALS: {
        query.lte(filteredField, value);
        break;
      }
      case 'in': {
        query.in(filteredField, value.split(','));
        break;
      }
      case '~': {
        query.like(filteredField, value);
        break;
      }
      default:
        throw new Error(
          `Unrecognized operator ${operator} for filteredField ${filteredField}.`
        );
    }
  });
}

function limitOffset(query: Query, params: Record<string, string>): void {
  const { limit = '25', offset = '0' } = params;
  if (limit === '-1') {
    query.limit(undefined);
  } else {
    query.limit(parseInt(limit, 10) || 25);
  }

  query.offset(parseInt(offset, 10) || 0);
}

export default (
  collection: ManagedCollection
): ((request: Request, res: Response) => Promise<void>) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (request, res: Response): Promise<void> => {
    try {
      // hook
      for (const hooks of collection.hooks || []) {
        if (hooks.get) {
          try {
            await hooks.get(collection, request, res);
          } catch (error: unknown) {
            debug('Error thrown in getHook %o', error);
            // @ts-expect-error Error has type unknown.
            const code = error?.statusCode ?? 500;
            // @ts-expect-error Error has type unknown.
            res.status(code).json({ message: error.message });
            return;
          }
        }
      }

      const query: Query = collection.repository.createQuery();
      if (request.query.sort) {
        try {
          sort(query, request.query.sort as string);
        } catch (error) {
          res.status(400).json({ message: (error as Error).message });
          return;
        }
      }

      const filters: Record<string, string> = {};

      Object.entries(request.query as Record<string, any>).forEach(
        ([field, value]: [string, any]) => {
          if (field === 'sort' || field === 'limit' || field === 'offset') {
            return;
          }

          // Express by default parses values as ?distance[>]=0 into { distance: { '>': 0 }}. Unless 'the query parser'
          // setting is set the 'simple' on app., then its always a string.
          if (typeof value === 'string') {
            filters[field] = value;
          } else if (typeof value === 'object') {
            Object.entries(value).forEach(
              ([operator, filterValue]: [string, any]) => {
                filters[`${field}[${operator}]`] = `${filterValue}`;
              }
            );
          } else {
            debug('Ignoring query parameter', field, value);
          }
        }
      );

      try {
        filter(collection, query, filters);
      } catch (error) {
        res.status(400).json({ message: (error as Error).message });
        return;
      }

      try {
        limitOffset(query, request.query as Record<string, any>);
        let items = await collection.repository.getByQuery(query);

        // transform hook
        try {
          items = await Promise.all(
            items.map(async (item) => transform(collection, request, res, item))
          );
        } catch (error: unknown) {
          debug('Error thrown in get transform %o', error);
          // @ts-expect-error Error has type unknown.
          const code = error?.statusCode ?? 500;
          // @ts-expect-error Error has type unknown.
          res.status(code).json({ message: error.message });
          return;
        }

        res.json({
          data: items,
          meta: {
            sort: query.getSort(),
            limit: query.getLimit(),
            filters: query.getWhere(),
            offset: query.getOffset(),
          },
        });
      } catch (error) {
        debug('Unexpected error while querying collection.', error);
        res
          .status(500)
          .json({ message: 'An unexpected error occurred, try again later.' });
      }
    } catch (error) {
      debug('Error while fetching items. Query: %o, %o', request.query, error);
      res.status(500).json({ message: (error as Error).message });
    }
  };
