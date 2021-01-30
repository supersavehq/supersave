"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Manager {
    constructor() {
        this.collections = new Map();
    }
    getCollectionIdentifier(name, namespace) {
        return namespace ? `${namespace}_${name}` : name;
    }
    addCollection(collection) {
        this.collections.set(this.getCollectionIdentifier(collection.name, collection.namespace), collection);
        return this;
    }
    getCollections() {
        return Array.from(this.collections.values());
    }
}
exports.default = Manager;
