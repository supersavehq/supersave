import { Request, Response, Application } from 'express';
import { HttpCollection, ManagedCollection } from '../../types';
import { generatePath } from '../utils';

export default (
  getRegisteredCollections: () => ManagedCollection[],
  // @ts-ignore
): Application => (_req: Request, res: Response): void => {
  const output: { [key: string]: HttpCollection[] } = {};

  const collections = getRegisteredCollections();
  collections.forEach((collection: ManagedCollection) => {
    const path = generatePath(collection);
    const namespace = collection.namespace ? `/${collection.namespace}` : '/';

    if (Array.isArray(output[namespace]) === false) {
      output[namespace] = [];
    }
    output[namespace].push({
      name: collection.name,
      description: collection.description,
      endpoint: path,
      ...collection.additionalProperties || {},
    });
  });

  if (Object.keys(output).length === 1 && typeof output['/'] !== 'undefined') {
    res.json(output['/']);
    return;
  }

  res.json(output);
};
