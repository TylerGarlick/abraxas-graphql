import { createYoga } from 'graphql-yoga'
import { makeExecutableSchema } from '@graphql-tools/schema'
// import { typeDefs } from "./schema";
// import { resolvers } from "./resolvers";
import { resolvers } from './src/resolvers'
import { typeDefs } from './src/schema'

const port = parseInt(process.env.PORT || '9000')

//
// // Build the executable schema from type definitions and resolvers
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

// Create the Yoga GraphQL server instance
const yoga = createYoga({
  schema,
  graphiql: true, // Enable GraphiQL playground in development
})

// Create HTTP server and start listening
const server = Bun.serve({
  port,
  fetch: yoga,
})


// const server = serve({
//   yoga,
//   cors: true,
// })

console.log(`Server is running at ${server.url}`)
