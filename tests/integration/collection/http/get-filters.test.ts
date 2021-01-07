import supertest from 'supertest';
import express from 'express';
import { Planet } from '../../../types';
import { planetCollection, planetEntity } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';

const appForFilter: () => Promise<express.Application> = async (): Promise<express.Application> => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    entity: {
      ...planetEntity,
      filterSortFields: { name: 'string', distance: 'number', }
    }
  });
  app.use('/', superSave.getRouter());

  await repository.create({ name: 'Mars', distance: 0, });
  await repository.create({ name: 'Earth', distance: 1000, });
  await repository.create({ name: 'Jupiter', distance: 2500, });

  return app;
}

test('filter on equals', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ name: 'Earth' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].name).toBe('Earth');
});

test('filter using gt()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'distance[>]': '0' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(2);
});

test('filter using gte()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'distance[>=]': '0' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(3);
});

test('filter using gte() with express simple query', async () => {
  const app: express.Application = await appForFilter();
  app.set('query parser', 'simple');

  const response = await supertest(app)
    .get('/planets')
    .query({ 'distance[>=]': '0' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(3);
});

test('filter using lt()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'distance[<]': '0' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(0);
});

test('filter using lte()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'distance[<=]': '0' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(1);
});

test('filter using like()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'name[~]': '*art*' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].name).toBe('Earth');
});

test('filter using in()', async () => {
  const app: express.Application = await appForFilter();

  const response = await supertest(app)
    .get('/planets')
    .query({ 'name[in]': 'Earth,Mars' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(2);
});
