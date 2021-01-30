"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const actions = __importStar(require("./actions"));
const utils_1 = require("./utils");
class Http {
    constructor(manager) {
        this.manager = manager;
        this.router = express_1.default.Router();
        this.router.use(body_parser_1.default.json());
        this.manager.getCollections().forEach((collection) => {
            this.register(collection);
        });
        this.router.get('/', actions.overview(() => this.getRegisteredCollections()));
    }
    register(collection) {
        const path = utils_1.generatePath(collection);
        this.router.get(path, actions.get(collection));
        this.router.post(path, actions.create(collection));
        this.router.patch(`${path}/:id`, actions.updateById(collection));
        this.router.delete(`${path}/:id`, actions.deleteById(collection));
        this.router.get(`${path}/:id`, actions.getById(collection));
        return this;
    }
    getRegisteredCollections() {
        return this.manager.getCollections();
    }
    getRouter() {
        return this.router;
    }
}
exports.default = Http;
