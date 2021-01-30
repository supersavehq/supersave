"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('supersave:http:create');
exports.default = (collection) => 
// eslint-disable-next-line implicit-arrow-linebreak
async (req, res) => {
    try {
        const { body } = req;
        if (typeof body !== 'object') {
            throw new Error('Request body is not an object.');
        }
        collection.entity.relations.forEach((relation) => {
            if (body[relation.field]) {
                if (relation.multiple) {
                    body[relation.field] = body[relation.field].map((id) => ({ id }));
                }
                else {
                    body[relation.field] = {
                        id: body[relation.field],
                    };
                }
            }
        });
        const item = await collection.repository.create(body);
        debug('Created collection item at', req.path);
        res.json({ data: item });
    }
    catch (error) {
        debug('Error while storing item.', error);
        res.status(500).json({ message: error.message });
    }
};
