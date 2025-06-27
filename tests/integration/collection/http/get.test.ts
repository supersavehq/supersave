import supertest from 'supertest';
import express from 'express';
import { Planet, Moon } from '../../../types';
import { planetCollection, moonCollection } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';
import { createExpressRoutes } from '../../../../build/express';
import getConnection from '../../../connection';

import { clear } from '../../../mysql';

beforeEach(clear);

test('empty collection returns empty array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>(planetCollection);
  await superSave.addCollection<Moon>(moonCollection); // Add collections first
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/'); // Then setup routes

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
  const superSave = await SuperSave.create(getConnection());

  const repository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

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

test('collection items are sorted when requested: ascending', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    filterSortFields: { name: 'string' },
  });
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

  await repository.create({ name: 'Mars' });
  await repository.create({ name: 'Earth' });

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

test('collection items are sorted when requested: descending', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    filterSortFields: { name: 'string' },
  });
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

  await repository.create({ name: 'Mars' });
  await repository.create({ name: 'Earth' });

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

test('undefined sort fields are not accepted.', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>({
    ...planetCollection,
    filterSortFields: { name: 'string' }
  });
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

  await supertest(app)
    .get('/planets')
    .query({ sort: 'foobar' })
    .expect(400)
    .expect('Content-Type', /json/);
});

test('offset is honored', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    filterSortFields: { name: 'string' }
  });
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

  await repository.create({ name: 'Mars' });
  await repository.create({ name: 'Earth' });
  await repository.create({ name: 'Venus' });

  const response = await supertest(app)
    .get('/planets')
    .query({ offset: 1, sort: 'name' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(2);
  expect(response.body.data[0].name).toBe('Mars');
  expect(response.body.meta.offset).toBe(1);
  await superSave.close();
});

test('limit is honored', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const repository: Repository<Planet> = await superSave.addCollection<Planet>({
    ...planetCollection,
    filterSortFields: { name: 'string' }
  });
  const manager = superSave.getManager();
  await createExpressRoutes(app, manager, '/');

  await repository.create({ name: 'Mars' });
  await repository.create({ name: 'Earth' });

  const response = await supertest(app)
    .get('/planets')
    .query({ limit: 1, sort: 'name' })
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(Array.isArray(response.body.data)).toBe(true);
  expect(response.body.data).toHaveLength(1);
  expect(response.body.data[0].name).toBe('Earth');
  expect(response.body.meta.limit).toBe(1);
  await superSave.close();
});
