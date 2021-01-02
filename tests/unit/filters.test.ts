import { SuperSave, EntityDefinition, Query } from '../../build';
import { planetEntity } from './entities';
import { Planet } from './types';

test('additional filter/sort fields can be defined', async() => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: 'string',
    }
  }

  const superSave: SuperSave = await SuperSave.create(':memory:');
  const planetRepository = await superSave.addEntity<Planet>(filteredPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
});

test('data can be queried using a filter', async() => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: 'string',
    }
  }

  const superSave: SuperSave = await SuperSave.create(':memory:');
  const planetRepository = await superSave.addEntity<Planet>(filteredPlanetEntity);

  await planetRepository.create({ name: 'Earth' });
  const query: Query = planetRepository.createQuery();
  query.eq('name', 'Earth');

  const filteredResult = await planetRepository.getOneByQuery(query);
  expect(filteredResult).toBeDefined();
  expect((filteredResult as Planet).name).toBe('Earth');
});
