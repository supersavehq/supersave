import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Request, Response } from 'express';
import transform from './utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { HookError } from '../../error';
import type { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:updateById');

export default (collection: ManagedCollection): ((request: Request, res: Response) => Promise<void>) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (request, res: Response): Promise<void> => {
    try {
      const { id } = request.params;
      const { repository } = collection;

      const item = await repository.getById(id);
      if (item === null) {
        res.status(404).json({ message: 'Not Found' });
        return;
      }

      const { body } = request;
      debug('Incoming update request', body);
      collection.relations.forEach((relation) => {
        if (body[relation.field]) {
          if (relation.multiple && Array.isArray(body[relation.field]) && body[relation.field].length > 0) {
            // check if an array of strings was provided, if so, we translate it to an array of empty objects with the id attribute set.
            if (typeof body[relation.field][0] === 'string') {
              body[relation.field] = body[relation.field].map((relationId: string) => ({ id: relationId }));
            }
          } else if (!relation.multiple && typeof body[relation.field] === 'string') {
            // the relation is provided as a string, map it to an empty object with an id attribute.
            body[relation.field] = {
              id: body[relation.field],
            };
          }
        }
      });

      let updatedEntity = {
        ...item,
        ...body,
      };
      debug('Updating entity.', updatedEntity);

      let updatedResult: any;

      for (const hooks of collection.hooks || []) {
        if (hooks.updateBefore) {
          // hook
          try {
            updatedEntity = await hooks.updateBefore(collection, request, res, updatedEntity);
          } catch (error: unknown | HookError) {
            debug('Error thrown in updateBeforeHook %o', error);
            // @ts-expect-error Error has type unknown.
            const code = error?.statusCode ?? 500;
            // @ts-expect-error Error has type unknown.
            res.status(code).json({ message: error.message });
            return;
          }
        }
      }
      updatedResult = await collection.repository.update(updatedEntity);

      // transform hook
      try {
        updatedResult = await transform(collection, request, res, updatedResult);
      } catch (error: unknown | HookError) {
        debug('Error thrown in updateById transform %o', error);
        // @ts-expect-error Error has type unknown.
        const code = error?.statusCode ?? 500;
        // @ts-expect-error Error has type unknown.
        res.status(code).json({ message: error.message });
        return;
      }

      res.json({ data: updatedResult });
    } catch (error) {
      debug('Error while storing item. %o', error);
      res.status(500).json({ message: (error as Error).message });
    }
  };
