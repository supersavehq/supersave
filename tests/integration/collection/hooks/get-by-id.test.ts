
import supertest from 'supertest';
import express, { Request, Response} from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Collection, Repository, SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('getById Hook', () => {
  test('Hook returns manipulated object', async() => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        getById: (_collection: Collection, _req: Request, _res: Response, entity: any) => {
          return {
            ...entity,
            name: `HOOK-${entity.name}`,
          }
        },
        entityTransform: (_collection: Collection, _req: Request, _res: Response, entity: any): any => {
          return {
            ...entity,
            extra: true,
          }
        }
      }
    });
    const planet = await planetRepository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app)
      .get(`/planets/${(planet.id as string)}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.name).toEqual(`HOOK-${planet.name}`);
    expect(response.body.data.extra).toBe(true);
    await superSave.close();
  });
});
