import { Response, Request } from 'express';
import { Query } from '../../../database/EntityManager';
import { ManagedCollection } from '../../types';

function sort(query: Query, sortRequest: string): void {
  const sorts = sortRequest.split(',');
  sorts.forEach((sortField: string) => {
    if (sortField.startsWith('-')) {
      query.sort(sortField.substring(1));
    } else {
      query.sort(sortField);
    }
  });
}

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    const query: Query = collection.repository.createQuery();

    if (req.query.sort) {
      sort(query, (req.query.sort as string));
    }

    const items = await collection.repository.getByQuery(query.limit(25));
    res.json({ data: items });
  };
