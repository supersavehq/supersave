import express, { type Request, type Response } from 'express';
import supertest from 'supertest';
import { type Collection, HookError, SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { planetCollection } from '../../../entities';
import { clear } from '../../../mysql';
import type { Planet } from '../../../types';

beforeEach(clear);

describe('updateBefore hook', () => {
  test('the hook can manipulate a value.', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: [
        {
          updateBefore: (
            _collection: Collection,
            _req: Request,
            _res: Response,

            entity: any
          ): any => {
            return {
              ...entity,
              name: `HOOK-${entity.name ?? ''}`,
            };
          },
          entityTransform: (
            _collection: Collection,
            _req: Request,
            _res: Response,
            entity: any
          ): any => {
            return {
              ...entity,
              name: `${entity.name}-TRANSFORM`,
            };
          },
        },
      ],
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    // create the planet
    const createResponse = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(200);
    expect(createResponse.body.data.name).toBe(`${planet.name}-TRANSFORM`);

    // update it
    const updateResponse = await supertest(app)
      .patch(`/api/planets/${createResponse.body.data.id}`)
      .send({ id: planet.id, name: planet.name })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(updateResponse.body.data?.name).toBe(
      `HOOK-${planet.name}-TRANSFORM`
    );
  });

  test('the statusCode and message are copied from the exception', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: [
        {
          updateBefore: (
            _collection: Collection,
            _req: Request,
            _res: Response,
            _entity: any
          ) => {
            throw new HookError('Test message', 401);
          },
        },
      ],
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    // create
    const createResponse = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(200);

    // update
    const response = await supertest(app)
      .patch(`/api/planets/${createResponse.body.data.id}`)
      .send({ name: 'Updated planet' })
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).toEqual({ message: 'Test message' });
  });

  test('the message is copied from the exception', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: [
        {
          updateBefore: (
            _collection: Collection,
            _req: Request,
            _res: Response,
            _entity: any
          ) => {
            throw new HookError('Test message');
          },
        },
      ],
    });
    app.use('/api', await superSave.getRouter());

    const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

    const createResponse = await supertest(app)
      .post('/api/planets')
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(200);

    const updateResponse = await supertest(app)
      .patch(`/api/planets/${createResponse.body.data.id}`)
      .send(planet)
      .expect('Content-Type', /json/)
      .expect(500);

    expect(updateResponse.body).toEqual({ message: 'Test message' });
  });
});
