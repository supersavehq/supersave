import express from 'express';
import supertest from 'supertest';
import { beforeEach, expect, test } from 'vitest';
import { SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { moonCollection, planetCollection } from '../../../entities';
import { clear } from '../../../mysql';
import type { Moon, Planet } from '../../../types';

beforeEach(clear);

test('only collections with no namespace returns array', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>(planetCollection);
  app.use('/', await superSave.getRouter());
  await superSave.addCollection<Moon>(moonCollection);

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data[0].name).toBe(planetCollection.name);
  expect(response.body.data[1].name).toBe(moonCollection.name);
  await superSave.close();
});

test('collections with namespace', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>({
    ...planetCollection,
    namespace: 'space',
  });
  app.use('/', await superSave.getRouter());
  await superSave.addCollection<Moon>({
    ...moonCollection,
    namespace: 'space',
  });

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data['/space']).toBeDefined();
  expect(Array.isArray(response.body.data['/space'])).toBe(true);
  expect(response.body.data['/space'][0].name).toBe(planetCollection.name);
  expect(response.body.data['/space'][1].name).toBe(moonCollection.name);
  await superSave.close();
});

test('additional collection properties are returned', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>({
    ...planetCollection,
    additionalProperties: { foo: 'bar' },
  });
  app.use('/', await superSave.getRouter());
  await superSave.addCollection<Moon>(moonCollection);

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data[0].name).toBe(planetCollection.name);
  expect(response.body.data[0].foo).toBeDefined();
  expect(response.body.data[0].foo).toBe('bar');
  await superSave.close();
});
