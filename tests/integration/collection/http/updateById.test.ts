import supertest from 'supertest';
import express from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';

test('only collections with no namespace returns array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  app.use('/api', superSave.getRouter());

  const planet: Planet = { name: 'Jupiter' };
  const savedPlanet: Planet = await planetRepository.create(planet);

  const response = await supertest(app)
    .patch(`/api/planets/${savedPlanet.id}`)
    .send({ name: 'Jupiter 2'})
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(typeof response.body.data).toBe('object');
  expect(response.body.data.name).toBe('Jupiter 2');

  const checkPlanet: Planet = await planetRepository.getById(savedPlanet.id);
  expect(checkPlanet.name).toBe('Jupiter 2');
});

// TODO test updating with relation
