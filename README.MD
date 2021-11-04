SuperSave
===========

# Installation

## Sqlite

    npm i --save supersave sqlite3 sqlite

Example connection string: `sqlite://:memory:`

## Mysql

    npm i --save supersave mysql

Example connection string: `mysql://examplename:somepassword@examplehost:3306/dbname`

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

# Hooks

There are several hooks available that can be used to manipulate the behavior in the HTTP endpoints:

```
export type Hooks = {
  get?: (collection: Collection, req: Request, res: Response) => Promise<void> | void,
  getById?: <T>(collection: Collection, req: Request, res: Response, entity: T | null) => Promise<T> | T,
  entityTransform?: <IN, OUT>(collection: Collection, req: Request, res: Response, entity: IN) => Promise<OUT> | OUT,
  updateBefore?: <IN, OUT>(collection: Collection, req: Request, res: Response, entity: Partial<IN>) => Promise<OUT> | OUT,
  createBefore?: <IN, OUT>(collection: Collection, req: Request, res: Response, entity: Omit<IN, 'id'>) => Promise<OUT> | OUT,
  deleteBefore?: <T>(collection: Collection, req: Request, res: Response, item: Omit<T, 'id'> | null) => Promise<void> | void,
};
``` 

A hook can be set when registering a collection, by provided at least one of the functions described above.

```
const planetCollection = {
  name: 'planet',
  template: {
      name: '',
  },
  relations: [],
  hooks: {
    ...
  }
}
```

| Hook | Description |
| ---- |------------ |
| get | Manipulate the filters/get parameters of the request before data is actually being requested. The endpoint is `/planet` for example. |
| getById | Perform an action on the retrieved entity before it is transformed and then returned via the API. Entity value can be `null` if its not found. |
| entityTransform | Used at every location where an entity is returned in the API (create, update, get, getById). The entity as its retrieved from the database can be changed. For example a field that should not be publicly displayed can be removed from the payload. |
| updateBefore | This hook is invoked just before the updated statement is executed towards the database. The `entity` argument in the payload is the entire object, not just the provided fields in the request. |
| createBefore | Invoked before an item is created, the function will receive the item as it will be saved. The `id` field will not be available, unless explicitly specified in the API request. |
| deleteBefore | Invoked before an item is deleted. |

## Errors

Any error that is thrown from within a hook is output directly towards the requester in the API. So be careful that no unwanted information
is leaked via the Error. A `HookError` can be imported `import { HookError } from 'supersave';`. An exception with
a defined HTTP status code can be initialized via is contructor: `throw new HookError('msg', 401)`. This will result in a HTTP 401 error
in the API out, with the JSON payload: `{ "message": "msg" }`.

# Development

This module currently supports both sqlite and mysql. Development for sqlite is pretty straight-forward, 
you can use `:memory:` as the filename to set up a memory-only database.

Mysql is a bit more cumbersome, as it requires a running mysql server. For this purpose a `docker-compose.yml` file is present in the repository. Run
the following command to start a jest watch command for the unit tests.

    docker-compose up

This command uses the `--runInBand` to run all tests synchronously, to prevent the tests from interfering with each other. Each test will drop all tables
in the database before running, so that they do not interfere with each other.
