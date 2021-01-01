import database from './database';
import EntityManager from './database/EntityManager';
import Repository from './database/EntityManager/Repository';
import { EntityDefinition } from './database/types';

class SuperSave {
  private constructor(private em: EntityManager) {

  }

  public static async create(file: string): Promise<SuperSave> {
    const em = await database(file);

    return new SuperSave(em);
  }

  public addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    return this.em.addEntity<T>(entity);
  }

  public getRepository<T>(entityName: string, namespace?: string): Repository<T> {
    return this.em.getRepository(entityName, namespace);
  }
}

export default SuperSave;
