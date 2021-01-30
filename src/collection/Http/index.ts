import express from 'express';
import bodyParser from 'body-parser';
import Manager from '../Manager';
import { ManagedCollection } from '../types';
import * as actions from './actions';
import { generatePath } from './utils';

class Http {
  private readonly router: express.Router;

  constructor(
    private manager: Manager,
  ) {
    this.router = express.Router();
    this.router.use(bodyParser.json());
    this.manager.getCollections().forEach((collection: ManagedCollection) => {
      this.register(collection);
    });
    this.router.get('/', actions.overview(() => this.getRegisteredCollections()));
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
