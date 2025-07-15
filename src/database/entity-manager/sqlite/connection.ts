import Database from 'better-sqlite3';

export default (filename: string): Database.Database => {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  return db;
};
