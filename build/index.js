"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperSave = exports.Query = exports.Repository = void 0;
const SuperSave_1 = __importDefault(require("./SuperSave"));
exports.SuperSave = SuperSave_1.default;
const EntityManager_1 = require("./database/EntityManager");
Object.defineProperty(exports, "Query", { enumerable: true, get: function () { return EntityManager_1.Query; } });
Object.defineProperty(exports, "Repository", { enumerable: true, get: function () { return EntityManager_1.Repository; } });
