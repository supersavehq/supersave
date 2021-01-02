export {
  Repository,
  Query
}

export interface Relation {
  entity: string,
  namespace?: string,
  field: string,
  multiple: boolean,
}

export const enum FilterSortTypeEnum {
  STRING = 'string',
  NUMBER = 'number',
}

export interface EntityDefinition {
  name: string,
  template: Record<string, unknown>,
  relations: Relation[],
  namespace?: string,
  filterSortFields?: {[key: string]: FilterSortTypeEnum}
}

export interface BaseEntity {
  id?: string,
  [key: string]: any,
}
export interface EntityRow {
  id: string,
  contents: string,
  [key: string]: any,
}

export const enum QueryOperatorEnum {
  EQUALS = '=',
}

export type QueryFilter = {
  operator: QueryOperatorEnum,
  field: string,
  value: QueryFilterValue,
};

export type QueryFilterValue = string|number|any;
