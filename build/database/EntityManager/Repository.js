"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const short_uuid_1 = __importDefault(require("short-uuid"));
const Query_1 = __importDefault(require("./Query"));
const debug = debug_1.default('supersave:db:repo');
class Repository {
    constructor(definition, tableName, getRepository, connection) {
        this.definition = definition;
        this.tableName = tableName;
        this.getRepository = getRepository;
        this.connection = connection;
        this.relationFields = definition.relations?.map((relation) => relation.field);
    }
    async getById(id) {
        return this.queryById(id);
    }
    async getByIds(ids) {
        const wherePlaceholders = [];
        const whereValues = {};
        ids.forEach((value, idx) => {
            const key = `:p${idx}`;
            wherePlaceholders.push(key);
            whereValues[key] = value;
        });
        const query = `SELECT id,contents FROM ${this.tableName} WHERE id IN(${wherePlaceholders.join(',')})`;
        const result = await this.connection.all(query, whereValues);
        if (result) {
            const promises = [];
            for (let iter = 0; iter < result.length; iter += 1) {
                const promise = this.transformQueryResultRow(result[iter]);
                promises.push(promise);
                result[iter] = await promise;
            }
            await Promise.all(promises);
            return result;
        }
        return [];
    }
    async getAll() {
        const query = `SELECT id,contents FROM ${this.tableName}`;
        const result = await this.connection.all(query);
        if (result) {
            const newResults = await this.transformQueryResultRows(result);
            return newResults;
        }
        return [];
    }
    async getOneByQuery(query) {
        const result = await this.getByQuery(query);
        if (result.length === 0) {
            return null;
        }
        return result[0];
    }
    async getByQuery(query) {
        const values = {};
        const where = [];
        query.getWhere().forEach((queryFilter) => {
            if (queryFilter.operator === "IN" /* IN */) {
                const placeholders = [];
                queryFilter.value.forEach((value, order) => {
                    const placeholder = `:${queryFilter.field}_${order}`;
                    placeholders.push(placeholder);
                    values[placeholder] = value;
                });
                where.push(`"${queryFilter.field}" IN(${placeholders.join(',')})`);
            }
            else {
                where.push(`"${queryFilter.field}" ${queryFilter.operator} :${queryFilter.field}`);
                if (this.definition.filterSortFields && this.definition.filterSortFields[queryFilter.field] === 'boolean') {
                    values[`:${queryFilter.field}`] = ['1', 1, 'true', true].includes(queryFilter.value) ? 1 : 0;
                }
                else if (queryFilter.operator === "LIKE" /* LIKE */) {
                    values[`:${queryFilter.field}`] = `${queryFilter.value}`.replace(/\*/g, '%');
                }
                else {
                    values[`:${queryFilter.field}`] = queryFilter.value;
                }
            }
        });
        let sqlQuery = `SELECT id,contents FROM ${this.tableName}
      ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    `;
        if (query.getSort().length > 0) {
            sqlQuery = `${sqlQuery} ORDER BY ${query.getSort().map((sort) => `"${sort.field}" ${sort.direction}`).join(',')}`;
        }
        if (query.getLimit()) {
            sqlQuery = `${sqlQuery} LIMIT ${typeof query.getOffset() !== 'undefined' ? `${query.getOffset()},${query.getLimit()}` : query.getLimit()}`;
        }
        debug('Querying data using query.', sqlQuery);
        const result = await this.connection.all(sqlQuery, values, values);
        debug('Found result count', result.length);
        if (result) {
            return this.transformQueryResultRows(result);
        }
        return [];
    }
    async deleteUsingId(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = :id`;
        await this.connection.run(query, { ':id': id });
    }
    async create(obj) {
        const columns = ['id', 'contents'];
        const uuid = typeof obj.id === 'string' ? obj.id : short_uuid_1.default.generate();
        const values = {
            ':id': uuid,
            ':contents': JSON.stringify({
                ...this.definition.template,
                ...this.simplifyRelations(obj),
            }),
        };
        if (typeof this.definition.filterSortFields !== 'undefined') {
            // eslint-disable-next-line max-len
            Object.entries(this.definition.filterSortFields).forEach(([field, type]) => {
                columns.push(field);
                if (type === 'boolean') {
                    values[`:${field}`] = obj[field] === true ? 1 : 0;
                }
                else if (this.relationFields.includes(field)) {
                    values[`:${field}`] = obj[field]?.id;
                }
                else if (field !== 'id') {
                    values[`:${field}`] = (typeof obj[field] !== 'undefined' && obj[field] !== null) ? obj[field] : null;
                }
            });
        }
        const query = `INSERT INTO ${this.tableName} (${columns.map((column) => `"${column}"`).join(',')}) VALUES(
      ${columns.map((column) => `:${column}`)}
    )`;
        debug('Generated create query.', query);
        await this.connection.run(query, values);
        return this.getById(uuid);
    }
    async update(obj) {
        const columns = ['contents'];
        const simplifiedObject = this.simplifyRelations(obj);
        const values = {
            ':contents': JSON.stringify(simplifiedObject),
            ':id': obj.id || '',
        };
        if (typeof this.definition.filterSortFields !== 'undefined') {
            Object.entries(this.definition.filterSortFields).forEach(([field, type]) => {
                if (typeof obj[field] !== 'undefined') {
                    columns.push(field);
                    if (type === 'boolean') {
                        values[`:${field}`] = obj[field] === true ? 1 : 0;
                    }
                    else {
                        values[`:${field}`] = simplifiedObject[field] || null;
                    }
                }
            });
        }
        const query = `UPDATE ${this.tableName} SET
      ${columns.map((column) => `"${column}" = :${column}`)}
      WHERE id = :id
    `;
        debug('Generated update query.', query);
        await this.connection.run(query, values);
        return obj;
    }
    async queryById(id) {
        const query = `SELECT id,contents FROM ${this.tableName} WHERE id = :id LIMIT 1`;
        debug('Query for getById', query, id);
        const result = await this.connection.get(query, { ':id': id });
        if (result) {
            return this.transformQueryResultRow(result);
        }
        debug('No result for queryById().');
        return null;
    }
    async transformQueryResultRows(rows) {
        const result = [];
        const promises = [];
        for (let iter = 0; iter < rows.length; iter += 1) {
            const promise = this.transformQueryResultRow(rows[iter]);
            promises.push(promise);
            result[iter] = await promise;
        }
        await Promise.all(promises);
        return result;
    }
    async transformQueryResultRow(row) {
        const parsedContents = JSON.parse(row.contents);
        return {
            ...this.definition.template,
            ...await this.fillInRelations(parsedContents),
            id: row.id,
        };
    }
    async fillInRelations(entity) {
        if (!this.definition.relations?.length) {
            return entity;
        }
        const clone = JSON.parse(JSON.stringify(entity)); // TODO replace with clone function
        const promises = [];
        this.definition.relations.forEach(async (relation) => {
            const repository = this.getRepository(relation.entity, relation.namespace);
            if (relation.multiple !== true) {
                const id = clone[relation.field];
                if (typeof id === 'string') {
                    const promise = repository.getById(id);
                    promises.push(promise);
                    const relatedEntity = await promise;
                    if (!relatedEntity) {
                        throw new Error(`Unable to find related entity ${relation.entity} with id ${entity[relation.field]}`);
                    }
                    clone[relation.field] = relatedEntity;
                }
            }
            else {
                const promise = this.mapRelationToMultiple(relation, clone[relation.field]);
                promises.push(promise);
                const mappedEntities = await promise;
                clone[relation.field] = mappedEntities;
            }
        });
        await Promise.all(promises);
        return clone;
    }
    async mapRelationToMultiple(relation, arr) {
        if (!Array.isArray(arr)) {
            return [];
        }
        const repository = this.getRepository(relation.entity, relation.namespace);
        return repository.getByIds(arr);
    }
    simplifyRelations(entity) {
        if (this.definition.relations.length === 0) {
            return entity;
        }
        const clone = { ...entity };
        this.definition.relations.forEach((relation) => {
            if (!clone[relation.field]) {
                return;
            }
            if (relation.multiple) {
                clone[relation.field] = entity[relation.field].map((relationEntity) => relationEntity.id);
            }
            else {
                clone[relation.field] = entity[relation.field].id;
            }
        });
        return clone;
    }
    createQuery() {
        return new Query_1.default();
    }
}
exports.default = Repository;
