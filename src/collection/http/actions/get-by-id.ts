import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';
import { HookError } from '../../error';
import transform from './utils';

const debug: Debugger = Debug('supersave:http:getById');

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { repository } = collection;

      let item = await repository.getById(id);

      // hook
      if (collection.hooks?.getById) {
        try {
          item = await collection.hooks.getById(collection, req, res, item);
        } catch (error: unknown | HookError) {
          debug('Error thrown in getById hook %o', error);
          // @ts-expect-error Error has type unknown.
          const code = error?.statusCode ?? 500;
          // @ts-expect-error Error has type unknown.
          res.status(code).json({ message: error.message });
          return;
        }
      }
      if (item === null) {
        res.status(404).json({ message: 'Not found', meta: { id } });
        return;
      }

      // transform hook
      try {
        item = await transform(collection, req, res, item);
      } catch (error: unknown | HookError) {
        debug('Error thrown in getById transformHook %o', error);
        // @ts-expect-error Error has type unknown.
        const code = error?.statusCode ?? 500;
        // @ts-expect-error Error has type unknown.
        res.status(code).json({ message: error.message });
        return;
      }

      res.json({ data: item });
    } catch (error) {
      debug('Error while fetching item with id %s, %o', req.params.id, error);
      res.status(500).json({ message: (error as Error).message });
    }
  };
