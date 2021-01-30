"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./database"));
const Manager_1 = __importDefault(require("./collection/Manager"));
const Http_1 = __importDefault(require("./collection/Http"));
class SuperSave {
    constructor(em) {
        this.em = em;
        this.collectionManager = new Manager_1.default();
    }
    static async create(file) {
        const em = await database_1.default(file);
        return new SuperSave(em);
    }
    addEntity(entity) {
        return this.em.addEntity(entity);
    }
    async addCollection(collection) {
        const { filterSortFields = {} } = collection.entity;
        filterSortFields.id = 'string';
        const updatedCollection = {
            ...collection,
            entity: {
                ...collection.entity,
                filterSortFields,
            },
        };
        const repository = await this.addEntity(updatedCollection.entity);
        const managedCollection = { ...updatedCollection, repository };
        this.collectionManager.addCollection(managedCollection);
        if (typeof this.collectionHttp !== 'undefined') {
            this.collectionHttp.register(managedCollection);
        }
        return repository;
    }
    getRepository(entityName, namespace) {
        return this.em.getRepository(entityName, namespace);
    }
    getRouter() {
        this.collectionHttp = new Http_1.default(this.collectionManager);
        return this.collectionHttp.getRouter();
    }
}
exports.default = SuperSave;
