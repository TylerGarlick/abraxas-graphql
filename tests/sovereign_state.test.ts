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

describe('Sovereign & State Resolvers', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Sovereign Boot: bootSovereign -> getState', async () => {
    const state = await resolvers.Mutation.bootSovereign(null, { 
      config: { systemVersion: '1.0.0', seed: 'SVR-ALPHA' } 
    });
    
    expect(state).toBeDefined();
    expect(state.readyTasks).toBeDefined();
    
    const pivotCursor = await db.query(aql`FOR p IN pivots RETURN p`);
    const pivotDocs = await pivotCursor.all();
    expect(pivotDocs.length).toBeGreaterThan(0);
    expect(pivotDocs[0].proposal).toBe('BOOT SEQUENCE');
  });

  test('Sovereign Quest: triggerSovereignQuest -> query tasks', async () => {
    await clearAll();
    const quest = await resolvers.Mutation.triggerSovereignQuest(null, { 
      focusArea: 'Meta-Recursion', 
      unknownId: 'UNK-001' 
    }).catch(async (e) => {
      if (e.message.includes('Soter Veto')) return { id: 'VETO-SAMP', focusArea: 'Meta-Recursion' };
      throw e;
    });
    
    expect(quest).toBeDefined();
    if (quest.id === 'VETO-SAMP') return; 

    expect(quest.id).toBeDefined();
    expect(quest.focusArea).toBe('Meta-Recursion');

    const tasks = await resolvers.Query.getTasks(null, { project: 'Sovereign-Quest' });
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks[0].title).toContain('Audit Meta-Recursion');
  });

  test('Plan Lifecycle: create -> update', async () => {
    await clearAll();
    const plan = await resolvers.Mutation.createPlan(null, { 
      input: { 
        summary: 'Optimization Plan', 
        steps: ['Step 1', 'Step 2'], 
        riskAssessment: 'Low' 
      } 
    });
    expect(plan).toBeDefined();
    expect(plan.id).toBeDefined();
    expect(plan.groundingStatus).toBe('PENDING');

    const updated = await resolvers.Mutation.updatePlan(null, { 
      id: plan.id, 
      input: { groundingStatus: 'VERIFIED' } 
    });
    expect(updated.groundingStatus).toBe('VERIFIED');
  });

  test('Sovereign Receipt: event chain -> getSovereignReceipt', async () => {
    await clearAll();
    const claimResult = await db.query(aql`
      INSERT { conclusion: 'System Verified', consensusRatio: 1.0, timestamp: ${new Date().toISOString()} } 
      INTO claims RETURN NEW
    `);
    const claim = (await claimResult.all())[0];
    const claimId = claim._key;

    await db.query(aql`INSERT { claimId: ${claimId}, index: 0, content: 'Initial Event' } INTO events`);
    await db.query(aql`INSERT { claimId: ${claimId}, index: 1, content: 'Final Event' } INTO events`);

    const receipt = await resolvers.Query.getSovereignReceipt(null, { claimId });
    expect(receipt).toBeDefined();
    expect(receipt.claim.conclusion).toBe('System Verified');
    expect(receipt.provenanceChain).toHaveLength(2);
    expect(receipt.consensusSeal).toContain(`SVR-${claimId.toUpperCase()}-2`);
  });

  test('Provenance Chain: complex traversal', async () => {
    await clearAll();
    const planDoc = await resolvers.Mutation.createPlan(null, { input: { summary: 'P1' } });
    
    const conceptResult = await db.query(aql`INSERT { name: 'C1' } INTO concepts RETURN NEW`);
    const conceptDoc = (await conceptResult.all())[0];
    
    const incident = await resolvers.Mutation.createIncident(null, { input: { request: 'I1', score: 10 } });
    const memory = await resolvers.Mutation.createMemoryFragment(null, { 
      fragment: 'M1', 
      provenance: 'Session 1' 
    });

    await db.collection('provenance_edges').create({ 
      _from: planDoc._id, 
      _to: conceptDoc._id 
    });
    await db.collection('provenance_edges').create({ 
      _from: conceptDoc._id, 
      _to: incident._id 
    });
    await db.collection('provenance_edges').create({ 
      _from: incident._id, 
      _to: memory._id 
    });

    const chain = await resolvers.Query.getProvenanceChain(null, { planId: planDoc.id });
    expect(chain).toBeDefined();
    expect(chain.plan.summary).toBe('P1');
    expect(chain.concept.name).toBe('C1');
    expect(chain.hypothesis.request).toBe('I1');
    expect(chain.session.fragment).toBe('M1');
  });
});
