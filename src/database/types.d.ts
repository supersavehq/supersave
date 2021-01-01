export interface Relation {
    entity: string,
    field: string,
    multiple: boolean,
}

export interface EntityDefinition {
    name: string,
    template: object,
    relations: Relation[],
}

export interface BaseEntity {
    id?: string
}

export interface EntityRow {
    id: string,
    contents: string,
    [key: string]: any,
}
