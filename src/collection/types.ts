import type { Request, Response } from "express";
import type { Repository } from "../database/entity-manager";
import type { FilterSortField, Relation } from "../database/types";

export type HttpCollection = {
  name: string;
  description?: string;
  endpoint: string;
  [key: string]: any;
};

export type Collection = {
  name: string;
  description?: string;
  namespace?: string;
  template: any;
  relations: Relation[];
  filterSortFields?: Record<string, FilterSortField>;
  additionalProperties?: Record<string, any>;
  hooks?: Hooks[];
};

export interface ManagedCollection<T = any> extends Collection {
  repository: Repository<T>;
}

export type Hooks = {
  get?: (
    collection: Collection,
    request: Request,
    res: Response,
  ) => Promise<void> | void;
  getById?: <T>(
    collection: Collection,
    request: Request,
    res: Response,
    entity: T | null,
  ) => Promise<T> | T;
  entityTransform?: <IN, OUT>(
    collection: Collection,
    request: Request,
    res: Response,
    entity: IN,
  ) => Promise<OUT> | OUT;
  updateBefore?: <IN, OUT>(
    collection: Collection,
    request: Request,
    res: Response,
    entity: Partial<IN>,
  ) => Promise<OUT> | OUT;
  createBefore?: <IN, OUT>(
    collection: Collection,
    request: Request,
    res: Response,
    entity: Omit<IN, "id">,
  ) => Promise<OUT> | OUT;
  deleteBefore?: <T>(
    collection: Collection,
    request: Request,
    res: Response,
    item: Omit<T, "id"> | null,
  ) => Promise<void> | void;
};
