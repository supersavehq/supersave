import { beforeEach, expect, test } from 'vitest';
import type { EntityDefinition, Repository } from '../../src';
import { SuperSave } from '../../src';
import getConnection from '../connection';
import { moonEntity, planetEntity } from '../entities';
import { clear } from '../mysql';
import type { Moon, Planet } from '../types';

beforeEach(clear);

test('there is a difference between with and without namespace', async () => {
  const superSave = await SuperSave.create(getConnection());

  const otherPlanetEntity: EntityDefinition = {
    ...planetEntity,
    namespace: 'other',
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const otherPlanetRepository: Repository<Planet> = await superSave.addEntity<Planet>(otherPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
  const otherResults = await otherPlanetRepository.getAll();
  expect(otherResults).toHaveLength(0);
  await superSave.close();
});

test('there is a difference between different namespaces with same entity', async () => {
  const superSave = await SuperSave.create(getConnection());

  const namespacedPlanetEntity: EntityDefinition = {
    ...planetEntity,
    namespace: 'one',
  }

  const otherPlanetEntity: EntityDefinition = {
    ...namespacedPlanetEntity,
    namespace: 'other',
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const otherPlanetRepository: Repository<Planet> = await superSave.addEntity<Planet>(otherPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
  const otherResults = await otherPlanetRepository.getAll();
  expect(otherResults).toHaveLength(0);
  await superSave.close();
});

test('relations from different namespace', async () => {
  const superSave = await SuperSave.create(getConnection());

  const namespacedPlanetEntity: EntityDefinition = {
    ...planetEntity,
    namespace: 'one',
  };

  const namespacedMoonEntity: EntityDefinition = {
    ...moonEntity,
    namespace: 'space',
    relations: [{
      name: namespacedPlanetEntity.name,
      namespace: 'one',
      field: 'planet',
      multiple: false,
    }],
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(namespacedPlanetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(namespacedMoonEntity);
  const earthMoon: Moon = await moonRepository.create({ name: 'Moon', planet: earth });
  expect(earthMoon.id).toBeDefined();
  expect(earthMoon.name).toEqual('Moon');
  expect(earthMoon.planet.name).toEqual('Earth');

  const retrievedMoon = await moonRepository.getById((earthMoon.id ));
  expect(retrievedMoon).toBeDefined();
  expect((retrievedMoon as Moon).planet).toBeDefined();
  await superSave.close();
});
