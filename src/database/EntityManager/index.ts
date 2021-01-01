import slug from 'slug';
import { Database } from 'sqlite';
import Repository from './Repository';
import { BaseEntity, EntityDefinition as EntityDefinition } from '../types';

class EntityManager {
    private repositories = new Map<string, Repository<any>>();

    constructor(readonly connection:Database) {}

    public async addEntity<T>(entity: EntityDefinition): Promise<Repository<T>> {
        const tableName = slug(entity.name);
        await this.createTable(tableName);
        this.repositories.set(entity.name, new Repository(entity, tableName, this, this.connection));
        return this.getRepository(entity.name);
    }

    public getRepository<T extends BaseEntity>(name: string): Repository<T>
    {
        const repository = this.repositories.get(name);
        if (typeof repository === 'undefined') {
            throw new Error(`Entity ${name} not defined. (${Array.from(this.repositories.keys()).join(', ')})`);
        }
        return repository;
    }

    private async createTable(tableName: string) {
        await this.connection.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents BLOG NOT NULL)`);
    }
}

export default EntityManager;
