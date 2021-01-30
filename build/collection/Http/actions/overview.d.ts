import { RequestHandler } from 'express';
import { ManagedCollection } from '../../types';
declare const _default: (getRegisteredCollections: () => ManagedCollection[]) => RequestHandler;
export default _default;
