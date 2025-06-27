import { beforeEach, expect, test } from 'vitest';
import express from 'express';
import supertest from 'supertest';
import type { Repository} from '../../../../src';
import { SuperSave } from '../../../../src';
import getConnection from '../../../connection';
import { planetCollection } from '../../../entities';
import { clear } from '../../../mysql';
import type { Planet } from '../../../types';

beforeEach(clear);

test('only collections with no namespace returns array', async() => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(getConnection());

  const planetRepository: Repository<Planet> = await superSave.addCollection<Planet>(planetCollection);
  app.use('/api', await superSave.getRouter());

  const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };
  const savedPlanet: Planet = await planetRepository.create(planet);

  const response = await supertest(app)
    .patch(`/api/planets/${savedPlanet.id}`)
    .send({ name: 'Jupiter 2'})
    .expect('Content-Type', /json/)
    .expect(200);

  expect(response.body.data).toBeDefined();
  expect(typeof response.body.data).toBe('object');
  expect(response.body.data.name).toBe('Jupiter 2');

  const checkPlanet: Planet|null = await planetRepository.getById(savedPlanet.id);
  expect(checkPlanet).not.toBeNull();
  expect((checkPlanet as Planet).name).toBe('Jupiter 2');
});

// TODO test updating with relation
