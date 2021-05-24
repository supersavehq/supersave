import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:create');

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { body } = req;
      if (typeof body !== 'object') {
        throw new Error('Request body is not an object.');
      }
      collection.relations.forEach((relation) => {
        if (body[relation.field]) {
          if (relation.multiple && !Array.isArray(body[relation.field])) {
            throw new Error(`Attribute ${relation.field} is a relation for multiple entities, but no array is provided.`);
          } else if (relation.multiple) {
            if (body[relation.field][0] === 'string') {
              body[relation.field] = body[relation.field].map((id: string) => ({ id }));
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
      const item: any = await collection.repository.create(body);
      debug('Created collection item at', req.path);
      res.json({ data: item });
    } catch (error) {
      debug('Error while storing item.', error);
      res.status(500).json({ message: error.message });
    }
  };
