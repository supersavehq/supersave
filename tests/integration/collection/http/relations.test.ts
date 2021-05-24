import express from 'express';
import supertest from 'supertest';
import { Planet, Moon } from '../../../types';
import { planetCollection, moonCollection } from '../../../entities';
import { SuperSave } from '../../../../build';

test('linking related collections via object', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  await superSave.addCollection<Planet>(moonCollection);
  app.use('/', await superSave.getRouter());

  const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

  const planetResponse = await supertest(app)
    .post('/planets')
    .send(planet)
    .expect(200);
  const { data: createdPlanet } = planetResponse.body;

  const moon: Omit<Moon, 'id'> = { name: 'Europa', planet: createdPlanet };
  const moonResponse = await supertest(app)
    .post('/moons')
    .send(moon)
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: createdMoon } = moonResponse.body;
  expect(createdMoon.planet.name).toBe('Jupiter');

  // test an update
  const otherPlanet: Omit<Planet, 'id'> = { name: 'Saturn' };

  const otherPlanetResponse = await supertest(app)
    .post('/planets')
    .send(otherPlanet)
    .expect(200);
  const { data: createdOtherPlanet } = otherPlanetResponse.body;

  createdMoon.planet = createdOtherPlanet;

  const updatedMoonResponse = await supertest(app)
    .patch(`/moons/${createdMoon.id}`)
    .send({ planet: createdOtherPlanet })
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: updatedMoon } = updatedMoonResponse.body;
  expect(updatedMoon.planet.name).toBe('Saturn');
});

test('linking related collections via object id', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  await superSave.addCollection<Moon>(moonCollection);
  app.use('/', await superSave.getRouter());

  const planet: Omit<Planet, 'id'> = { name: 'Jupiter' };

  const planetResponse = await supertest(app)
    .post('/planets')
    .send(planet)
    .expect(200);
  const { data: createdPlanet } = planetResponse.body;

  const moon: Omit<Moon, 'id'> = { name: 'Europa', planet: createdPlanet.id };
  const moonResponse = await supertest(app)
    .post('/moons')
    .send(moon)
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: createdMoon } = moonResponse.body;
  expect(createdMoon.planet.name).toBe('Jupiter');

  // test an update
  const otherPlanet: Omit<Planet, 'id'> = { name: 'Saturn' };

  const otherPlanetResponse = await supertest(app)
    .post('/planets')
    .send(otherPlanet)
    .expect(200);
  const { data: createdOtherPlanet } = otherPlanetResponse.body;

  createdMoon.planet = createdOtherPlanet;

  const updatedMoonResponse = await supertest(app)
    .patch(`/moons/${createdMoon.id}`)
    .send({ planet: createdOtherPlanet.id })
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: updatedMoon } = updatedMoonResponse.body;
  expect(updatedMoon.planet.name).toBe('Saturn');
});

test('linking related collections via objects', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  await superSave.addCollection<Moon>({
    ...moonCollection,
    relations: [
      {
        name: 'planet',
        field: 'planet',
        multiple: true,
      }
    ]
  });
  app.use('/', await superSave.getRouter());

  const jupiter: Omit<Planet, 'id'> = { name: 'Jupiter' };
  const saturn: Omit<Planet, 'id'> = { name: 'Saturn' };

  const jupiterResponse = await supertest(app)
    .post('/planets')
    .send(jupiter)
    .expect(200);
  const { data: createdJupiter } = jupiterResponse.body;
  const saturnResponse = await supertest(app)
    .post('/planets')
    .send(saturn)
    .expect(200);
  const { data: createdSaturn } = saturnResponse.body;

  const moon: Omit<Moon, 'id'> = { name: 'Europa', planet: [createdJupiter, createdSaturn] };
  const moonResponse = await supertest(app)
    .post('/moons')
    .send(moon)
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: createdMoon } = moonResponse.body;
  expect(createdMoon.planet[0].name).toBe('Jupiter');
  expect(createdMoon.planet[1].name).toBe('Saturn');

  const updatedMoonResponse = await supertest(app)
    .patch(`/moons/${createdMoon.id}`)
    .send({ planet: [saturn] })
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: updatedMoon } = updatedMoonResponse.body;
  expect(updatedMoon.planet.name).toBe('Saturn');
});

test('linking related collections via object ids', async () => {
  const app: express.Application = express();
  const superSave = await SuperSave.create(':memory:');

  await superSave.addCollection<Planet>(planetCollection);
  await superSave.addCollection<Moon>({
    ...moonCollection,
    relations: [
      {
        name: 'planet',
        field: 'planet',
        multiple: true,
      }
    ]
  });
  app.use('/', await superSave.getRouter());

  const jupiter: Omit<Planet, 'id'> = { name: 'Jupiter' };
  const saturn: Omit<Planet, 'id'> = { name: 'Saturn' };

  const jupiterResponse = await supertest(app)
    .post('/planets')
    .send(jupiter)
    .expect(200);
  const { data: createdJupiter } = jupiterResponse.body;
  const saturnResponse = await supertest(app)
    .post('/planets')
    .send(saturn)
    .expect(200);
  const { data: createdSaturn } = saturnResponse.body;

  const moon: Omit<Moon, 'id'> = { name: 'Europa', planet: [createdJupiter.id, createdSaturn.id] };
  const moonResponse = await supertest(app)
    .post('/moons')
    .send(moon)
    .expect('Content-Type', /json/)
    .expect(200);

  const { data: createdMoon } = moonResponse.body;
  expect(createdMoon.planet[0].name).toBe('Jupiter');
  expect(createdMoon.planet[1].name).toBe('Saturn');

  const updatedMoonResponse = await supertest(app)
    .patch(`/moons/${createdMoon.id}`)
    .send({ planet: [createdSaturn.id] })
    .expect('Content-Type', /json/)
    .expect(200);
  const { data: updatedMoon } = updatedMoonResponse.body;
  expect(updatedMoon.planet[0].name).toBe('Saturn');
});
