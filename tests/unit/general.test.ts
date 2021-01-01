import { SuperSave, EntityDefinition, Repository, BaseEntity } from '../../build';

let superSave: SuperSave;

beforeAll(async () => {
  superSave = await SuperSave.create(':memory:');
});

interface Planet extends BaseEntity {
  name: string,
}

test('simple entity creation', async () => {

  const planetEntity: EntityDefinition = {
    name: 'planet',
    template: {
      name: '',
    },
    relations: [],
  }

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  const mars: Planet = await planetRepository.create({ name: 'Mars' });

  expect(earth.name).toEqual('Earth');
  expect(mars.name).toEqual('Mars');
});

test('entity with relations', async () => {
  interface Moon extends BaseEntity {
    id?: string,
    name: string,
    planet: Planet,
  }

  const moonEntity: EntityDefinition = {
    name: 'moon',
    template: {
      name: '',
    },
    relations: [{
      entity: 'planet',
      field: 'planet',
      multiple: false,
    }],
  }

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
