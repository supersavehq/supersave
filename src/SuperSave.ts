import express from 'express';
import { Collection } from './collection/types';
import database from './database';
import EntityManager from './database/EntityManager';
import Repository from './database/EntityManager/Repository';
import { EntityDefinition } from './database/types';
import CollectionManager from './collection/Manager';
import CollectionHttp from './collection/Http';

class SuperSave {
  private collectionManager: CollectionManager;

  private collectionHttp?: CollectionHttp;

  private constructor(private em: EntityManager) {
    this.collectionManager = new CollectionManager(
    );
  }

  public static async create(file: string): Promise<SuperSave> {
    const em = await database(file);

    return new SuperSave(em);
  }

  public addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    return this.em.addEntity<T>(entity);
  }

  public async addCollection<T>(collection: Collection): Promise<Repository<T>> {
    const { filterSortFields = {} } = collection.entity;
    filterSortFields.id = 'string';

    const updatedCollection: Collection = {
      ...collection,
      entity: {
        ...collection.entity,
        filterSortFields,
      },
    };

    const repository: Repository<T> = await this.addEntity(updatedCollection.entity);
    const managedCollection = { ...updatedCollection, repository };
    this.collectionManager.addCollection(managedCollection);
    if (typeof this.collectionHttp !== 'undefined') {
      this.collectionHttp.register(managedCollection);
    }
    return repository;
  }

  public getRepository<T>(entityName: string, namespace?: string): Repository<T> {
    return this.em.getRepository(entityName, namespace);
  }

  public getRouter(): express.Router {
    this.collectionHttp = new CollectionHttp(this.collectionManager);
    return this.collectionHttp.getRouter();
  }
}

export default SuperSave;
