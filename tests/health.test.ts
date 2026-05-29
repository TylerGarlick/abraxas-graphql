import { expect, test, describe } from 'bun:test';
import { resolvers } from '../src/resolvers';
import { db } from '../src/common/db';
import { vi } from 'bun:test';

describe('Database Health Resolver', () => {
  test('should return ACCESSIBLE when db.version() succeeds', async () => {
    const versionSpy = vi.spyOn(db, 'version').mockResolvedValue('3.11.8');
    
    const result = await resolvers.Query.getDatabaseStatus();
    
    expect(result).toEqual({
      status: 'ACCESSIBLE',
      version: '3.11.8',
    });
    versionSpy.mockRestore();
  });

  test('should return INACCESSIBLE when db.version() throws', async () => {
    const versionSpy = vi.spyOn(db, 'version').mockRejectedValue(new Error('Connection failed'));
    
    const result = await resolvers.Query.getDatabaseStatus();
    
    expect(result).toEqual({
      status: 'INACCESSIBLE',
      version: null,
    });
    versionSpy.mockRestore();
  });
});
