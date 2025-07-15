import type { Debugger } from 'debug';
import Debug from 'debug';
import type { Request, Response } from 'express';
import type { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:getById');

export default (
  collection: ManagedCollection
): ((request: Request, res: Response) => Promise<void>) =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (request, res: Response): Promise<void> => {
    try {
      const { id } = request.params;
      const { repository } = collection;

      // Use this one-liner to determine if there are any hooks to run.
      const deleteHooks = (collection.hooks || [])
        .map((hooks) => hooks.deleteBefore)
        .filter((deleteBefore) => typeof deleteBefore !== 'undefined');

      if (deleteHooks.length > 0) {
        const item: any = await repository.getById(id);
        for (const hooks of collection.hooks || []) {
          if (hooks.deleteBefore) {
            try {
              await hooks.deleteBefore(collection, request, res, item);
            } catch (error: unknown) {
              debug('Error thrown in createBeforeHook %o', error);

              const code = (error as any)?.statusCode ?? 500;
              res.status(code).json({ message: (error as Error).message });
              return;
            }
          }
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
