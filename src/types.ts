export type EntityMysqlOptions = {
  contentsColumnType?: 'TEXT' | 'MEDIUMTEXT' | 'LONGTEXT';
};
export type EntityEngineOptions = {
  mysql?: EntityMysqlOptions;
};
