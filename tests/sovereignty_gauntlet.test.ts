import { expect, test, describe, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { resolvers } from '../src/resolvers/index';
import { mapArangoDoc } from '../src/common/mapper';

async function clearSovereignCollections() {
  const cols = ['events', 'claims', 'quests', 'tasks', 'TASK_EDGES', 'consensus', 'qualia_bridges'];
  for (const col of cols) {
    try { await db.query(aql`FOR d IN ${col} REMOVE d IN ${col}`); } catch (e) {}
  }
}

describe('The Sovereignty Gauntlet', () => {
  beforeEach(async () => {
    await clearSovereignCollections();
  });

  test('Sovereign lappet: recordSovereignEvent maintains hash chain', async () => {
    const e1 = await resolvers.Mutation.recordSovereignEvent(null, { content: 'Genesis' });
    const e2 = await resolvers.Mutation.recordSovereignEvent(null, { content: 'First Step' });
    const e3 = await resolvers.Mutation.recordSovereignEvent(null, { content: 'Second Step' });

    expect(e1.index).toBe(0);
    expect(e1.previousHash).toBe('0x0');
    
    expect(e2.index).toBe(1);
    expect(e2.previousHash).toBe(e1.currentHash);
    
    expect(e3.index).toBe(2);
    expect(e3.previousHash).toBe(e2.currentHash);
  });

  test('Sovereign l समेत: triggerSovereignQuest generates discovery lappets', async () => {
    const quest = await resolvers.Mutation.triggerSovereignQuest(null, { 
      focusArea: 'Epistemic Void', 
      unknownId: 'U-001' 
    });

    expect(quest.id).toBeDefined();
    
    const taskCursor = await db.query(aql`FOR t IN tasks FILTER t.project == 'Sovereign-Quest' RETURN t`);
    const tasks = await taskCursor.all();
    
    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks[0].title).toContain('Audit Epistemic Void');
  });

  test('Soter Veto: high risk mutation failure', async () => {
    // Since riskScore is random(100), we might need to try multiple times or mock
    // For now we test that the error is thrown if the score hit > 80
    let vetoTriggered = false;
    for(let i = 0; i < 20; i++) {
      try {
        await resolvers.Mutation.createTask(null, { input: { title: 'Test', status: 'OPEN' } });
      } catch (e: any) {
        if (e.message.includes('Soter Veto')) {
          vetoTriggered = true;
          break;
        }
      }
    }
    expect(vetoTriggered).toBe(true);
  });

  test('Sovereign Receipt: aggregates lapped provenance', async () => {
    // 1. Create a claim manually (since we don't have createClaim mutation yet)
    const claim = await db.query(aql`
      INSERT { 
        conclusion: 'The Sovereign Brain is active', 
        consensusRatio: 0.95, 
        timestamp: DATE_ISO8601() 
      } INTO claims RETURN NEW
    `);
    const claimDoc = (await claim.all())[0];
    const claimId = claimDoc._key;

    // 2. Record some events linked to this claim (Mocking the linkage in resolver)
    // Note: The current recordSovereignEvent doesn't take claimId, so we simulate it
    await db.query(aql`INSERT { index: 0, currentHash: 'h1', content: 'Found fragment', claimId: ${claimId} } INTO events`);
    await db.query(aql`INSERT { index: 1, currentHash: 'h2', content: 'Verified lappet', claimId: ${claimId} } INTO events`);

    const receipt = await resolvers.Query.getSovereignReceipt(null, { id: claimId });
    
    expect(receipt.claim.conclusion).toBe('The Sovereign Brain is active');
    expect(receipt.provenanceChain).toHaveLength(2);
    expect(receipt.consensusSeal).toContain(claimId.toUpperCase());
  });
});
