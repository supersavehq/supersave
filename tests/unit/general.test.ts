import { SuperSave, Repository } from '../../build';
import { moonEntity, planetEntity } from '../entities';
import { Moon, Planet } from '../types';

let superSave: SuperSave;

beforeAll(async () => {
  superSave = await SuperSave.create(':memory:');
});

test('simple entity creation', async () => {

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  const mars: Planet = await planetRepository.create({ name: 'Mars' });

  expect(earth.name).toEqual('Earth');
  expect(mars.name).toEqual('Mars');
});

test('entity with relations', async () => {

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(moonEntity);
  const planetRepository: Repository<Planet> = await superSave.getRepository('planet');
  const planets = await planetRepository.getAll();
  expect(planets).toHaveLength(2);

  const earthMoon: Moon = await moonRepository.create({ name: 'Moon', planet: planets[0] });
  expect(earthMoon.id).toBeDefined();
  expect(earthMoon.name).toEqual('Moon');
  expect(earthMoon.planet.name).toEqual('Earth');

  const retrievedMoon = await moonRepository.getById((earthMoon.id as string));
  expect(retrievedMoon).toBeDefined();
});

test('not existing relation entity throws an error', async () => {
  const errorMoonEntity = {
    ...moonEntity,
    relations: [{
      entity: 'not-existing',
      field: 'planet',
      multiple: false,
    }],
  }

  const moonRepository = await superSave.addEntity<Moon>(errorMoonEntity);
  await expect(async () => {
    try {
      await moonRepository.getAll();
    } catch (error) {
      // TODO rewrite this to work with jest and toThrow(), but was not able to
      expect(false).toBe(true);
      expect(error.message).toContain('not-existing')
    }
  });
});

test('entity update', async () => {
  const superSave = await SuperSave.create(':memory:');
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  await planetRepository.update({ id: (earth.id as string), name: 'Updated Earth' });

  const checkEarth = await planetRepository.getById((earth.id as string));
  expect(checkEarth).toBeDefined();
  expect((checkEarth as Planet).name).toBe('Updated Earth');
});

test('entity delete', async () => {
  const superSave = await SuperSave.create(':memory:');
  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  await planetRepository.create({ name: 'Mars' });
  await planetRepository.deleteUsingId((earth.id as string));

  const remainingEarths = await planetRepository.getAll();
  expect(remainingEarths).toHaveLength(1);
  expect(remainingEarths[0].name).toBe('Mars');
});
