import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:getById');

export default (collection: ManagedCollection): (req: Request, rsp: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { repository } = collection;

      const item = await repository.getById(id);
      if (item === null) {
        res.status(404).json({ message: 'Not found' });
        return;
      }
      res.json({ data: item });
    } catch (error) {
      debug('Error while storing item.', error);
      res.status(500).json({ message: error.message });
    }
  };
