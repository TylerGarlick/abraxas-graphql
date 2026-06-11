import { db, aql } from '../src/common/db';
import { createYoga } from 'graphql-yoga';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from '../src/resolvers';
import { typeDefs } from '../src/schema';

export async function clearAll() {
  const cols = [
    'tasks', 'incidents', 'reviews', 'epistemic_marks', 'shadow_entries', 
    'symbols', 'pivots', 'quests', 'plans', 'memory_fragments', 
    'consensus_logs', 'sources', 'TASK_EDGES', 'provenance_edges', 
    'task_dependencies', 'events', 'claims', 'consensus', 'qualia_bridges', 'symbolic_integrations', 'archetypes'
  ];
  for (const col of cols) {
    try {
      await db.collection(col).truncate();
    } catch (e) {
      // Collection might not exist
    }
  }
}

export async function startTestServer(port = 9001) {
  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const yoga = createYoga({
    schema,
    graphiql: false,
  });

  const server = Bun.serve({
    port,
    fetch: yoga,
  });

  return {
    server,
    url: server.url,
    stop: () => server.stop(),
  };
}

export async function graphqlRequest(url: string, query: string, variables: any = {}) {
  const response = await fetch(`${url}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP Error ${response.status}: ${text}`);
  }

  const result = await response.json();
  if (result && result.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(result.errors)}`);
  }
  return result ? result.data : null;
}
