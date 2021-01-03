
import supertest from 'supertest';
import express from 'express';
import { Planet, Moon } from '../../../types';
import { planetCollection, moonCollection, planetEntity } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';

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

test('collection items are returned', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  const repository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  app.use('/', superSave.getRouter());

  await repository.create({ name: 'Earth' });
  const response = await supertest(app)
    .get('/planets')
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].name).toBe('Earth');
});

describe('collection items are sorted when requested', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    entity: {
      ...planetEntity,
      filterSortFields: { name: 'string' }
    }
  });
  app.use('/', superSave.getRouter());

  await repository.create({ name: 'Mars' });
  await repository.create({ name: 'Earth' });

  test('ascending', async () => {

    const response = await supertest(app)
      .get('/planets')
      .query({ sort: 'name' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].name).toBe('Earth');
  });

  test('descending', async () => {

    const response = await supertest(app)
      .get('/planets')
      .query({ sort: '-name' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].name).toBe('Mars');
  });
});