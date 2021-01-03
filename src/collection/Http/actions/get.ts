import { Response, Request } from 'express';
import { Query } from '../../../database/EntityManager';
import { ManagedCollection } from '../../types';

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (_req: Request, res: Response): Promise<void> => {
    const query: Query = collection.repository.createQuery();
    const items = await collection.repository.getByQuery(query.limit(25));
    res.json({ data: items });
  };
