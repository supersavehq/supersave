"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const debug_1 = __importDefault(require("debug"));
const Repository_1 = __importDefault(require("./Repository"));
const utils_1 = require("./utils");
const debug = debug_1.default('supersave:db:sync');
const filterSortFieldSqliteTypeMap = {
    string: "TEXT" /* TEXT */,
    number: "INTEGER" /* INTEGER */,
    boolean: "INTEGER" /* INTEGER */,
};
async function getTableColumns(connection, tableName, entity) {
    const query = `pragma table_info('${tableName}');`;
    const columns = await connection.all(query);
    if (columns === undefined) {
        throw new Error(`Unable to query table structure for ${tableName}.`);
    }
    if (columns.length === 2 && !entity.filterSortFields) {
        debug('Only id column found and no additional filterSortFields defined.');
        return {};
    }
    const sqliteTypeMap = {
        ["TEXT" /* TEXT */]: 'string',
        ["INTEGER" /* INTEGER */]: 'number',
        ["INTEGER" /* BOOLEAN */]: 'number',
    };
    const mappedColumns = {};
    columns.forEach((column) => {
        if (column.name === 'contents') {
            return;
        }
        if (!sqliteTypeMap[column.type]) {
            throw new Error(`Unrecognized Sqlite column type ${column.type}`);
        }
        mappedColumns[column.name] = column.type;
    });
    return mappedColumns;
}
function hasTableChanged(sqliteColumns, mappedFilterSortTypeFields) {
    const tablesAreEqual = utils_1.isEqual(sqliteColumns, mappedFilterSortTypeFields);
    if (!tablesAreEqual) {
        debug('Table changed', sqliteColumns, mappedFilterSortTypeFields);
    }
    return !tablesAreEqual;
}
function mapFilterSortFieldsToColumns(filterSortFields) {
    const result = {};
    Object.entries(filterSortFields).forEach(([fieldName, filter]) => {
        result[fieldName] = filterSortFieldSqliteTypeMap[filter];
    });
    return result;
}
exports.default = async (entity, tableName, connection, repository, getRepository) => {
    if (typeof entity.filterSortFields === 'undefined') {
        return;
    }
    const sqliteColumns = await getTableColumns(connection, tableName, entity);
    const newSqliteColumns = mapFilterSortFieldsToColumns(entity.filterSortFields);
    if (!hasTableChanged(sqliteColumns, newSqliteColumns)) {
        debug('Table has not changed, not making changes.');
        return;
    }
    const newTableName = `${tableName}_2`;
    const columns = [
        'id TEXT PRIMARY KEY',
        'contents TEXT NOT NULL',
    ];
    const indexes = [];
    const filterSortFieldNames = Object.keys(entity.filterSortFields);
    for (let iter = 0; iter < filterSortFieldNames.length; iter += 1) {
        const fieldName = filterSortFieldNames[iter];
        const filterSortFieldType = entity.filterSortFields[fieldName];
        if (typeof filterSortFieldSqliteTypeMap[filterSortFieldType] === 'undefined') {
            throw new Error(`Unrecognized field type ${filterSortFieldType}.`);
        }
        if (fieldName !== 'id') {
            columns.push(`"${fieldName}" ${filterSortFieldSqliteTypeMap[filterSortFieldType]} NULL`);
            indexes.push(`CREATE INDEX IF NOT EXISTS idx_${fieldName} ON ${newTableName}("${fieldName}")`);
        }
    }
    await connection.run(`DROP TABLE IF EXISTS ${newTableName};`);
    const createQuery = `CREATE TABLE ${newTableName} (${columns.join(',')})`;
    // TODO start a transaction
    debug('Creating temporary table.', createQuery);
    await connection.run(createQuery);
    debug('Setting indexes.');
    for (let iter = indexes.length - 1; iter >= 0; iter -= 1) {
        await connection.run(indexes[iter]);
    }
    // copy the fields
    debug('Copying contents to new table.');
    const newRepository = new Repository_1.default(entity, newTableName, getRepository, connection);
    const oldAll = await repository.getAll();
    for (let iter = 0; iter < oldAll.length; iter += 1) {
        await newRepository.create(oldAll[iter]);
    }
    debug(`Completed copy. Dropping table ${tableName} and renaming temporary table ${newTableName}.`);
    await connection.run(`DROP TABLE ${tableName}`);
    await connection.run(`ALTER TABLE ${newTableName} RENAME TO ${tableName}`);
};
