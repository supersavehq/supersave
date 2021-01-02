import { EntityDefinition } from '../../build';

export const planetEntity: EntityDefinition = {
  name: 'planet',
  template: {
    name: '',
  },
  relations: [],
};

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
