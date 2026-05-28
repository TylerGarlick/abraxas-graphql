import { Database, aql } from 'arangojs'

export {
  aql,
}
export const db = (() => {
  if (!process.env.ARANGO_URL || !process.env.ARANGO_DB_NAME) {
    throw new Error('Missing required ArangoDB environment variables: ARANGO_URL and ARANGO_DB_NAME are required.');
  }

  return new Database({
    databaseName: process.env.ARANGO_DB_NAME,
    url: process.env.ARANGO_URL,
    auth: {
      username: process.env.ARANGO_USERNAME,
      password: process.env.ARANGO_PASSWORD,
    },
  });
})();


