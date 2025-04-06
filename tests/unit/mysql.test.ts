import getConnection from '../connection';
import { SuperSave, Repository } from '../../build';
import { planetEntity } from '../entities';
import { Planet } from '../types';
import { clear } from '../mysql';
import mysql, { type Connection } from 'mysql2/promise';

beforeEach(clear);

const runMysqlTests = getConnection().startsWith('mysql://');

(runMysqlTests ? describe : describe.skip)('mysql', () => {
  test('a larger column size is used for a new entity', async () => {
    const superSave = await SuperSave.create(getConnection());
    const planetRepository: Repository<Planet> = await superSave.addEntity<Planet>(planetEntity, {
      mysql: { contentsColumnType: 'MEDIUMTEXT' },
    });

    const earth: Planet = await planetRepository.create({ name: 'Earth' });
    const mars: Planet = await planetRepository.create({ name: 'Mars' });

    expect(earth.name).toEqual('Earth');
    expect(mars.name).toEqual('Mars');

    const connection: Connection = await mysql.createConnection(getConnection());
    const columnRows = await connection.query('SHOW COLUMNS FROM planet');

    expect(columnRows).toHaveLength(2);

    const columns = Object.values(columnRows[0]);
    expect(columns).toHaveLength(2);

    expect(columns[0].Type).toEqual('varchar(32)');
    expect(columns[1].Type).toEqual('mediumtext');
  });

  // TODO: test that a larger column size is used for an existing entity
});
