import { expect, test, describe, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { resolvers } from '../src/resolvers/index';

async function clearAll() {
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

describe('Symbolic & Oneironautics Resolvers', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Symbol Lifecycle: create -> update -> query', async () => {
    const symbol = await resolvers.Mutation.createSymbol(null, { 
      name: 'The Gold Sun', 
      stage: 'RUBEDO' 
    });
    expect(symbol).toBeDefined();
    expect(symbol.id).toBeDefined();
    expect(symbol.name).toBe('The Gold Sun');
    expect(symbol.stage).toBe('RUBEDO');

    const updated = await resolvers.Mutation.updateSymbol(null, { 
      input: { 
        id: symbol.id, 
        stage: 'ALBEDO', 
        intention: 'Purification of the spirit' 
      } 
    });
    expect(updated.stage).toBe('ALBEDO');
    expect(updated.intention).toBe('Purification of the spirit');

    const symbols = await resolvers.Query.getSymbolNodes(null, {});
    expect(symbols).toHaveLength(1);
    expect(symbols[0].id).toBe(symbol.id);
  });

  test('Symbol Integration: connect symbol to archetype', async () => {
    const symbol = await resolvers.Mutation.createSymbol(null, { 
      name: 'Labyrinth', 
      stage: 'NIGREDO' 
    });
    
    // Create archetype manually as there is no mutation for it in resolvers.ts
    const archResult = await db.query(aql`
      INSERT { name: 'The Archetypal Guide', domain: 'Psychopomp' } 
      INTO archetypes RETURN NEW
    `);
    const archetype = (await archResult.all())[0];

    const integration = await resolvers.Mutation.integrateSymbol(null, { 
      symbolId: symbol.id, 
      archetypeId: archetype._key 
    });

    expect(integration).toBeDefined();
    expect(integration.id).toBeDefined();
    expect(integration.symbolId).toBe(symbol.id);
    expect(integration.archetypeId).toBe(archetype._key);
    expect(integration.integrationQuality).toBe(1.0);
  });
});
