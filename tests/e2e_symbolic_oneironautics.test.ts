import { expect, test, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { startTestServer, graphqlRequest, clearAll } from './e2e_harness';

describe('E2E Symbolic & Oneironautics', () => {
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

  test('Symbol Lifecycle: create -> update -> query', async () => {
    const createMutation = `
      mutation CreateSymbol($name: String!, $stage: AlchemicalStage!) {
        createSymbol(name: $name, stage: $stage) {
          id
          name
          stage
        }
      }
    `;
    const vars = { name: 'The Gold Sun', stage: 'RUBEDO' };
    const data = await graphqlRequest(url, createMutation, vars);
    const id = data.createSymbol.id;
    expect(id).toBeDefined();
    expect(data.createSymbol.name).toBe('The Gold Sun');
    expect(data.createSymbol.stage).toBe('RUBEDO');

    const updateMutation = `
      mutation UpdateSymbol($input: SymbolUpdateInput!) {
        updateSymbol(input: $input) {
          id
          stage
          intention
        }
      }
    `;
    const updateVars = { 
      input: { 
        id, 
        stage: 'ALBEDO', 
        intention: 'Purification of the spirit' 
      } 
    };
    const updatedData = await graphqlRequest(url, updateMutation, updateVars);
    expect(updatedData.updateSymbol.stage).toBe('ALBEDO');
    expect(updatedData.updateSymbol.intention).toBe('Purification of the spirit');

    const query = `query { getSymbolNodes { id name stage } }`;
    const listData = await graphqlRequest(url, query);
    expect(listData.getSymbolNodes).toHaveLength(1);
    expect(listData.getSymbolNodes[0].id).toBe(id);
  });

  test('Symbol Integration: connect symbol to archetype', async () => {
    const createSymMutation = `mutation { createSymbol(name: "Labyrinth", stage: NIGREDO) { id } }`;
    const { createSymbol } = await graphqlRequest(url, createSymMutation);
    const symId = createSymbol.id;

    // Archetypes are not currently in the GraphQL mutations, so we seed them via DB
    // Use a fresh ID or just clear the collection if it's a test env
    await db.query(aql`FOR a IN archetypes REMOVE a IN archetypes`);
    
    const archResult = await db.query(aql`
      INSERT { name: 'The Archetypal Guide', domain: ' la Psychopomp', manifestation: 'A lantern-bearing figure' } 
      INTO archetypes RETURN NEW
    `);
    const archetype = (await archResult.all())[0];
    const archId = archetype._key;

    const integrateMutation = `
      mutation IntegrateSymbol($symbolId: ID!, $archetypeId: ID!) {
        integrateSymbol(symbolId: $symbolId, archetypeId: $archetypeId) {
          id
          symbolId
          archetypeId
          integrationQuality
        }
      }
    `;
    const vars = { symbolId: symId, archetypeId: archId };
    const data = await graphqlRequest(url, integrateMutation, vars);
    expect(data.integrateSymbol).toBeDefined();
    expect(data.integrateSymbol.symbolId).toBe(symId);
    expect(data.integrateSymbol.archetypeId).toBe(archId);
    expect(data.integrateSymbol.integrationQuality).toBe(1.0);
  });
});
