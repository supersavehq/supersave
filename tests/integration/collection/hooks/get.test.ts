import { beforeEach, describe, expect, test } from 'vitest';
import type { Request, Response } from 'express';
import express from 'express';
import supertest from 'supertest';
import type { Collection} from '../../../../src';
import { HookError, SuperSave } from '../../../../src';
import getConnection from '../../../connection';
import { planetCollection } from '../../../entities';

import { clear } from '../../../mysql';
import type { Planet } from '../../../types';

beforeEach(clear);

describe('getHook', () => {
  test('get hook can manipulate filter', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      filterSortFields: {
        // id: 'string', // No longer needed as we filter by name
        name: 'string',
      },
      hooks: [
        {
          get: (_collection: Collection, req: Request, _res: Response) => {
            // req.query.id = 'non-existing-id'; // Commented out
            // req.query.name = 'NonExistingPlanetName'; // Test with name
            (req as any).CUSTOM_FILTER_NAME = 'NonExistingPlanetName';
          },
        },
      ],
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app).get('/planets').expect('Content-Type', /json/).expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(0);
  });

  test('transform hook changes entity', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: [
        {
          entityTransform: (_collection: Collection, _req: Request, _res: Response, entity: any): any => {
            return {
              ...entity,
              extra: true,
            };
          },
        },
      ],
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app).get('/planets').expect('Content-Type', /json/).expect(200);

    expect(response.body.data).toBeDefined();
    expect(response.body.data[0].extra).toBe(true);
  });

  test('thrown error with status code is returned', async () => {
    const app: express.Application = express();
    const superSave = await SuperSave.create(getConnection());

    const repository = await superSave.addCollection<Planet>({
      ...planetCollection,
      hooks: [
        {
          get: (_collection: Collection, _req: Request, _res: Response) => {
            throw new HookError('Test message', 401);
          },
        },
      ],
    });
    await repository.create({ name: 'Earth' });
    app.use('/', await superSave.getRouter());

    const response = await supertest(app).get('/planets').expect('Content-Type', /json/).expect(401);

    expect(response.body).toEqual({ message: 'Test message' });
  });
});
