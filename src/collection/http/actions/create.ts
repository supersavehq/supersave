import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Request, Response } from 'express';
import type { ManagedCollection } from '../../types';
import transform from './utils';

const debug: Debugger = Debug('supersave:http:create');

export default (
  collection: ManagedCollection
): ((request: Request, res: Response) => Promise<void>) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (request, res: Response): Promise<void> => {
    try {
      const { body } = request;
      if (typeof body !== 'object') {
        throw new TypeError('Request body is not an object.');
      }
      collection.relations.forEach((relation) => {
        if (body[relation.field]) {
          if (relation.multiple && !Array.isArray(body[relation.field])) {
            throw new Error(
              `Attribute ${relation.field} is a relation for multiple entities, but no array is provided.`
            );
          } else if (relation.multiple) {
            if (body[relation.field][0] === 'string') {
              body[relation.field] = body[relation.field].map((id: string) => ({
                id,
              }));
            }
          } else if (!relation.multiple) {
            if (typeof body[relation.field] === 'string') {
              body[relation.field] = {
                id: body[relation.field],
              };
            }
          }
        }
      });

      let item: any;
      let itemBody = body;

      for (const hooks of collection.hooks || []) {
        if (hooks.createBefore) {
          // hook
          try {
            itemBody = await hooks.createBefore(
              collection,
              request,
              res,
              itemBody
            );
          } catch (error) {
            debug('Error thrown in createBeforeHook %o', error);
            // @ts-expect-error Error has type unknown.
            const code = error?.statusCode ?? 500;
            // @ts-expect-error Error has type unknown.
            res.status(code).json({ message: error.message });
            return;
          }
        }
      }
      item = await collection.repository.create(itemBody);
      debug('Created collection item at', request.path);

      // transform hook
      try {
        item = await transform(collection, request, res, item);
      } catch (error: unknown) {
        debug('Error thrown in create transformHook %o', error);

        const code = (error as any)?.statusCode ?? 500;
        res.status(code).json({ message: (error as Error).message });
        return;
      }

      res.json({ data: item });
    } catch (error) {
      debug('Error while storing item. %o', error);
      res.status(500).json({ message: (error as Error).message });
    }
  };
