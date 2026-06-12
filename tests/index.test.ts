import { expect, test, describe } from 'bun:test';
import { server } from '../src/graphql/server';

describe('GraphQL Integration', () => {
  const executeQuery = async (query: string, variables = {}) => {
    const result = await server.fetch(
      new Request('http://localhost:9000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      })
    );
    return result.json();
  };

  test('getState returns valid sovereign state', async () => {
    const query = `{ getState { unresolvedIncidents readyTasks { id title } } }`;
    const json = await executeQuery(query);
    
    expect(json.data.getState).toBeDefined();
    expect(typeof json.data.getState.unresolvedIncidents).toBe('number');
    expect(Array.isArray(json.data.getState.readyTasks)).toBe(true);
  });

  test('getTasks returns a list of tasks', async () => {
    const query = `{ getTasks { id title status } }`;
    const json = await executeQuery(query);
    
    expect(json.data.getTasks).toBeDefined();
    expect(Array.isArray(json.data.getTasks)).toBe(true);
  });

  test('invalid query returns graphql errors', async () => {
    const query = `{ nonExistentField }`;
    const json = await executeQuery(query);
    
    expect(json.errors).toBeDefined();
    expect(json.errors[0].message).toContain('Cannot query field');
  });
});
