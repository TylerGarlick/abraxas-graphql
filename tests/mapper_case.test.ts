import { expect, test, describe } from 'bun:test';
import { mapArangoDoc } from '../src/common/mapper';

describe('ArangoDB Mapper Case Normalization', () => {
  test('should normalize lowercase status to uppercase', () => {
    const doc = { _key: '1', status: 'closed' };
    const result = mapArangoDoc(doc);
    expect(result.status).toBe('CLOSED');
  });

  test('should keep already uppercase status', () => {
    const doc = { _key: '2', status: 'OPEN' };
    const result = mapArangoDoc(doc);
    expect(result.status).toBe('OPEN');
  });

  test('should handle missing status safely', () => {
    const doc = { _key: '3', title: 'No Status' };
    const result = mapArangoDoc(doc);
    expect(result.status).toBeUndefined();
  });

  test('should handle non-string status safely', () => {
    const doc = { _key: '4', status: 123 };
    const result = mapArangoDoc(doc);
    expect(result.status).toBe(123);
  });
});
