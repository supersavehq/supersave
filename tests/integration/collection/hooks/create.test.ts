import supertest from 'supertest';
import express, { Request, Response } from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Collection, HookError, SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { clear } from '../../../mysql';

beforeEach(clear);

describe('createBefore hook', () => {
  test('the hook can manipulate a value.', async() => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        createBefore: (_collection: Collection, _req: Request, _res: Response, entity: any) => {
          return {
            ...entity,
            name: `HOOK-${entity.name}`,
          }
        },
        entityTransform: (_collection: Collection, _req: Request, _res: Response, entity: any) => {
          return {
            ...entity,
            extra: true
          };
        }
      },
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    const response = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(typeof response.body.data).toBe('object');
    expect(response.body.data.name).toBe(`HOOK-${planet.name}`);
    expect(response.body.data.extra).toEqual(true);
  });

  test('the statusCode and message are copied from the exception', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        createBefore: (_collection: Collection, _req: Request, _res: Response, _entity: any) => {
          throw new HookError('Test message', 401);
        },
      },
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    const response = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(401);

      expect(response.body).toEqual({ message: 'Test message' });
  });

  test('the message is copied from the exception', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: {
        createBefore: (_collection: Collection, _req: Request, _res: Response, _entity: any) => {
          throw new HookError('Test message');
        },
      },
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    const response = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(500);

      expect(response.body).toEqual({ message: 'Test message' });
  });
});
