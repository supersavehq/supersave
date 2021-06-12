
import supertest from 'supertest';
import express from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';

test('Existing id returns object', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create('sqlite://:memory:');

  const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  const planet = await planetRepository.create({ name: 'Earth' });
  app.use('/', await superSave.getRouter());

  const response = await supertest(app)
    .get(`/planets/${(planet.id as string)}`)
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toEqual(planet);
});
