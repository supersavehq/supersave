import { SuperSave, EntityDefinition, Repository, BaseEntity } from '../../build';

test('there is a difference between with and without namespace', async () => {
  const superSave = await SuperSave.create(':memory:');

  interface Planet extends BaseEntity {
    name: string,
  }

  const planetEntity: EntityDefinition = {
    name: 'planet',
    template: {
      name: '',
    },
    relations: [],
  }

  const otherPlanetEntity: EntityDefinition = {
    ...planetEntity,
    namespace: 'other',
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const otherPlanetRepository: Repository<Planet> = await superSave.addEntity<Planet>(otherPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
  const otherResults = await otherPlanetRepository.getAll();
  expect(otherResults).toHaveLength(0);
});

test('there is a difference between different namespaces with same entity', async () => {
  const superSave = await SuperSave.create(':memory:');

  interface Planet extends BaseEntity {
    name: string,
  }

  const planetEntity: EntityDefinition = {
    name: 'planet',
    template: {
      name: '',
    },
    namespace: 'one',
    relations: [],
  }

  const otherPlanetEntity: EntityDefinition = {
    ...planetEntity,
    namespace: 'other',
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const otherPlanetRepository: Repository<Planet> = await superSave.addEntity<Planet>(otherPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
  const otherResults = await otherPlanetRepository.getAll();
  expect(otherResults).toHaveLength(0);
});

test('relations from different namespace', async () => {
  const superSave = await SuperSave.create(':memory:');

  interface Planet extends BaseEntity {
    name: string,
  }
  const planetEntity: EntityDefinition = {
    name: 'planet',
    template: {
      name: '',
    },
    namespace: 'one',
    relations: [],
  }

  interface Moon extends BaseEntity {
    id?: string,
    name: string,
    planet: Planet,
  }

  const moonEntity: EntityDefinition = {
    name: 'moon',
    namespace: 'space',
    template: {
      name: '',
    },
    relations: [{
      entity: planetEntity.name,
      namespace: 'one',
      field: 'planet',
      multiple: false,
    }],
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(moonEntity);
  const earthMoon: Moon = await moonRepository.create({ name: 'Moon', planet: earth });
  expect(earthMoon.id).toBeDefined();
  expect(earthMoon.name).toEqual('Moon');
  expect(earthMoon.planet.name).toEqual('Earth');

  const retrievedMoon = await moonRepository.getById((earthMoon.id as string));
  expect(retrievedMoon).toBeDefined();
  expect((retrievedMoon as Moon).planet).toBeDefined();
});
