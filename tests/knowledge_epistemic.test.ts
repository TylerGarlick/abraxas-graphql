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

describe('Knowledge & Epistemic Resolvers', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Epistemic Marks: create -> update -> query', async () => {
    const mark = await resolvers.Mutation.createEpistemicMark(null, { 
      input: { 
        label: 'KNOWN', 
        topic: 'Quantum Decoherence', 
        reasoningChain: 'Observed in lab', 
        sessionId: 'session-1' 
      } 
    });
    expect(mark).toBeDefined();
    expect(mark.id).toBeDefined();
    expect(mark.label).toBe('KNOWN');

    const updated = await resolvers.Mutation.updateEpistemicMark(null, { 
      id: mark.id, 
      input: { label: 'INFERRED' } 
    });
    expect(updated.label).toBe('INFERRED');

    const marks = await resolvers.Query.getEpistemicMarks(null, {});
    expect(marks).toHaveLength(1);
    expect(marks[0].id).toBe(mark.id);
  });

  test('Shadow Entries: create -> update -> query', async () => {
    const entry = await resolvers.Mutation.createShadowEntry(null, { 
      input: { 
        category: 'UNCONSCIOUS', 
        content: 'Recurring dream of a black tower', 
        sessionId: 'session-shadow' 
      } 
    });
    expect(entry).toBeDefined();
    expect(entry.id).toBeDefined();

    const updated = await resolvers.Mutation.updateShadowEntry(null, { 
      id: entry.id, 
      input: { content: 'The tower is now white' } 
    });
    expect(updated.content).toBe('The tower is now white');

    const entries = await resolvers.Query.getShadowEntries(null, {});
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(entry.id);
  });

  test('Consensus: create -> query', async () => {
    const cons = await resolvers.Mutation.createConsensus(null, { 
      input: { 
        claim: 'Light is both particle and wave', 
        evidence: ['Double slit experiment'], 
        confidence: 0.99, 
        label: 'KNOWN' 
      } 
    });
    expect(cons).toBeDefined();
    expect(cons.id).toBeDefined();

    const fetched = await resolvers.Query.getConsensus(null, { 
      claim: 'Light is both particle and wave' 
    });
    expect(fetched).toBeDefined();
    expect(fetched.id).toBe(cons.id);
    expect(fetched.confidence).toBe(0.99);
  });

  test('Consensus Logs: record consensus', async () => {
    const log = await resolvers.Mutation.recordConsensus(null, { 
      divergence: 0.1, 
      agreement: 0.9 
    });
    expect(log).toBeDefined();
    expect(log.id).toBeDefined();
    expect(log.divergence).toBe(0.1);
  });
});
