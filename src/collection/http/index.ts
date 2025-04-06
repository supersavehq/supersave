import type { Express, Router } from 'express';
import * as actions from './actions';
import { generatePath } from './utils';
import type Manager from '../manager';
import type { ManagedCollection } from '../types';

class Http {
  public static async create(manager: Manager, prefix: string): Promise<Http> {
    const requiredExpress = await import('express');
    // @ts-expect-error Don't what kind of typing we need to give this, this is to keep express an optional dependency.
    return new Http(requiredExpress, requiredExpress.Router(), manager, prefix);
  }

  private constructor(
    private readonly express: Express,
    private readonly router: Router,
    private manager: Manager,
    prefix: string // excuding the /
  ) {
    // @ts-expect-error Don't know what kind of typing we need to give the express type import to make this work
    this.router.use(this.express.json());
    this.manager.getCollections().forEach((collection: ManagedCollection) => {
      this.register(collection);
    });
    this.router.get(
      '/',
      actions.overview(prefix, () => this.getRegisteredCollections())
    );
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

  public getRouter(): Router {
    return this.router;
  }
}

export default Http;
