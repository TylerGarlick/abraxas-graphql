import { expect, test, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { startTestServer, graphqlRequest, clearAll } from './e2e_harness';

describe('E2E Sovereign & State', () => {
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

  test('Sovereign Boot: bootSovereign -> getState', async () => {
    const mutation = `
      mutation BootSovereign($config: JSON!) {
        bootSovereign(config: $config) {
          unresolvedIncidents
          readyTasks {
            id
            title
          }
          recentMemory {
            id
            fragment
          }
        }
      }
    `;
    const vars = { config: { systemVersion: '1.0.0', seed: 'SVR-ALPHA' } };
    const data = await graphqlRequest(url, mutation, vars);
    
    expect(data.bootSovereign).toBeDefined();
    expect(data.bootSovereign.readyTasks).toBeDefined();
    
    const pivotCursor = await db.query(aql`FOR p IN pivots RETURN p`);
    const pivotDocs = await pivotCursor.all();
    expect(pivotDocs.length).toBeGreaterThan(0);
    expect(pivotDocs[0].proposal).toBe('BOOT SEQUENCE');
  });

  test('Sovereign Quest: triggerSovereignQuest -> query tasks', async () => {
    const mutation = `
      mutation TriggerQuest($focusArea: String!, $unknownId: String!) {
        triggerSovereignQuest(focusArea: $focusArea, unknownId: $unknownId) {
          id
          focusArea
        }
      }
    `;
    const vars = { focusArea: 'Meta-Recursion', unknownId: 'UNK-001' };
    
    try {
      const data = await graphqlRequest(url, mutation, vars);
      expect(data.triggerSovereignQuest).toBeDefined();
      const questId = data.triggerSovereignQuest.id;

      const query = `
        query GetTasks($project: String) {
          getTasks(project: $project) {
            id
            title
          }
        }
      `;
      const tasksData = await graphqlRequest(url, query, { project: 'Sovereign-Quest' });
      expect(tasksData.getTasks.length).toBeGreaterThanOrEqual(2);
      expect(tasksData.getTasks[0].title).toContain('Audit Meta-Recursion');
    } catch (e: any) {
      if (e.message.includes('Soter Veto')) {
        // Valid outcome
      } else {
        throw e;
      }
    }
  });

  test('Plan Lifecycle: create -> update', async () => {
    const createMutation = `
      mutation CreatePlan($input: ActionablePlanInput!) {
        createPlan(input: $input) {
          id
          groundingStatus
        }
      }
    `;
    const createVars = { 
      input: { 
        summary: 'Optimization Plan', 
        steps: ['Step 1', 'Step 2'], 
        riskAssessment: 'Low' 
      } 
    };
    const createData = await graphqlRequest(url, createMutation, createVars);
    const planId = createData.createPlan.id;
    expect(planId).toBeDefined();
    expect(createData.createPlan.groundingStatus).toBe('PENDING');

    const updateMutation = `
      mutation UpdatePlan($id: ID!, $input: ActionablePlanUpdateInput!) {
        updatePlan(id: $id, input: $input) {
          id
          groundingStatus
        }
      }
    `;
    const updateVars = { id: planId, input: { groundingStatus: 'VERIFIED' } };
    const updatedData = await graphqlRequest(url, updateMutation, updateVars);
    expect(updatedData.updatePlan.groundingStatus).toBe('VERIFIED');
  });

  test('Sovereign Receipt: event chain -> getSovereignReceipt', async () => {
    const claimResult = await db.query(aql`
      INSERT { conclusion: 'System Verified', consensusRatio: 1.0, timestamp: ${new Date().toISOString()} } 
      INTO claims RETURN NEW
    `);
    const claim = (await claimResult.all())[0];
    const claimId = claim._key;

    await db.query(aql`INSERT { claimId: ${claimId}, index: 0, content: 'Initial Event' } INTO events`);
    await db.query(aql`INSERT { claimId: ${claimId}, index: 1, content: 'Final Event' } INTO events`);

    const query = `
      query GetSovereignReceipt($claimId: ID!) {
        getSovereignReceipt(claimId: $claimId) {
          consensusSeal
          claim {
            conclusion
          }
          provenanceChain {
            id
            content
          }
        }
      }
    `;
    const data = await graphqlRequest(url, query, { claimId });
    expect(data.getSovereignReceipt).toBeDefined();
    expect(data.getSovereignReceipt.claim.conclusion).toBe('System Verified');
    expect(data.getSovereignReceipt.provenanceChain).toHaveLength(2);
    expect(data.getSovereignReceipt.consensusSeal).toContain(`SVR-${claimId.toUpperCase()}-2`);
  });

  test('Provenance Chain: complex traversal', async () => {
    const createPlan = `mutation { createPlan(input: {summary: "P1", steps: [], riskAssessment: "Low"}) { id } }`;
    const { createPlan: planRes } = await graphqlRequest(url, createPlan);
    const planId = planRes.id;
    const planDoc = await db.collection('plans').get(planId);
    
    const conceptResult = await db.query(aql`INSERT { name: 'C1', description: 'Desc' } INTO concepts RETURN NEW`);
    const conceptDoc = (await conceptResult.all())[0];
    
    const createInc = `mutation { createIncident(input: {request: "I1", score: 10}) { id } }`;
    const { createIncident: incidentRes } = await graphqlRequest(url, createInc);
    const incId = incidentRes.id;
    const incidentDoc = await db.collection('incidents').get(incId);

    const createMem = `mutation { createMemoryFragment(fragment: "M1", provenance: "Session 1") { id } }`;
    const { createMemoryFragment: memoryRes } = await graphqlRequest(url, createMem);
    const memId = memoryRes.id;
    const memoryDoc = await db.collection('memory_fragments').get(memId);

    const salt = Math.random().toString(36).substring(7);
    await db.collection('provenance_edges').create({ 
      _key: `edge-plan-${salt}-${planId}`,
      _from: planDoc._id, 
      _to: conceptDoc._id 
    });
    await db.collection('provenance_edges').create({ 
      _key: `edge-concept-${salt}-${conceptDoc._key}`,
      _from: conceptDoc._id, 
      _to: incidentDoc._id 
    });
    await db.collection('provenance_edges').create({ 
      _key: `edge-incident-${salt}-${incId}`,
      _from: incidentDoc._id, 
      _to: memoryDoc._id 
    });

    const query = `
      query GetProvenanceChain($planId: ID!) {
        getProvenanceChain(planId: $planId) {
          plan { summary }
          concept { name }
          hypothesis { request }
          session { fragment }
        }
      }
    `;
    const data = await graphqlRequest(url, query, { planId });
    expect(data.getProvenanceChain).toBeDefined();
    expect(data.getProvenanceChain.plan.summary).toBe('P1');
    expect(data.getProvenanceChain.session.fragment).toBe('M1');
  });
});
