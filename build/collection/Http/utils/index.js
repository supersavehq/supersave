"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePath = void 0;
const pluralize_1 = __importDefault(require("pluralize"));
const generatePath = (collection) => 
// eslint-disable-next-line implicit-arrow-linebreak
`/${collection.namespace ? `${collection.namespace}/` : ''}${pluralize_1.default(collection.name)}`;
exports.generatePath = generatePath;
