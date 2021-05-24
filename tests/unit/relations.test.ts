import { planetEntity, moonEntity } from '../entities';
import { SuperSave, Repository } from '../../build';
import { Moon, Planet } from '../types';

test('linking entities via object', async () => {
  const superSave = await SuperSave.create(':memory:');

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(moonEntity);
  await moonRepository.create({ name: 'Moon', planet: earth });

  const moons = await moonRepository.getAll();
  expect(moons).toHaveLength(1);
  expect(moons[0]).toBeDefined();
  expect(moons[0].planet.name).toBe('Earth');

  // test updating an entity
  const mars = await planetRepository.create({ name: 'Mars' });
  const moon: Moon = moons[0];
  moon.planet = mars;
  moonRepository.update(moon);
  const updatedMoons = await moonRepository.getAll();
  expect(updatedMoons).toHaveLength(1);
  expect(updatedMoons[0]).toBeDefined();
  expect(updatedMoons[0].planet.name).toBe('Mars');
});

test('linking entities via id', async () => {
  const superSave = await SuperSave.create(':memory:');

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>(moonEntity);
  await moonRepository.create({ name: 'Moon', planet: earth.id });

  const moons = await moonRepository.getAll();
  expect(moons).toHaveLength(1);
  expect(moons[0]).toBeDefined();
  expect(moons[0].planet.name).toBe('Earth');

  // Test updating an entity
  const mars = await planetRepository.create({ name: 'Mars' });
  const moon: Moon = moons[0];
  // @ts-expect-error
  moon.planet = mars.id;
  moonRepository.update(moon);
  const updatedMoons = await moonRepository.getAll();
  expect(updatedMoons).toHaveLength(1);
  expect(updatedMoons[0]).toBeDefined();
  expect(updatedMoons[0].planet.name).toBe('Mars');
});

test('linking multiple entities via objects', async () => {
  const superSave = await SuperSave.create(':memory:');

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });
  const mars = await planetRepository.create({ name: 'Mars' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>({
    ...moonEntity,
    relations: [
      {
        name: 'planet',
        field: 'planet',
        multiple: true,
      }
    ]
  });
  await moonRepository.create({ name: 'Moon', planet: [earth, mars] });

  const moons = await moonRepository.getAll();
  expect(moons).toHaveLength(1);
  expect(moons[0]).toBeDefined();
  expect(moons[0].planet).toHaveLength(2);
  expect(moons[0].planet[0].name).toBe('Earth');
  expect(moons[0].planet[1].name).toBe('Mars');

  // Test an update
  const moon: Moon = moons[0];
  // @ts-expect-error
  moon.planet = [mars];
  await moonRepository.update(moon);

  const updatedMoons = await moonRepository.getAll();
  expect(updatedMoons).toHaveLength(1);
  expect(updatedMoons[0]).toBeDefined();
  expect(updatedMoons[0].planet).toHaveLength(1);
  expect(updatedMoons[0].planet[0].name).toBe('Mars');
});

test('linking multiple entities via ids', async () => {
  const superSave = await SuperSave.create(':memory:');

  const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity);
  const earth = await planetRepository.create({ name: 'Earth' });
  const mars = await planetRepository.create({ name: 'Mars' });

  const moonRepository: Repository<Moon> = await superSave.addEntity<Moon>({
    ...moonEntity,
    relations: [
      {
        name: 'planet',
        field: 'planet',
        multiple: true,
      }
    ]
  });
  await moonRepository.create({ name: 'Moon', planet: [earth.id, mars.id] });

  const moons = await moonRepository.getAll();
  expect(moons).toHaveLength(1);
  expect(moons[0]).toBeDefined();
  expect(moons[0].planet).toHaveLength(2);
  expect(moons[0].planet[0].name).toBe('Earth');
  expect(moons[0].planet[1].name).toBe('Mars');

  const moon: Moon = moons[0];
  // @ts-expect-error
  moon.planet = [mars.id];
  moonRepository.update(moon);
  const updatedMoons = await moonRepository.getAll();

  expect(updatedMoons).toHaveLength(1);
  expect(updatedMoons[0].planet).toHaveLength(1);
  expect(updatedMoons[0].planet[0].name).toBe('Mars');
});
