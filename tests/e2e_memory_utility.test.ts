import { expect, test, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { startTestServer, graphqlRequest, clearAll } from './e2e_harness';

describe('E2E Memory & Utility', () => {
  let server: any;
  let url: string;

  beforeAll(async () => {
    const s = await startTestServer();
    server = s.server;
    url = s.url;
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
    await clearAll();
  });

  test('Memory Fragments: create -> getRecentMemory', async () => {
    const createMutation = `
      mutation CreateMemory($fragment: String!, $provenance: String!) {
        createMemoryFragment(fragment: $fragment, provenance: $provenance) {
          id
          fragment
          timestamp
        }
      }
    `;
    
    await graphqlRequest(url, createMutation, { 
      fragment: 'Fragment 1', 
      provenance: 'Source A' 
    });
    
    const latestFragment = 'The latest fragment';
    await graphqlRequest(url, createMutation, { 
      fragment: latestFragment, 
      provenance: 'Source B' 
    });
    
    const query = `query { getRecentMemory { id fragment } }`;
    const data = await graphqlRequest(url, query);
    
    expect(data.getRecentMemory).toBeDefined();
    expect(data.getRecentMemory.fragment).toBe(latestFragment);
  });

  test('Source Credibility: setSourceCredibility', async () => {
    await clearAll();
    const { db } = await import('../src/common/db');
    
    try { await db.collection('sources').truncate(); } catch (e) {}
    
    const source = await db.collection('sources').create({ 
      name: 'Reliable Source', 
      credibilityTier: 1 
    });
    
    const mutation = `
      mutation SetCredibility($sourceId: ID!, $tier: Int!) {
        setSourceCredibility(sourceId: $sourceId, tier: $tier)
      }
    `;
    const data = await graphqlRequest(url, mutation, { 
      sourceId: source._key, 
      tier: 5 
    });
    
    expect(data.setSourceCredibility).toBeDefined();
    
    const updated = await db.collection('sources').get(sourceL._key);
    expect(updated.credibilityTier).toBe(5);
  });

  test('Database Status: getDatabaseStatus', async () => {
    const query = `query { getDatabaseStatus { version status } }`;
    const data = await graphqlRequest(url, query);
    
    expect(data.getDatabaseStatus).toBeDefined();
    expect(data.getDatabaseStatus.status).toBe('ACCESSIBLE');
    expect(data.getDatabaseStatus.version).toBeDefined();
  });
});
