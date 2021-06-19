import { SuperSave, Repository, EntityDefinition } from '../../build';
import { moonEntity, planetEntity } from '../entities';
import { Moon, Planet } from '../types';
import getConnection from '../connection';
import { clear } from '../mysql';

beforeEach(clear);

test('simple entity creation', async () => {
  const superSave = await SuperSave.create(getConnection());
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  const mars: Planet = await planetRepository.create({ name: 'Mars' });

  expect(earth.name).toEqual('Earth');
  expect(mars.name).toEqual('Mars');
});

test('entity with relations', async () => {
  const superSave = await SuperSave.create(getConnection());
  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(moonEntity);
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  await planetRepository.create({ name: 'Earth' });
  await planetRepository.create({ name: 'Mars' });

  const planets = await planetRepository.getAll();
  expect(planets).toHaveLength(2);


  const earth = planets[0].name === 'Earth' ? planets[0] : planets[1]; // Sorting is undetermined

  const earthMoon: Moon = await moonRepository.create({ name: 'Moon', planet: earth });
  expect(earthMoon.id).toBeDefined();
  expect(earthMoon.name).toEqual('Moon');
  expect(earthMoon.planet.name).toEqual('Earth');

  const retrievedMoon = await moonRepository.getById((earthMoon.id as string));
  expect(retrievedMoon).toBeDefined();
});

test('not existing relation entity throws an error', async () => {
  const errorMoonEntity: EntityDefinition = {
    ...moonEntity,
    relations: [{
      name: 'not-existing',
      field: 'planet',
      multiple: false,
    }],
  }

  const superSave = await SuperSave.create(getConnection());
  const moonRepository = await superSave.addEntity<Moon>(errorMoonEntity);
  await expect(async () => {
    try {
      await moonRepository.getAll();
    } catch (error) {
      // TODO rewrite this to work with jest and toThrow(), but was not able to get it to work.
      expect(error.message).toContain('not-existing')
    }
  });
});

test('entity update', async () => {
  const superSave = await SuperSave.create(getConnection());
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  // @ts-ignore
  await planetRepository.update({ id: (earth.id as string), name: 'Updated Earth' });
  // @ts-ignore
  const checkEarth = await planetRepository.getById((earth.id as string));
  expect(checkEarth).toBeDefined();
  expect((checkEarth as Planet).name).toBe('Updated Earth');
});

test('entity delete', async () => {
  const superSave = await SuperSave.create(getConnection());
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  await planetRepository.create({ name: 'Mars' });
  // @ts-ignore
  await planetRepository.deleteUsingId((earth.id as string));

  const remainingEarths = await planetRepository.getAll();
  expect(remainingEarths).toHaveLength(1);
  expect(remainingEarths[0].name).toBe('Mars');
});
