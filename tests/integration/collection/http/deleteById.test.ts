
import supertest from 'supertest';
import express from 'express';
import { Planet } from '../../../types';
import { planetCollection } from '../../../entities';
import { Repository, SuperSave } from '../../../../build';
import getConnection from '../../../connection';
import { clear } from '../../../mysql';

beforeEach(clear);

test('delete using id', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  const planet = await planetRepository.create({ name: 'Earth' });
  app.use('/', await superSave.getRouter());

  await supertest(app)
    .delete(`/planets/${(planet.id as string)}`)
    .expect(204);

  const allPlanets = await planetRepository.getAll();
  expect(allPlanets).toHaveLength(0);
});

test('delete not existing item', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  await superSave.addCollection<Planet>(planetCollection);
  app.use('/', await superSave.getRouter());

  await supertest(app)
    .delete('/planets/foo')
    .expect(204);
});
