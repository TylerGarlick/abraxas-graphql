import { expect, test, describe } from 'bun:test';
import { resolvers } from '../src/resolvers';

describe('Task Hierarchy E2E Tests', () => {
  test('should create and retrieve a nested task hierarchy (Parent -> Child -> Grandchild)', async () => {
    const hierarchyInput = {
      title: 'Root Task',
      status: 'OPEN',
      project: 'HierarchyTest',
      subtasks: [
        {
          title: 'Child Task 1',
          status: 'OPEN',
          project: 'HierarchyTest',
          subtasks: [
            {
              title: 'Grandchild Task 1.1',
              status: 'OPEN',
              project: 'HierarchyTest',
              subtasks: [],
            },
          ],
        },
        {
          title: 'Child Task 2',
          status: 'OPEN',
          project: 'HierarchyTest',
          subtasks: [],
        },
      ],
    };

    // 1. Create the hierarchy
    const rootTask = await resolvers.Mutation.createTask(null, { input: hierarchyInput });
    expect(rootTask).toBeDefined();
    expect(rootTask.id).toBeDefined();

    // 2. Fetch the root task and verify nested subtasks
    const fetchedRoot = await resolvers.Query.getTask(null, { id: rootTask.id });
    expect(fetchedRoot).toBeDefined();
    expect(fetchedRoot?.title).toBe('Root Task');
    expect(fetchedRoot?.subtasks).toHaveLength(2);
    
    const child1 = fetchedRoot?.subtasks.find(t => t.title === 'Child Task 1');
    expect(child1).toBeDefined();
    expect(child1?.subtasks).toHaveLength(1);
    expect(child1?.subtasks[0].title).toBe('Grandchild Task 1.1');

    const child2 = fetchedRoot?.subtasks.find(t => t.title === 'Child Task 2');
    expect(child2).toBeDefined();
    expect(child2?.subtasks).toEqual([]);
  });

  test('should return empty array for subtasks when none exist', async () => {
    const taskInput = {
      title: 'Single Task',
      status: 'OPEN',
      project: 'SimpleTest',
    };
    const created = await resolvers.Mutation.createTask(null, { input: taskInput });
    const fetched = await resolvers.Query.getTask(null, { id: created.id });
    expect(fetched?.subtasks).toEqual([]);
  });
});
