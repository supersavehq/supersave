const express = require('express');
const { SuperSave } = require('../build');

const planetEntity = {
  name: 'planet',
  template: {
    name: '',
  },
  relations: []
}

const planetCollection = {
  name: 'planet',
  template: planetEntity.template,
  relations: planetEntity.relations
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

const moonCollection = {
  name: 'moon',
  template: moonEntity.template,
  relations: moonEntity.relations
}

const main = async () => {
  const connectionString = process.env.CONN || 'sqlite://memory:';
  const superSave = await SuperSave.create(connectionString);

  await superSave.addCollection(planetCollection);
  await superSave.addCollection(moonCollection);

  const app = express();
  const port = process.env.PORT || 4567;

  // Assuming createExpressRoutes is available in '../build/express'
  // We need to require it.
  const { createExpressRoutes } = require('../build/express');
  const manager = superSave.getManager(); // Assuming getManager is available
  await createExpressRoutes(app, manager, '/api');

  app.listen(port, () => {
    console.log(`Test server listening at http://0.0.0.0:${port}`)
  });
}

main();
