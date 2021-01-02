import { SuperSave, EntityDefinition, Query, FilterSortTypeEnum } from '../../build';
import { planetEntity } from './entities';
import { Planet } from './types';

test('additional filter/sort fields can be defined', async() => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: FilterSortTypeEnum.STRING,
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
      name: FilterSortTypeEnum.STRING,
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

test('results are filtered and sorted', async () => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: FilterSortTypeEnum.STRING,
    }
  }

  const superSave: SuperSave = await SuperSave.create(':memory:');
  const planetRepository = await superSave.addEntity<Planet>(filteredPlanetEntity);

  await planetRepository.create({ name: 'Mars' });
  await planetRepository.create({ name: 'Earth' });

  const earthQuery: Query = planetRepository.createQuery();
  earthQuery.eq('name', 'Earth').limit(1);
  earthQuery.sort('name');

  const earthResult = await planetRepository.getOneByQuery(earthQuery);
  expect(earthResult).toBeDefined();
  expect((earthResult as Planet).name).toBe('Earth');

  const marsQuery: Query = planetRepository.createQuery();
  marsQuery.eq('name', 'Mars').limit(1);
  marsQuery.sort('name');

  const marsResult = await planetRepository.getOneByQuery(marsQuery);
  expect(marsResult).toBeDefined();
  expect((marsResult as Planet).name).toBe('Mars');
});

test('results are filtered and sorted', async () => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: FilterSortTypeEnum.STRING,
    }
  }

  const superSave: SuperSave = await SuperSave.create(':memory:');
  const planetRepository = await superSave.addEntity<Planet>(filteredPlanetEntity);

  await planetRepository.create({ name: 'Mars' });
  await planetRepository.create({ name: 'Earth' });

  const ascQuery: Query = planetRepository.createQuery();
  ascQuery.sort('name');

  const ascResult = await planetRepository.getByQuery(ascQuery);
  expect(ascResult).toHaveLength(2);
  expect((ascResult[0] as Planet).name).toBe('Earth');

  const descQuery: Query = planetRepository.createQuery();
  descQuery.sort('name', 'desc');

  const descResult = await planetRepository.getByQuery(descQuery);
  expect(descResult).toHaveLength(2);
  expect((descResult[0] as Planet).name).toBe('Mars');
});

test('results are properly limited', async () => {
  const filteredPlanetEntity: EntityDefinition = {
    ...planetEntity,
    filterSortFields: {
      name: FilterSortTypeEnum.STRING,
    }
  }

  const superSave: SuperSave = await SuperSave.create(':memory:');
  const planetRepository = await superSave.addEntity<Planet>(filteredPlanetEntity);

  await planetRepository.create({ name: 'Mars' });
  await planetRepository.create({ name: 'Earth' });

  const limitQuery: Query = planetRepository.createQuery();
  limitQuery.sort('name').limit(1);

  const limitResult = await planetRepository.getByQuery(limitQuery);
  expect(limitResult).toHaveLength(1);
  expect((limitResult[0] as Planet).name).toBe('Earth');

  const offsetQuery: Query = planetRepository.createQuery();
  offsetQuery.sort('name', 'desc').limit(1).offset(1);

  const offsetResult = await planetRepository.getByQuery(offsetQuery);
  expect(offsetResult).toHaveLength(1);
  expect((offsetResult[0] as Planet).name).toBe('Earth');
});
