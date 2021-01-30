"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = exports.Repository = void 0;
const slug_1 = __importDefault(require("slug"));
const Repository_1 = __importDefault(require("./Repository"));
exports.Repository = Repository_1.default;
const Query_1 = __importDefault(require("./Query"));
exports.Query = Query_1.default;
const sync_1 = __importDefault(require("./sync"));
class EntityManager {
    constructor(connection) {
        this.connection = connection;
        this.repositories = new Map();
    }
    async addEntity(entity) {
        const { filterSortFields = {} } = entity;
        filterSortFields.id = 'string';
        const updatedEntity = {
            ...entity,
            filterSortFields,
        };
        const fullEntityName = this.getFullEntityName(entity.name, entity.namespace);
        const tableName = slug_1.default(fullEntityName);
        await this.createTable(tableName);
        const repository = new Repository_1.default(updatedEntity, tableName, (name, namespace) => this.getRepository(name, namespace), this.connection);
        await sync_1.default(updatedEntity, tableName, this.connection, repository, (name, namespace) => this.getRepository(name, namespace));
        this.repositories.set(fullEntityName, repository);
        return this.getRepository(entity.name, entity.namespace);
    }
    getFullEntityName(name, namespace) {
        return typeof namespace !== 'undefined' ? `${namespace}_${name}` : name;
    }
    getRepository(name, namespace) {
        const fullEntityName = this.getFullEntityName(name, namespace);
        const repository = this.repositories.get(fullEntityName);
        if (typeof repository === 'undefined') {
            throw new Error(`Entity ${fullEntityName} not defined. Existing are: (${Array.from(this.repositories.keys()).join(', ')})`);
        }
        return repository;
    }
    async createTable(tableName) {
        await this.connection.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (id TEXT PRIMARY KEY , contents TEXT NOT NULL)`);
    }
}
exports.default = EntityManager;
