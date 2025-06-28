// The specific clear, executeQuery, and getQuery for MySQL have been generalized
// and moved to db_utils.ts.
// Tests should ideally import `clear` directly from 'tests/db_utils'.
// However, to minimize immediate changes to existing test files if they
// import clear from './mysql', we can re-export it here.

import { clear as genericClear } from './db_utils';

export const clear = genericClear;
