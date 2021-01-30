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
    const { id } = req.params;
    const { repository } = collection;
    await repository.deleteUsingId(id);
    debug('Deleted from', collection.name, id);
    res.status(204).send();
};
