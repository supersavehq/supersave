import supertest from 'supertest';
import express from 'express';
import { Planet, Moon } from '../../../types';
import { planetCollection, moonCollection } from '../../../entities';
import { SuperSave } from '../../../../build';

test('only collections with no namespace returns array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  app.use('/', await superSave.getRouter());
  await superSave.addCollection<Moon>(moonCollection);

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body[0].name).toBe(planetCollection.name);
  expect(response.body[1].name).toBe(moonCollection.name);
});

test('collections with namespace', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>({...planetCollection, namespace: 'space'});
  app.use('/',await superSave.getRouter());
  await superSave.addCollection<Moon>({...moonCollection, namespace: 'space'});

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body['/space']).toBeDefined();
  expect(Array.isArray(response.body['/space'])).toBe(true);
  expect(response.body['/space'][0].name).toBe(planetCollection.name);
  expect(response.body['/space'][1].name).toBe(moonCollection.name);
});

test('additional collection properties are returned', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>({ ...planetCollection, additionalProperties: { foo: 'bar' }});
  app.use('/', await superSave.getRouter());
  await superSave.addCollection<Moon>(moonCollection);

  const response = await supertest(app)
    .get('/')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body[0].name).toBe(planetCollection.name);
  expect(response.body[0].foo).toBeDefined();
  expect(response.body[0].foo).toBe('bar');
});
