import express from 'express';
import { Collection } from './collection/types';
import database from './database';
import { EntityManager } from './database/entity-manager';
import Repository from './database/entity-manager/repository';
import { EntityDefinition } from './database/types';
import CollectionManager from './collection/manager';
import CollectionHttp from './collection/http';

class SuperSave {
  private collectionManager: CollectionManager;

  private collectionHttp?: CollectionHttp;

  private constructor(private em: EntityManager) {
    this.collectionManager = new CollectionManager(
    );
  }

  public static async create(connectionString: string): Promise<SuperSave> {
    const em = await database(connectionString);

    return new SuperSave(em);
  }

  public addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    return this.em.addEntity<T>(entity);
  }

  public async addCollection<T>(collection: Collection): Promise<Repository<T>> {
    const { filterSortFields = {} } = collection;
    filterSortFields.id = 'string';

    const updatedCollection: Collection = {
      ...collection,
      filterSortFields,
    };

    const repository: Repository<T> = await this.addEntity({
      name: updatedCollection.name,
      namespace: updatedCollection.namespace,
      template: updatedCollection.template,
      relations: updatedCollection.relations,
      filterSortFields: updatedCollection.filterSortFields,
    });
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

  public async getRouter(prefix = '/'): Promise<express.Router> {
    const prefixWithoutSlash = prefix.charAt(prefix.length - 1) === '/' ? prefix.substr(0, prefix.length - 2) : prefix;
    this.collectionHttp = await CollectionHttp.create(this.collectionManager, prefixWithoutSlash);
    return this.collectionHttp.getRouter();
  }

  public close(): Promise<void> {
    return this.em.close();
  }
}

export default SuperSave;