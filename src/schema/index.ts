import { makeExecutableSchema } from '@graphql-tools/schema';
import { customScalars } from './scalars';
import { resolvers } from '../resolvers';
import fs from 'node:fs';
import path from 'node:path';

const schemaFile = path.join(process.cwd(), 'schema.graphql');
export const typeDefs = fs.readFileSync(schemaFile, 'utf8');

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
