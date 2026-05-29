import { expect, test, describe } from 'bun:test';
import { resolvers } from '../src/resolvers';
import { db, aql } from '../src/common/db';

describe('ArangoDB Real E2E Tests', () => {
  test('getDatabaseStatus should return ACCESSIBLE and real version', async () => {
    const result = await resolvers.Query.getDatabaseStatus();
    console.log('DB Status:', result);
    expect(result.status).toBe('ACCESSIBLE');
    expect(result.version).toBeDefined();
  });

  test('End-to-end Task flow: create -> get -> update', async () => {
    const taskInput = {
      title: 'E2E Integration Test Task',
      status: 'OPEN',
      project: 'E2E',
      priority: 'MEDIUM',
      description: 'Testing real DB connection and mapping',
    };

    // 1. Create Task
    const createdTask = await resolvers.Mutation.createTask(null, { input: taskInput });
    expect(createdTask.id).toBeDefined();
    expect(createdTask.title).toBe(taskInput.title);
    
    const taskId = createdTask.id;

    // 2. Get Task
    const fetchedTask = await resolvers.Query.getTask(null, { id: taskId });
    expect(fetchedTask).toBeDefined();
    expect(fetchedTask?.id).toBe(taskId);
    expect(fetchedTask?.title).toBe(taskInput.title);

    // 3. Update Task
    const updateInput = {
      title: 'Updated E2E Task Title',
      status: 'READY' as any,
    };
    const updatedTask = await resolvers.Mutation.updateTask(null, { id: taskId, input: updateInput });
    expect(updatedTask.id).toBe(taskId);
    expect(updatedTask.title).toBe(updateInput.title);
    expect(updatedTask.status).toBe('READY');
  });

  test('should verify that system fields are stripped (no _key, _id, _rev)', async () => {
    const taskInput = {
      title: 'Privacy Check Task',
      status: 'OPEN',
      project: 'Privacy',
    };
    const result = await resolvers.Mutation.createTask(null, { input: taskInput });
    
    expect(result._key).toBeUndefined();
    expect(result._id).toBeUndefined();
    expect(result._rev).toBeUndefined();
    expect(result.id).toBeDefined();
  });
});
