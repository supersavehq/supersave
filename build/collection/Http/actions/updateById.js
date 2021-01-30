"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('supersave:http:updateById');
exports.default = (collection) => 
// eslint-disable-next-line implicit-arrow-linebreak
async (req, res) => {
    try {
        const { id } = req.params;
        const { repository } = collection;
        const item = await repository.getById(id);
        if (item === null) {
            res.status(404).json({ message: 'Not Found' });
            return;
        }
        const { body } = req;
        debug('Incoming update request', body);
        collection.entity.relations.forEach((relation) => {
            if (body[relation.field]) {
                if (relation.multiple && Array.isArray(body[relation.field]) && body[relation.field].length > 0) {
                    if (typeof body[relation.field][0] !== 'object') {
                        body[relation.field] = body[relation.field]
                            .map((relationId) => ({ id: relationId }));
                    }
                }
                else if (!relation.multiple && typeof body[relation.field] === 'object') {
                    body[relation.field] = {
                        id: body[relation.field],
                    };
                }
            }
        });
        const updatedEntity = {
            ...item,
            ...body,
        };
        debug('Updating entity.', updatedEntity);
        const updatedResult = await repository.update(updatedEntity);
        res.json({ data: updatedResult });
    }
    catch (error) {
        debug('Error while storing item.', error);
        res.status(500).json({ message: error.message });
    }
};
