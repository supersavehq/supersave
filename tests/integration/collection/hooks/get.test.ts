import supertest from 'supertest';
import express, { Request, Response } from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Collection, HookError, SuperSave } from '../../../../build';
import getConnection from '../../../connection';

import { clear } from '../../../mysql';

beforeEach(clear);

describe('getHook', () => {
  test('get hook can manipulate filter', async() => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        get: (_collection: Collection, req: Request, _res: Response) => {
          req.query.id = 'non-existing-id';
        },
      }
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app)
      .get('/planets')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });

  test('transform hook changes entity', async() => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        entityTransform: (_collection: Collection, _req: Request, _res: Response, entity: any): any => {
          return {
            ...entity,
            extra: true,
          }
        }
      }
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app)
      .get('/planets')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(response.body.data[0].extra).toBe(true);
  });

  test('thrown error with status code is returned', async() => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        get: (_collection: Collection, _req: Request, _res: Response) => {
          throw new HookError('Test message', 401);
        }
      }
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app)
      .get('/planets')
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toEqual({ message: 'Test message'});
  });
});
