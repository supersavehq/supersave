"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteById = exports.getById = exports.updateById = exports.create = exports.get = exports.overview = void 0;
const overview_1 = __importDefault(require("./overview"));
exports.overview = overview_1.default;
const get_1 = __importDefault(require("./get"));
exports.get = get_1.default;
const create_1 = __importDefault(require("./create"));
exports.create = create_1.default;
const updateById_1 = __importDefault(require("./updateById"));
exports.updateById = updateById_1.default;
const getById_1 = __importDefault(require("./getById"));
exports.getById = getById_1.default;
const deleteById_1 = __importDefault(require("./deleteById"));
exports.deleteById = deleteById_1.default;
