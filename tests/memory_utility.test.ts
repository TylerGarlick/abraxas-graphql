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

describe('Memory & Utility Resolvers', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Memory Fragments: create -> getRecentMemory', async () => {
    const frag1 = await resolvers.Mutation.createMemoryFragment(null, { 
      fragment: 'First Fragment', 
      provenance: 'Stream A' 
    });
    
    // Small delay to ensure timestamp difference if needed, though resolver uses DESC
    const frag2 = await resolvers.Mutation.createMemoryFragment(null, { 
      fragment: 'Latest Fragment', 
      provenance: 'Stream B' 
    });
    
    expect(frag2).toBeDefined();
    
    const recent = await resolvers.Query.getRecentMemory(null, {});
    expect(recent).toBeDefined();
    expect(recent.fragment).toBe('Latest Fragment');
  });

  test('Source Credibility: setSourceCredibility', async () => {
    // Create a source since we need one to update
    const source = await db.collection('sources').create({ 
      name: 'Reliable Source', 
      credibilityTier: 'LOW' 
    });
    
    const result = await resolvers.Mutation.setSourceCredibility(null, { 
      sourceId: source._key, 
      tier: 'HIGH' 
    });
    
    expect(result.sourceId).toBe(source._key);
    expect(result.tier).toBe('HIGH');
    
    const updated = await db.collection('sources').get(source._key);
    expect(updated.credibilityTier).toBe('HIGH');
  });

  test('Database Status: getDatabaseStatus', async () => {
    const status = await resolvers.Query.getDatabaseStatus(null, {});
    expect(status).toBeDefined();
    expect(['ACCESSIBLE', 'INACCESSIBLE']).toContain(status.status);
    if (status.status === 'ACCESSIBLE') {
      expect(status.version).toBeDefined();
    }
  });
});
