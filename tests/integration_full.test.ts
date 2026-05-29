import { expect, test, describe, beforeEach } from 'bun:test';
import { db, aql } from '../src/common/db';
import { resolvers } from '../src/resolvers/index';
import { mapArangoDoc } from '../src/common/mapper';

const COLLECTIONS = [
  'tasks', 'incidents', 'reviews', 'epistemic_marks', 'shadow_entries', 
  'symbols', 'pivots', 'quests', 'plans', 'memory_fragments', 
  'consensus_logs', 'sources', 'TASK_EDGES', 'provenance_edges', 'task_dependencies'
];

async function clearDatabase() {
  for (const col of COLLECTIONS) {
    try {
      await db.query(aql`FOR d IN ${col} REMOVE d IN ${col}`);
    } catch (e) {
      // Collection might not exist
    }
  }
}

describe('Comprehensive API Integration Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Task Lifecycle', () => {
    test('createTask -> updateTask -> getTask -> deleteTask', async () => {
      const input = {
        title: 'Integration Test Task',
        status: 'OPEN',
        priority: 'HIGH',
        project: 'Tests',
        description: 'Testing the full lifecycle'
      };

      // Create
      const created = await resolvers.Mutation.createTask(null, { input });
      expect(created.id).toBeDefined();
      expect(created.title).toBe(input.title);

      // Update
      const updatedInput = { title: 'Updated Title', priority: 'LOW' };
      const updated = await resolvers.Mutation.updateTask(null, { id: created.id, input: updatedInput });
      expect(updated.title).toBe('Updated Title');
      expect(updated.priority).toBe('LOW');

      // Get
      const fetched = await resolvers.Query.getTask(null, { id: created.id });
      expect(fetched.id).toBe(created.id);
      expect(fetched.title).toBe('Updated Title');

      // Delete
      const deleted = await resolvers.Mutation.deleteTask(null, { id: created.id });
      expect(deleted).toBe(true);
      const notFound = await resolvers.Query.getTask(null, { id: created.id });
      expect(notFound).toBeNull();
    });

    test('createTask with recursive subtasks', async () => {
      const input = {
        title: 'Parent Task',
        status: 'OPEN',
        subtasks: [
          {
            title: 'Child 1',
            status: 'OPEN',
            subtasks: [
              { title: 'Grandchild 1', status: 'OPEN' }
            ]
          },
          { title: 'Child 2', status: 'OPEN' }
        ]
      };

      const created = await resolvers.Mutation.createTask(null, { input });
      const fetched = await resolvers.Query.getTask(null, { id: created.id });
      
      expect(fetched.subtasks).toHaveLength(2);
      expect(fetched.subtasks[0].subtasks).toHaveLength(1);
      expect(fetched.subtasks[0].subtasks[0].title).toBe('Grandchild 1');
    });

    test('updateTaskStatus', async () => {
      const task = await resolvers.Mutation.createTask(null, { 
        input: { title: 'Status Task', status: 'OPEN' } 
      });
      
      const updated = await resolvers.Mutation.updateTaskStatus(null, { 
        input: { id: task.id, status: 'CLOSED' } 
      });
      
      expect(updated.status).toBe('CLOSED');
    });

    test('createDependency', async () => {
      const t1 = await resolvers.Mutation.createTask(null, { input: { title: 'T1', status: 'OPEN' } });
      const t2 = await resolvers.Mutation.createTask(null, { input: { title: 'T2', status: 'OPEN' } });
      
      const dep = await resolvers.Mutation.createDependency(null, { 
        input: { fromId: t1.id, toId: t2.id, depType: 'BLOCKS' } 
      });
      
      expect(dep.fromId).toBe(t1.id);
      expect(dep.toId).toBe(t2.id);
    });
  });

  describe('Soter Workflow', () => {
    test('createIncident -> updateIncident -> createReview -> updateReview', async () => {
      const incident = await resolvers.Mutation.createIncident(null, { 
        input: { request: 'Bad Request', score: 90, resolved: false } 
      });
      expect(incident.id).toBeDefined();

      const updatedInc = await resolvers.Mutation.updateIncident(null, { 
        id: incident.id, 
        input: { resolved: true, response: 'Fixed' } 
      });
      expect(updatedInc.resolved).toBe(true);

      const review = await resolvers.Mutation.createReview(null, { 
        input: { incidentId: incident.id, status: 'COMPLETED', priority: 'HIGH' } 
      });
      expect(review.id).toBeDefined();

      const updatedRev = await resolvers.Mutation.updateReview(null, { 
        id: review.id, 
        input: { decision: 'Sustained' } 
      });
      expect(updatedRev.decision).toBe('Sustained');
    });
  });

  describe('Knowledge & Sovereignty', () => {
    test('createEpistemicMark -> updateEpistemicMark', async () => {
      const mark = await resolvers.Mutation.createEpistemicMark(null, { 
        input: { label: 'KNOWN', topic: 'Test Topic' } 
      });
      expect(mark.id).toBeDefined();

      const updated = await resolvers.Mutation.updateEpistemicMark(null, { 
        id: mark.id, 
        input: { topic: 'Updated Topic' } 
      });
      expect(updated.topic).toBe('Updated Topic');
    });

    test('createShadowEntry -> updateShadowEntry', async () => {
      const entry = await resolvers.Mutation.createShadowEntry(null, { 
        input: { category: 'Fear', content: 'Test content' } 
      });
      expect(entry.id).toBeDefined();

      const updated = await resolvers.Mutation.updateShadowEntry(null, { 
        id: entry.id, 
        input: { content: 'Updated content' } 
      });
      expect(updated.content).toBe('Updated content');
    });

    test('createSymbol -> updateSymbol', async () => {
      const symbol = await resolvers.Mutation.createSymbol(null, { 
        name: 'The Sun', 
        stage: 'RUBEDO' 
      });
      expect(symbol.id).toBeDefined();

      const updated = await resolvers.Mutation.updateSymbol(null, { 
        input: { id: symbol.id, stage: 'ALBEDO', intention: 'Purification' } 
      });
      expect(updated.stage).toBe('ALBEDO');
    });

    test('Sovereign operations', async () => {
      const pivot = await resolvers.Mutation.createPivot(null, { 
        input: { ruptureId: 'R1', proposal: 'Change X', expectedDelta: 'Y', channelId: 'C1' } 
      });
      expect(pivot.id).toBeDefined();

      const quest = await resolvers.Mutation.createQuest(null, { 
        input: { unknownId: 'U1', focusArea: 'Void', channelId: 'C1' } 
      });
      expect(quest.id).toBeDefined();

      const plan = await resolvers.Mutation.createPlan(null, { 
        input: { summary: 'Test Plan', steps: ['Step 1'], riskAssessment: 'Low' } 
      });
      expect(plan.id).toBeDefined();

      const updatedPlan = await resolvers.Mutation.updatePlan(null, { 
        id: plan.id, 
        input: { summary: 'Updated Plan' } 
      });
      expect(updatedPlan.summary).toBe('Updated Plan');

      const fragment = await resolvers.Mutation.createMemoryFragment(null, { 
        fragment: 'I remember', 
        provenance: 'Dream' 
      });
      expect(fragment.id).toBeDefined();
    });

    test('System Utilities', async () => {
      const creds = await resolvers.Mutation.setSourceCredibility(null, { 
        sourceId: 'S1', 
        tier: 1 
      });
      expect(creds.tier).toBe(1);

      const consensus = await resolvers.Mutation.recordConsensus(null, { 
        divergence: 'Diff', 
        agreement: 'Same' 
      });
      expect(consensus.id).toBeDefined();

      const boot = await resolvers.Mutation.bootSovereign(null, { 
        config: { version: '1.0' } 
      });
      expect(boot.readyTasks).toBeDefined();
    });
  });

  describe('Query Aggregation', () => {
    test('getState reflects created entities', async () => {
      await resolvers.Mutation.createTask(null, { input: { title: 'Ready Task', status: 'READY' } });
      await resolvers.Mutation.createIncident(null, { input: { request: 'Error', score: 10, resolved: false } });
      await resolvers.Mutation.createMemoryFragment(null, { fragment: 'Recent', provenance: 'Seed' });

      const state = await resolvers.Query.getState();
      expect(state.readyTasks).toHaveLength(1);
      expect(state.unresolvedIncidents).toBe(1);
      expect(state.recentMemory).toBeDefined();
    });

    test('getTasks filtering', async () => {
      await resolvers.Mutation.createTask(null, { input: { title: 'T1', status: 'OPEN', project: 'P1' } });
      await resolvers.Mutation.createTask(null, { input: { title: 'T2', status: 'CLOSED', project: 'P1' } });
      await resolvers.Mutation.createTask(null, { input: { title: 'T3', status: 'OPEN', project: 'P2' } });

      const p1Open = await resolvers.Query.getTasks(null, { project: 'P1', status: 'OPEN' });
      expect(p1Open).toHaveLength(1);
      expect(p1Open[0].title).toBe('T1');

      const p1All = await resolvers.Query.getTasks(null, { project: 'P1' });
      expect(p1All).toHaveLength(2);
    });
  });
});
