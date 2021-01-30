import express from 'express';
import Manager from '../Manager';
import { ManagedCollection } from '../types';
declare class Http {
    private manager;
    private readonly router;
    constructor(manager: Manager);
    register(collection: ManagedCollection<any>): Http;
    getRegisteredCollections(): ManagedCollection[];
    getRouter(): express.Router;
}
export default Http;
