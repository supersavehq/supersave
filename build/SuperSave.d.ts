import express from 'express';
import { Collection } from './collection/types';
import Repository from './database/EntityManager/Repository';
import { EntityDefinition } from './database/types';
declare class SuperSave {
    private em;
    private collectionManager;
    private collectionHttp?;
    private constructor();
    static create(file: string): Promise<SuperSave>;
    addEntity<T>(entity: EntityDefinition): Promise<Repository<T>>;
    addCollection<T>(collection: Collection): Promise<Repository<T>>;
    getRepository<T>(entityName: string, namespace?: string): Repository<T>;
    getRouter(): express.Router;
}
export default SuperSave;
