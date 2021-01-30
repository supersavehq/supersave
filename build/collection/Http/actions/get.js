"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('supersave:http:get');
function sort(query, sortRequest) {
    const sorts = sortRequest.split(',');
    sorts.forEach((sortField) => {
        if (sortField.startsWith('-')) {
            query.sort(sortField.substring(1), 'desc');
        }
        else {
            query.sort(sortField);
        }
    });
}
function filter(collection, query, filters) {
    if (Object.keys(filters).length === 0) {
        return;
    }
    if (!collection.entity.filterSortFields) {
        throw new Error('There are no fields available to filter on, while filters were provided.');
    }
    // eslint-disable-next-line max-len
    const filterSortFields = collection.entity.filterSortFields;
    Object.entries(filters).forEach(([field, value]) => {
        const matches = (field || '').match(/(.*)\[(.*)\]$/);
        if (matches === null || matches.length !== 3) {
            if (!filterSortFields[field]) {
                throw new Error(`Cannot filter on not defined field ${field}.`);
            }
            if (collection.entity.filterSortFields && collection.entity.filterSortFields[field] === 'boolean') {
                query.eq(field, ['1', 1, 'true', true].includes(value));
            }
            else {
                query.eq(field, value);
            }
            return;
        }
        const filteredField = matches[1];
        const operator = matches[2];
        if (!filterSortFields[filteredField]) {
            throw new Error(`${filteredField} is not a field you can filter on.`);
        }
        switch (operator) {
            case ("=" /* EQUALS */): {
                query.eq(filteredField, value);
                break;
            }
            case (">" /* GREATER_THAN */): {
                query.gt(filteredField, value);
                break;
            }
            case (">=" /* GREATER_THAN_EQUALS */): {
                query.gte(filteredField, value);
                break;
            }
            case ("<" /* LESS_THAN */): {
                query.lt(filteredField, value);
                break;
            }
            case ("<=" /* LESS_THAN_EQUALS */): {
                query.lte(filteredField, value);
                break;
            }
            case ('in'): {
                query.in(filteredField, value.split(','));
                break;
            }
            case ('~'): {
                query.like(filteredField, value);
                break;
            }
            default:
                throw new Error(`Unrecognized operator ${operator} for filteredField ${filteredField}.`);
        }
    });
}
exports.default = (collection) => 
// eslint-disable-next-line implicit-arrow-linebreak
async (req, res) => {
    const query = collection.repository.createQuery();
    if (req.query.sort) {
        sort(query, req.query.sort);
    }
    const filters = {};
    Object.entries(req.query).forEach(([field, value]) => {
        if (field === 'sort' || field === 'limit' || field === 'offset') {
            return;
        }
        // Express by default parses values as ?distance[>]=0 into { distance: { '>': 0 }}. Unless 'the query parser'
        // setting is set the 'simple' on app., then its always a string.
        if (typeof value === 'string') {
            filters[field] = value;
        }
        else if (typeof value === 'object') {
            Object.entries(value).forEach(([operator, filterValue]) => {
                filters[`${field}[${operator}]`] = `${filterValue}`;
            });
        }
        else {
            debug('Ignoring query parameter', field, value);
        }
    });
    try {
        filter(collection, query, filters);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
        return;
    }
    try {
        const { limit } = req.params;
        if (typeof limit !== 'undefined') {
            query.limit(25);
        }
        else if (limit !== '-1') {
            query.limit(parseInt(limit, 10));
        }
        const items = await collection.repository.getByQuery(query.limit(25));
        res.json({
            data: items,
            meta: {
                sort: query.getSort(),
                limit: query.getLimit(),
                filters: query.getWhere(),
            },
        });
    }
    catch (error) {
        debug('Unexpected error while querying collection.', error);
        res.status(500).json({ mesage: 'An unexpected error occurred, try again later.' });
    }
};
