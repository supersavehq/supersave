import express from 'express';
import supertest from 'supertest';
import { type Repository, SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { planetCollection } from '../../../entities';
import { clear } from '../../../mysql';
import type { Planet } from '../../../types';

beforeEach(clear);

test('only collections with no namespace returns array', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const planetRepository: Repository<Planet> =
    await superSave.addCollection<Planet>(planetCollection);
  app.use('/api', await superSave.getRouter());

  const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

  const response = await supertest(app)
    .post('/api/planets')
    .send(planet)
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(typeof response.body.data).toBe('object');
  expect(response.body.data.name).toBe(planet.name);

  const planets = await planetRepository.getAll();
  expect(planets).toHaveLength(1);
  expect(planets[0].name).toBe(planet.name);
  await superSave.close();
});

// TODO test creating with relations
