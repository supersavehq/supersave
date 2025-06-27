import type { Router } from "better-call";
import * as actions from "./actions";
import { generatePath } from "./utils";
import type Manager from "../manager";
import type { ManagedCollection } from "../types";

// Define a minimal interface for the framework-specific parts we need from better-call
interface MinimalBetterCall {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new (): MinimalBetterCallInstance;
  json(): any; // Replace 'any' with a more specific type if available from better-call
  Router(options?: any): Router; // Replace 'any' with RouterOptions if available
}

interface MinimalBetterCallInstance {
  use(handler: any): void; // Replace 'any' with a more specific type
  // Add other methods if used, e.g., engine, set, etc.
}

class Http {
  public static async create(manager: Manager, prefix: string): Promise<Http> {
    const { default: betterCall } = await import("better-call");
    const framework: MinimalBetterCall = betterCall;
    const router = framework.Router();
    return new Http(framework, router, manager, prefix);
  }

  private constructor(
    private readonly framework: MinimalBetterCall,
    private readonly router: Router,
    private manager: Manager,
    prefix: string, // excuding the /
  ) {
    // @ts-expect-error We are using a minimal interface, this should work if better-call has a static json method
    this.router.use(this.framework.json());
    this.manager.getCollections().forEach((collection: ManagedCollection) => {
      this.register(collection);
    });
    this.router.get(
      "/",
      actions.overview(prefix, () => this.getRegisteredCollections()),
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
