import { Response, Request } from 'express';
import Debug, { Debugger } from 'debug';
import { ManagedCollection } from '../../types';

const debug: Debugger = Debug('supersave:http:updateById');

export default (collection: ManagedCollection): (req: Request, res: Response) => Promise<void> =>
  // eslint-disable-next-line implicit-arrow-linebreak
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { repository } = collection;

      const item = await repository.getById(id);
      if (item === null) {
        res.status(404).json({ message: 'Not Found' });
        return;
      }

      const { body } = req;
      debug('Incoming update request', body);
      collection.entity.relations.forEach((relation) => {
        if (body[relation.field]) {
          if (relation.multiple && Array.isArray(body[relation.field]) && body[relation.field].length > 0) {
            if (typeof body[relation.field][0] !== 'object') {
              body[relation.field] = body[relation.field]
                .map((relationId: string) => ({ id: relationId }));
            }
          } else if (!relation.multiple && typeof body[relation.field] === 'object') {
            body[relation.field] = {
              id: body[relation.field],
            };
          }
        }
      });

      const updatedEntity = {
        ...item,
        ...body,
      };
      debug('Updating entity.', updatedEntity);

      const updatedResult = await repository.update(updatedEntity);
      res.json({ data: updatedResult });
    } catch (error) {
      debug('Error while storing item.', error);
      res.status(500).json({ message: error.message });
    }
  };
