import { ManagedCollection } from '../types';
declare class Manager {
    private collections;
    constructor();
    private getCollectionIdentifier;
    addCollection<T>(collection: ManagedCollection<T>): Manager;
    getCollections(): ManagedCollection<any>[];
}
export default Manager;
