import database from "./database";
import EntityManager from "./database/EntityManager";
import Repository from "./database/EntityManager/Repository";
import { EntityDefinition } from "./database/types";

class SuperSafe {
  private constructor(private em: EntityManager) {

  }

  public static async create(file: string): Promise<SuperSafe> {
    const em = await database(file);

    return new SuperSafe(em);
  }

  public addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
    return this.em.addEntity<T>(entity);
  }

  public getRepository<T>(entityName: string): Repository<T> {
    return this.em.getRepository(entityName);
  }
}

export default SuperSafe;
