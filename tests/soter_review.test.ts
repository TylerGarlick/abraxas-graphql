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

describe('Soter & Review Resolvers', () => {
  beforeEach(async () => {
    await clearAll();
  });

  test('Soter Lifecycle: create -> update -> review -> update review', async () => {
    const inc = await resolvers.Mutation.createIncident(null, { 
      input: { request: 'Soter Risk Test', score: 40, resolved: false } 
    });
    expect(inc).toBeDefined();
    expect(inc.id).toBeDefined();

    const updatedInc = await resolvers.Mutation.updateIncident(null, { 
      id: inc.id, 
      input: { resolved: true, response: 'Risk Mitigation Successful' } 
    });
    expect(updatedInc.resolved).toBe(true);
    expect(updatedInc.response).toBe('Risk Mitigation Successful');

    const review = await resolvers.Mutation.createReview(null, { 
      input: { incidentId: inc.id, status: 'CLOSED', priority: 'HIGH', decision: 'APPROVED' } 
    });
    expect(review).toBeDefined();
    expect(review.id).toBeDefined();
    expect(review.incidentId).toBe(inc.id);

    const updatedReview = await resolvers.Mutation.updateReview(null, { 
      id: review.id, 
      input: { priority: 'LOW' } 
    });
    expect(updatedReview.priority).toBe('LOW');
    expect(updatedReview.incidentId).toBe(inc.id);
  });

  test('Query: getSoterIncidents & getSoterReviews', async () => {
    await clearAll(); 
    await resolvers.Mutation.createIncident(null, { input: { request: 'Inc 1', score: 10 } });
    await resolvers.Mutation.createIncident(null, { input: { request: 'Inc 2', score: 20 } });
    
    const tasks = await resolvers.Query.getSoterIncidents(null, {});
    expect(tasks).toHaveLength(2);

    const inc = tasks[0];
    await resolvers.Mutation.createReview(null, { 
      input: { incidentId: inc.id, status: 'CLOSED', priority: 'LOW' } 
    });

    const reviews = await resolvers.Query.getSoterReviews(null, {});
    expect(reviews).toHaveLength(1);
    expect(reviews[0].incidentId).toBe(inc.id);
  });
});
