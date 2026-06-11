import { expect, test, describe, beforeAll, afterAll, beforeEach } from 'bun:test';
import { startTestServer, graphqlRequest, clearAll } from './e2e_harness';

describe('E2E Soter & Review', () => {
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

  test('Soter Lifecycle: create -> update -> review -> update review', async () => {
    const createIncMutation = `
      mutation CreateIncident($input: SoterIncidentInput!) {
        createIncident(input: $input) {
          id
          request
          resolved
        }
      }
    `;
    const incVars = { 
      input: { request: 'E2E Risk Test', score: 40, resolved: false } 
    };
    const incData = await graphqlRequest(url, createIncMutation, incVars);
    const incId = incData.createIncident.id;
    expect(incId).toBeDefined();

    const updateIncMutation = `
      mutation UpdateIncident($id: ID!, $input: SoterIncidentUpdateInput!) {
        updateIncident(id: $id, input: $input) {
          id
          resolved
          response
        }
      }
    `;
    const updateIncVars = { 
      id: incId, 
      input: { resolved: true, response: 'Risk Mitigation Successful' } 
    };
    const updatedIncData = await graphqlRequest(url, updateIncMutation, updateIncVars);
    expect(updatedIncData.updateIncident.resolved).toBe(true);
    expect(updatedIncData.updateIncident.response).toBe('Risk Mitigation Successful');

    const createRevMutation = `
      mutation CreateReview($input: SoterReviewInput!) {
        createReview(input: $input) {
          id
          incidentId
          status
        }
      }
    `;
    const revVars = { 
      input: { incidentId: incId, status: 'CLOSED', priority: 'HIGH', decision: 'APPROVED' } 
    };
    const revData = await graphqlRequest(url, createRevMutation, revVars);
    const revId = revData.createReview.id;
    expect(revId).toBeDefined();

    const updateRevMutation = `
      mutation UpdateReview($id: ID!, $input: SoterReviewUpdateInput!) {
        updateReview(id: $id, input: $input) {
          id
          priority
          incidentId
        }
      }
    `;
    const updateRevVars = { 
      id: revId, 
      input: { priority: 'LOW' } 
    };
    const updatedRevData = await graphqlRequest(url, updateRevMutation, updateRevVars);
    expect(updatedRevData.updateReview.priority).toBe('LOW');
    expect(updatedRevData.updateReview.incidentId).toBe(incId);
  });

  test('Query: getSoterIncidents & getSoterReviews', async () => {
    const createInc = `mutation { createTask(input: {title: "Dummy", status: READY}) { id } }`; // Simple seed
    await graphqlRequest(url, `mutation { createIncident(input: {request: "Inc 1", score: 10}) { id } }`);
    await graphqlRequest(url, `mutation { createIncident(input: {request: "Inc 2", score: 20}) { id } }`);
    
    const incQuery = `query { getSoterIncidents { id request } }`;
    const incData = await graphqlRequest(url, incQuery);
    expect(incData.getSoterIncidents).toHaveLength(2);

    const incId = incData.getSoterIncidents[0].id;
    await graphqlRequest(url, `mutation { createReview(input: {incidentId: "${incId}", status: "CLOSED", priority: "LOW"}) { id } }`);

    const revQuery = `query { getSoterReviews { id incidentId } }`;
    const revData = await graphqlRequest(url, revQuery);
    expect(revData.getSoterReviews).toHaveLength(1);
    expect(revData.getSoterReviews[0].incidentId).toBe(incId);
  });
});
