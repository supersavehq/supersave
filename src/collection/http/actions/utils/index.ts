import { Request, Response } from 'express';
import { Collection } from '../../../types';

export default async function transform(
  collection: Collection,
  request: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  item: any
): Promise<any> {
  let transformedItem = item;
  for (const hooks of collection.hooks || []) {
    if (hooks.entityTransform) {
      transformedItem = hooks.entityTransform(collection, request, res, transformedItem);
    }
  }
  return transformedItem;
}
