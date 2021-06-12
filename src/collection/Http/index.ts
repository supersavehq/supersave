import express from 'express';
import Manager from '../manager';
import { ManagedCollection } from '../types';
import * as actions from './actions';
import { generatePath } from './utils';

class Http {
  public static async create(manager: Manager, prefix: string): Promise<Http> {
    const requiredExpress = await import('express');
    return new Http(
      requiredExpress.Router(),
      manager,
      prefix,
    );
  }

  private constructor(
    private readonly router: express.Router,
    private manager: Manager,
    prefix: string, // excuding the /
  ) {
    this.router.use(express.json());
    this.manager.getCollections().forEach((collection: ManagedCollection) => {
      this.register(collection);
    });
    this.router.get('/', actions.overview(prefix, () => this.getRegisteredCollections()));
  }

  public register(collection: ManagedCollection<any>): Http {
    const path = generatePath(collection);

    this.router.get(path, actions.get(collection));
    this.router.post(path, actions.create(collection));
    this.router.patch(`${path}/:id`, actions.updateById(collection));
    this.router.delete(`${path}/:id`, actions.deleteById(collection));
    this.router.get(`${path}/:id`, actions.getById(collection));
    return this;
  }

  public getRegisteredCollections(): ManagedCollection[] {
    return this.manager.getCollections();
  }

  public getRouter(): express.Router {
    return this.router;
  }
}

export default Http;
