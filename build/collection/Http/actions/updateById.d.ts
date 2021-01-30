import { Response, Request } from 'express';
import { ManagedCollection } from '../../types';
declare const _default: (collection: ManagedCollection) => (req: Request, res: Response) => Promise<void>;
export default _default;
