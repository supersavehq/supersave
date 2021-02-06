"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Query {
    constructor(filterSortFields) {
        this.filterSortFields = filterSortFields;
        this.where = [];
        this.sortValues = [];
    }
    addFilter(operator, field, value) {
        if (typeof this.filterSortFields[field] === 'undefined') {
            throw new Error(`Cannot filter on not defined field ${field}.`);
        }
        this.where.push({ operator, field, value });
        return this;
    }
    eq(field, value) {
        return this.addFilter("=" /* EQUALS */, field, value);
    }
    gt(field, value) {
        return this.addFilter(">" /* GREATER_THAN */, field, value);
    }
    gte(field, value) {
        return this.addFilter(">=" /* GREATER_THAN_EQUALS */, field, value);
    }
    lt(field, value) {
        return this.addFilter("<" /* LESS_THAN */, field, value);
    }
    lte(field, value) {
        return this.addFilter("<=" /* LESS_THAN_EQUALS */, field, value);
    }
    like(field, value) {
        return this.addFilter("LIKE" /* LIKE */, field, value);
    }
    in(field, value) {
        return this.addFilter("IN" /* IN */, field, value);
    }
    getWhere() {
        return this.where;
    }
    limit(limit) {
        this.limitValue = limit;
        return this;
    }
    getLimit() {
        return this.limitValue;
    }
    offset(offset) {
        this.offsetValue = offset;
        return this;
    }
    getOffset() {
        return this.offsetValue;
    }
    sort(field, direction = 'asc') {
        if (typeof this.filterSortFields[field] === 'undefined') {
            throw new Error(`Requested sort field ${field} is not defined.`);
        }
        this.sortValues.push({ field, direction });
        return this;
    }
    getSort() {
        return this.sortValues;
    }
}
exports.default = Query;
