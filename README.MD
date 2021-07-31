SuperSave
===========

# Installation

## Sqlite

    npm i --save supersave sqlite3 sqlite

Example connection string: sqlite://:memory:

## Mysql

    npm i --save supersave mysql

Example connection string: mysql://examplename:somepassword@examplehost:3306/dbname

# Usage

You can use `addEntity` to create a database-only entity, use `addCollection` to add an entity that will automatically become available via the API.

Use `await superSave.getRouter()` to register the API at your express application. For example: `app.use('/api', await superSave.getRouter());`.

## Entity

    const planetEntity = {
        name: 'planet',
        template: {
            name: '',
        },
        relations: []
    }

    const moonEntity = {
        name: 'moon',
        template: {
            name: '',
        },
        relations: [{
            name: 'planet',
            field: 'planet',
            multiple: false,
        }],
    }

    const superSave = await SuperSave.create(connectionString);
    await superSave.addEntity(planetEntity);
    await superSave.addEntity(moonEntity);

## Collection

    const planetCollection = {
        name: 'planet',
        template: {
            name: '',
        },
        relations: []
    }

    const moonCollection = {
        name: 'moon',
        template: {
            name: '',
        },
        relations: [{
            name: 'planet',
            field: 'planet',
            multiple: false,
        }],
    }

    const superSave = await SuperSave.create(connectionString);
    await superSave.addCollection(planetCollection);
    await superSave.addCollection(moonCollection);

## Close connection

You can use `await superSave.close()` to close the connection with the underlying storage. For _sqlite_ this means that the connection is closed
and the superSave instance can no longer be used. When using _mysql_ this will close all active connections in the pool.

# Development

This module currently supports both sqlite and mysql. Development for sqlite is pretty straight-forward, 
you can use `:memory:` as the filename to set up a memory-only database.

Mysql is a bit more cumbersome, as it requires a running mysql server. For this purpose a `docker-compose.yml` file is present in the repository. Run
the following command to start a jest watch command for the unit tests.

    docker-compose up

This command uses the `--runInBand` to run all tests synchronously, to prevent the tests from interfering with each other. Each test will drop all tables
in the database before running, so that they do not interfere with each other.
