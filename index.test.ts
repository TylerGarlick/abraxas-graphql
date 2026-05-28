import { expect, test, describe } from 'bun:test';
import { db } from './index';

describe('ArangoDB Connection', () => {
  test('should connect to the ArangoDB server', async () => {
    const version = await db.server().version();
    expect(version).toBeDefined();
  });

  test('should connect to the specific database', async () => {
    const dbExists = await db.database().exists();
    expect(dbExists).toBe(true);
  });
});
