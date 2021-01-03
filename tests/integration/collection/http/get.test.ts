
import supertest from 'supertest';
import express from 'express';
import { Planet, Moon } from '../../../types';
import { planetCollection, moonCollection } from '../../../entities';
import { SuperSave } from '../../../../build';

test('empty collection returns empty array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  app.use('/', superSave.getRouter());
  await superSave.addCollection<Moon>(moonCollection);

  const response = await supertest(app)
    .get('/planets')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(0);
});
