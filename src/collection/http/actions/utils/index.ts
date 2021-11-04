import { Request, Response } from 'express';
import { Collection } from '../../../types';

export default async function transform(
  collection: Collection,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  item: any,
): Promise<any> {
  if (!collection.hooks?.entityTransform) {
    return item;
  }

  return collection.hooks.entityTransform(collection, req, res, item);
}
