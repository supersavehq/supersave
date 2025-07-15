const getConnection = (): string => process.env.CONN || 'sqlite://:memory:';
export default getConnection;
