export interface Relation {
  entity: string,
  field: string,
  multiple: boolean,
}

export interface EntityDefinition {
  name: string,
  template: Record<string, unknown>,
  relations: Relation[],
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
