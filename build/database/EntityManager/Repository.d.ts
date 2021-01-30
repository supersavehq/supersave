import { Database } from 'sqlite';
import { BaseEntity, EntityDefinition } from '../types';
import Query from './Query';
declare class Repository<T extends BaseEntity> {
    readonly definition: EntityDefinition;
    readonly tableName: string;
    readonly getRepository: (name: string, namespace?: string) => Repository<any>;
    readonly connection: Database;
    private relationFields;
    constructor(definition: EntityDefinition, tableName: string, getRepository: (name: string, namespace?: string) => Repository<any>, connection: Database);
    getById(id: string): Promise<T | null>;
    getByIds(ids: string[]): Promise<T[]>;
    getAll(): Promise<T[]>;
    getOneByQuery(query: Query): Promise<T | null>;
    getByQuery(query: Query): Promise<T[]>;
    deleteUsingId(id: string): Promise<void>;
    create(obj: T): Promise<T>;
    update(obj: T): Promise<T>;
    private queryById;
    private transformQueryResultRows;
    private transformQueryResultRow;
    private fillInRelations;
    private mapRelationToMultiple;
    private simplifyRelations;
    createQuery(): Query;
}
export default Repository;
