import supertest from 'supertest';
import express from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';
import { createExpressRoutes } from '../../../../build/express'; // Import the new function
import getConnection from '../../../connection';
import { clear } from '../../../mysql';

beforeEach(clear);

test('only collections with no namespace returns array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  const manager = superSave.getManager(); // Get manager after collection is added
  await createExpressRoutes(app, manager, '/api'); // Use the new function

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
