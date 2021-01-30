"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('supersave:http:getById');
exports.default = (collection) => 
// eslint-disable-next-line implicit-arrow-linebreak
async (req, res) => {
    try {
        const { id } = req.params;
        const { repository } = collection;
        const item = await repository.getById(id);
        if (item === null) {
            res.status(404).json({ message: 'Not found', meta: { id } });
            return;
        }
        res.json({ data: item });
    }
    catch (error) {
        debug('Error while storing item.', error);
        res.status(500).json({ message: error.message });
    }
};
