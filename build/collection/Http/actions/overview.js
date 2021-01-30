"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
exports.default = (getRegisteredCollections) => (_req, res) => {
    const output = {};
    const collections = getRegisteredCollections();
    collections.forEach((collection) => {
        const path = utils_1.generatePath(collection);
        const namespace = collection.namespace ? `/${collection.namespace}` : '/';
        if (Array.isArray(output[namespace]) === false) {
            output[namespace] = [];
        }
        output[namespace].push({
            name: collection.name,
            description: collection.description,
            endpoint: path,
            ...collection.additionalProperties || {},
        });
    });
    if (Object.keys(output).length === 1 && typeof output['/'] !== 'undefined') {
        res.json(output['/']);
        return;
    }
    res.json(output);
};
