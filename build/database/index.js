"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const connection_1 = __importDefault(require("./connection"));
const EntityManager_1 = __importDefault(require("./EntityManager"));
const debug = debug_1.default('supersave:db');
exports.default = async (file) => {
    debug('Setting up connection for', file);
    const conn = await connection_1.default(file);
    return new EntityManager_1.default(conn);
};
