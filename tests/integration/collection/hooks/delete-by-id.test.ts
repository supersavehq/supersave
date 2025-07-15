import express, { type Request, type Response } from 'express';
import supertest from 'supertest';
import {
  type Collection,
  HookError,
  type Repository,
  SuperSave,
} from '../../../../build';
import getConnection from '../../../connection';
import { planetCollection } from '../../../entities';
import { clear } from '../../../mysql';
import type { Planet } from '../../../types';

beforeEach(clear);

describe('deleteBefore', () => {
  test.each([undefined, 401])(
    'delete is blocked by an exception',
    async (statusCode?: number) => {
      const app: express.Application = express();
      const superSave = await SuperSave.create(getConnection());

      const planetRepository: Repository<Planet> =
        await superSave.addCollection<Planet>({
          ...planetCollection,
          hooks: [
            {
              deleteBefore: (
                _collection: Collection,
                _req: Request,
                _res: Response,

                _entity: any
              ) => {
                throw new HookError('Test message', statusCode);
              },
            },
          ],
        });
      const planet = await planetRepository.create({ name: 'Earth' });
      app.use('/', await superSave.getRouter());

      await supertest(app)
        .delete(`/planets/${planet.id as string}`)
        .expect(statusCode ?? 500);

      const allPlanets = await planetRepository.getAll();
      expect(allPlanets).toHaveLength(1);
      await superSave.close();
    }
  );
});
