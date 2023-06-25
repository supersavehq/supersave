import { Database, open } from 'sqlite';
import sqlite3 from 'sqlite3';

if (process.env.NODE_ENV !== 'production') {
  sqlite3.verbose();
}

export default async (filename: string): Promise<Database> =>
  open({
    filename,
    driver: sqlite3.Database,
  });
