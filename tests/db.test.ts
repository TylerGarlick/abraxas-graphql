import { expect, test, describe } from 'bun:test';
import { db, aql } from '../src/common/db';

describe('ArangoDB End-to-End Integration', () => {
  test('should successfully create and retrieve a task', async () => {
    const taskData = {
      title: 'Verify ArangoDB Connection',
      status: 'OPEN',
      priority: 'HIGH',
      project: 'Infra',
    };
    
    const now = new Date().toISOString();
    const result = await db.query(aql`
      INSERT {
        title: ${taskData.title},
        status: ${taskData.status},
        priority: ${taskData.priority},
        project: ${taskData.project},
        createdAt: ${now},
      } INTO tasks
    `);
    const key = result[0]._key;
    
    const found = await db.query(aql`FOR t IN tasks FILTER t._key == ${key} RETURN t`);
    expect(found[0]).toBeDefined();
    expect(found[0].title).toBe(taskData.title);
  });

  test('should successfully create a memory fragment', async () => {
    const memoryData = {
      fragment: 'Test Memory Fragment',
      provenance: 'E2E Test',
      timestamp: new Date().toISOString(),
    };
    
    const result = await db.query(aql`
      INSERT {
        fragment: ${memoryData.fragment},
        provenance: ${memoryData.provenance},
        timestamp: ${memoryData.timestamp}
      } INTO memory_fragments
    `);
    expect(result[0]._key).toBeDefined();
  });

  test('should verify graph edge creation', async () => {
    const planData = { summary: 'Test Plan', steps: [], riskAssessment: 'Low', groundingStatus: 'PENDING' };
    const conceptData = { name: 'Test Concept', description: 'Test Desc' };

    const planResult = await db.query(aql`INSERT ${planData} INTO plans`);
    const conceptResult = await db.query(aql`INSERT ${conceptData} INTO concepts`);
    
    const planKey = planResult[0]._key;
    const conceptKey = conceptResult[0]._key;

    await db.query(aql`
      INSERT {
        _from: CONCAT('plans/', ${planKey}),
        _to: CONCAT('concepts/', ${conceptKey}),
      } INTO provenance_edges
    `);
    
    const traversal = await db.query(aql`
      FOR p IN 1..1 OUTBOUND CONCAT('plans/', ${planKey}) provenance_edges 
      RETURN p.vertices[1]
    `);
    expect(traversal[0]).toBeDefined();
    expect(traversal[0].name).toBe('Test Concept');
  });
});
