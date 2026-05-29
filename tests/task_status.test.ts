import { expect, test, describe } from 'bun:test';
import { resolvers } from '../src/resolvers';
import { db, aql } from '../src/common/db';

describe('Task Status Non-Nullability', () => {
  test('should identify and fix records missing status', async () => {
    const cursor = await db.query(aql`
      INSERT { title: 'Broken Status Task' } INTO tasks RETURN NEW
    `);
    const results = await cursor.all();
    const task = results[0];
    const key = task._key;

    const fetched = await resolvers.Query.getTask(null, { id: key });
    
    expect(fetched).toBeDefined();
    expect(fetched?.status).toBe('OPEN');
  });

  test('should identify and fix records with null status', async () => {
    const cursor = await db.query(aql`
      INSERT { title: 'Null Status Task', status: null } INTO tasks RETURN NEW
    `);
    const results = await cursor.all();
    const task = results[0];
    const key = task._key;

    const fetched = await resolvers.Query.getTask(null, { id: key });
    
    expect(fetched).toBeDefined();
    expect(fetched?.status).toBe('OPEN');
  });
});
