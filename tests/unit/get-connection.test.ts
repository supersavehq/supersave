import { expect, test } from 'vitest';
import { SuperSave } from '../../src';
import getConnection from '../connection';

test('get-connection returns something', async () => {
  const superSave = await SuperSave.create(getConnection());

  expect(superSave.getConnection()).toBeTruthy();
});
