import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mockResolvers } from './resolvers/mocks'

const typeDefs = readFileSync(join(process.cwd(), 'schema.graphql'), 'utf-8')

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: mockResolvers,
})

export const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
})

export { yoga as server }
