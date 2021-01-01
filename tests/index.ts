import assert from 'assert';
import { SuperSafe, EntityDefinition, Repository, BaseEntity } from '../build';

function check(message: string) {
  console.log('✔️', message);
}

interface Planet extends BaseEntity {
  name: string,
}

interface Moon extends BaseEntity {
  name: string,
  planet: Planet,
}

const main = async () => {
  const superSafe = await SuperSafe.create(':memory:');

  const planetEntity: EntityDefinition = {
    name: 'planet',
    template: {
      name: '',
    },
    relations: [],
  }

  const moonEntity: EntityDefinition = {
    name: 'moon',
    template: {
      name: '',
    },
    relations: [{
      entity: planetEntity.name,
      field: 'planet',
      multiple: false,
    }],
  }


  const planetRepository: Repository<Planet> = await superSafe.addEntity<Planet>(planetEntity);
  const moonRepository: Repository<Moon> = await superSafe.addEntity<Moon>(moonEntity);

  const earth: Planet = await planetRepository.create({ name: 'Earth' });
  const mars: Planet = await planetRepository.create({ name: 'Mars' });

  assert.strictEqual('Earth', earth.name);
  assert.strictEqual('Mars', mars.name);
  check('Create simple entity.');

  const earthMoon: Moon = await moonRepository.create({ name: 'Moon', planet: earth });
  assert.strictEqual('Moon', earthMoon.name);
  assert.strictEqual('Earth', earthMoon.planet.name);
  console.log('✔️ Create entity with relation.');
};

main();
