import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:getById');

export default (collection: ManagedCollection): (req: Request, rsp: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { repository } = collection;

    await repository.deleteUsingId(id);
    debug('Deleted from', collection.name, id);
    res.status(204).send();
  };
