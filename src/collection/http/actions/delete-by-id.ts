import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';
import { HookError } from '../../error';

const debug: Debugger = Debug('supersave:http:getById');

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { repository } = collection;

      if (collection.hooks?.deleteBefore) {
        const item: any = await repository.getById(id);
        try {
          collection.hooks.deleteBefore(collection, req, res, item);
        } catch (error: unknown | HookError) {
          debug('Error thrown in createBeforeHook %o', error);
          // @ts-expect-error Error has type unknown.
          const code = error?.statusCode ?? 500;
          // @ts-expect-error Error has type unknown.
          res.status(code).json({ message: error.message });
          return;
        }
      }

      await repository.deleteUsingId(id);
      debug('Deleted from', collection.name, id);
      res.status(204).send();
    } catch (error) {
      debug('Error while deleting item. %o', error);
      res.status(500).json({ message: (error as Error).message });
    }
  };
