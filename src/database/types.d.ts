export interface Relation {
  entity: string,
  namespace?: string,
  field: string,
  multiple: boolean,
}

export interface EntityDefinition {
  name: string,
  template: Record<string, unknown>,
  relations: Relation[],
  namespace?: string,
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
