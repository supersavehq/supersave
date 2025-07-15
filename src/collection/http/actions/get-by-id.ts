import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Request, Response } from 'express';
import type { ManagedCollection } from '../../types';
import transform from './utils';

const debug: Debugger = Debug('supersave:http:getById');

export default (
  collection: ManagedCollection
): ((request: Request, res: Response) => Promise<void>) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (request, res: Response): Promise<void> => {
    try {
      const { id } = request.params;
      const { repository } = collection;

      let item = await repository.getById(id);

      // hook
      for (const hooks of collection.hooks || []) {
        if (hooks.getById) {
          try {
            item = await hooks.getById(collection, request, res, item);
          } catch (error: unknown) {
            debug('Error thrown in getById hook %o', error);

            const code = (error as any)?.statusCode ?? 500;
            res.status(code).json({ message: (error as Error).message });
            return;
          }
        }
      }
      if (item === null) {
        res.status(404).json({ message: 'Not found', meta: { id } });
        return;
      }

      // transform hook
      try {
        item = await transform(collection, request, res, item);
      } catch (error: unknown) {
        debug('Error thrown in getById transformHook %o', error);

        const code = (error as any)?.statusCode ?? 500;
        res.status(code).json({ message: (error as Error).message });
        return;
      }

      res.json({ data: item });
    } catch (error) {
      debug(
        'Error while fetching item with id %s, %o',
        request.params.id,
        error
      );
      res.status(500).json({ message: (error as Error).message });
    }
  };
