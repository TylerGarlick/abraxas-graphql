import { expect, test, describe, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { resolvers } from '../src/resolvers/index';
import { mapArangoDoc } from '../src/common/mapper';

async function clearAll() {
  const cols = [
    'tasks', 'incidents', 'reviews', 'epistemic_marks', 'shadow_entries', 
    'symbols', 'pivots', 'quests', 'plans', 'memory_fragments', 
    'consensus_logs', 'sources', 'TASK_EDGES', 'provenance_edges', 
    'task_dependencies', 'events', 'claims', 'consensus', 'qualia_bridges', 'symbolic_integrations', 'archetypes'
  ];
  for (const col of cols) {
    try {
      await db.query(aql`FOR d IN ${col} REMOVE d IN ${col}`);
    } catch (e) {
      // Collection might not exist, ignore
    }
  }
}

describe('Full API Coverage Matrix', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Soter: Full Incident Lifecycle', async () => {
    const inc = await resolvers.Mutation.createIncident(null, { 
      input: { request: 'Risk Test', score: 50, resolved: false } 
    });
    expect(inc.id).toBeDefined();

    const updated = await resolvers.Mutation.updateIncident(null, { 
      id: inc.id, input: { resolved: true, response: 'Safe' } 
    });
    expect(updated.resolved).toBe(true);

    const review = await resolvers.Mutation.createReview(null, { 
      input: { incidentId: inc.id, status: 'CLOSED', priority: 'LOW' } 
    });
    expect(review.id).toBeDefined();
  });

  test('Janus: Consensus and Qualia Bridge', async () => {
    const cons = await resolvers.Mutation.createConsensus(null, { 
      input: { claim: 'Truth A', evidence: ['Frag 1'], confidence: 0.9 } 
    });
    expect(cons.id).toBeDefined();

    const bridge = await resolvers.Mutation.createQualiaBridge(null, { 
      input: { solSide: 'Factual', noxSide: 'Symbolic' } 
    });
    expect(bridge.id).toBeDefined();

    const fetchedCons = await resolvers.Query.getConsensus(null, { claim: 'Truth A' });
    expect(fetchedCons.id).toBe(cons.id);
  });

  test('Sovereign: Event Chain and Receipts', async () => {
    const e1 = await resolvers.Mutation.recordSovereignEvent(null, { content: 'Sovereign Start' });
    const e2 = await resolvers.Mutation.recordSovereignEvent(null, { content: 'Sovereign Step' });
    expect(e2.previousHash).toBe(e1.currentHash);

    const claimResult = await db.query(aql`
      INSERT { conclusion: 'Sovereignty Proven', consensusRatio: 1.0, timestamp: ${new Date().toISOString()} } 
      INTO claims RETURN NEW
    `);
    const claim = (await claimResult.all())[0];

    await db.query(aql`INSERT { claimId: ${claim._key}, index: 0, content: 'Evidence' } INTO events`);

    const receipt = await resolvers.Query.getSovereignReceipt(null, { claimId: claim._key });
    expect(receipt.claim.conclusion).toBe('Sovereignty Proven');
    expect(receipt.provenanceChain).toHaveLength(1);
  });

  test('Oneironautics: Symbol Integration', async () => {
    const sym = await resolvers.Mutation.createSymbol(null, { name: 'Gold', stage: 'RUBEDO' });
    const arch = await db.query(aql`INSERT { name: 'The King', domain: 'Power' } INTO archetypes RETURN NEW`);
    const archetype = (await arch.all())[0];

    const integ = await resolvers.Mutation.integrateSymbol(null, { 
      symbolId: sym.id, 
      archetypeId: archetype._key 
    });
    expect(integ.id).toBeDefined();
    expect(integ.symbolId).toBe(sym.id);
  });

  test('Sovereign Orchestration: Quest Trigger', async () => {
    const quest = await resolvers.Mutation.triggerSovereignQuest(null, { 
      focusArea: 'Meta-Logic', 
      unknownId: 'ML-001' 
    });
    expect(quest.id).toBeDefined();
    
    const tasks = await resolvers.Query.getTasks(null, { project: 'Sovereign-Quest' });
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });
});
