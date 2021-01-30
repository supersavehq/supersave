import { Database } from 'sqlite';
import Repository from './Repository';
import Query from './Query';
import { BaseEntity, EntityDefinition } from '../types';
export { Repository, Query, };
declare class EntityManager {
    readonly connection: Database;
    private repositories;
    constructor(connection: Database);
    addEntity<T>(entity: EntityDefinition): Promise<Repository<T>>;
    private getFullEntityName;
    getRepository<T extends BaseEntity>(name: string, namespace?: string): Repository<T>;
    private createTable;
}
export default EntityManager;
