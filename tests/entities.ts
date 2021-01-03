import { EntityDefinition, Collection } from '../build';

export const planetEntity: EntityDefinition = {
  name: 'planet',
  template: {
    name: '',
  },
  relations: [],
};

export const planetCollection: Collection = {
  entity: planetEntity,
  name: 'planet',
}

export const moonEntity: EntityDefinition = {
  name: 'moon',
  template: {
    name: '',
  },
  relations: [{
    entity: 'planet',
    field: 'planet',
    multiple: false,
  }],
};

export const moonCollection: Collection = {
  entity: moonEntity,
  name: 'moon',
}
