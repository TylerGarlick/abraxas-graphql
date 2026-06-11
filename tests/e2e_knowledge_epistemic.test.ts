import { expect, test, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { startTestServer, graphqlRequest, clearAll } from './e2e_harness';

describe('E2E Knowledge & Epistemic', () => {
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

  test('Epistemic Marks: create -> update -> query', async () => {
    const createMutation = `
      mutation CreateMark($input: EpistemicMarkInput!) {
        createEpistemicMark(input: $input) {
          id
          label
          topic
        }
      }
    `;
    const vars = { 
      input: { 
        label: 'KNOWN', 
        topic: 'Quantum Decoherence', 
        reasoningChain: 'Observed in lab', 
        sessionId: 'session-1' 
      } 
    };
    const data = await graphqlRequest(url, createMutation, vars);
    const id = data.createEpistemicMark.id;
    expect(id).toBeDefined();
    expect(data.createEpistemicMark.label).toBe('KNOWN');

    const updateMutation = `
      mutation UpdateMark($id: ID!, $input: EpistemicMarkUpdateInput!) {
        updateEpistemicMark(id: $id, input: $input) {
          id
          label
        }
      }
    `;
    const updateVars = { id, input: { label: 'INFERRED' } };
    const updatedData = await graphqlRequest(url, updateMutation, updateVars);
    expect(updatedData.updateEpistemicMark.label).toBe('INFERRED');

    const query = `query { getEpistemicMarks { id label topic } }`;
    const listData = await graphqlRequest(url, query);
    expect(listData.getEpistemicMarks).toHaveLength(1);
    expect(listData.getEpistemicMarks[0].id).toBe(id);
  });

  test('Shadow Entries: create -> update -> query', async () => {
    const createMutation = `
      mutation CreateShadow($input: ShadowEntryInput!) {
        createShadowEntry(input: $input) {
          id
          category
          content
        }
      }
    `;
    const vars = { 
      input: { 
        category: 'UNCONSCIOUS', 
        content: 'Recurring dream of a black tower', 
        sessionId: 'session-shadow' 
      } 
    };
    const data = await graphqlRequest(url, createMutation, vars);
    const id = data.createShadowEntry.id;
    expect(id).toBeDefined();

    const updateMutation = `
      mutation UpdateShadow($id: ID!, $input: ShadowEntryUpdateInput!) {
        updateShadowEntry(id: $id, input: $input) {
          id
          content
        }
      }
    `;
    const updateVars = { id, input: { content: 'The tower is now white' } };
    const updatedData = await graphqlRequest(url, updateMutation, updateVars);
    expect(updatedData.updateShadowEntry.content).toBe('The tower is now white');

    const query = `query { getShadowEntries { id content } }`;
    const listData = await graphqlRequest(url, query);
    expect(listData.getShadowEntries).toHaveLength(1);
    expect(listData.getShadowEntries[0].id).toBe(id);
  });

  test('Consensus: create -> query', async () => {
    const createMutation = `
      mutation CreateConsensus($input: JanusConsensusInput!) {
        createConsensus(input: $input) {
          id
          claim
          confidence
        }
      }
    `;
    const vars = { 
      input: { 
        claim: 'Light is both particle and wave', 
        evidence: ['Double slit experiment'], 
        confidence: 0.99
        // label removed because it's not in JanusConsensusInput in schema.graphql
      } 
    };
    const data = await graphqlRequest(url, createMutation, vars);
    const id = data.createConsensus.id;
    expect(id).toBeDefined();

    const query = `query GetConsensus($claim: String!) { getConsensus(claim: $claim) { id claim confidence } }`;
    const fetchedData = await graphqlRequest(url, query, { claim: 'Light is both particle and wave' });
    expect(fetchedData.getConsensus).toBeDefined();
    expect(fetchedData.getConsensus.id).toBe(id);
    expect(fetchedData.getConsensus.confidence).toBe(0.99);
  });

  test('Consensus Logs: record consensus', async () => {
    const mutation = `
      mutation RecordConsensus($divergence: String!, $agreement: String!) {
        recordConsensus(divergence: $divergence, agreement: $agreement)
      }
    `;
    const vars = { divergence: '0.1', agreement: '0.9' };
    const data = await graphqlRequest(url, mutation, vars);
    expect(data.recordConsensus).toBeDefined();
  });


  test('Consensus Logs: record consensus', async () => {
    const mutation = `
      mutation RecordConsensus($divergence: String!, $agreement: String!) {
        recordConsensus(divergence: $divergence, agreement: $agreement)
      }
    `;
    const vars = { divergence: '0.1', agreement: '0.9' };
    const data = await graphqlRequest(url, mutation, vars);
    expect(data.recordConsensus).toBeDefined();
  });
});
