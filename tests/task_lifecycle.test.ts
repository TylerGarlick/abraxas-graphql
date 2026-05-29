import { expect, test, describe } from 'bun:test';
import { resolvers } from '../src/resolvers';
import { db, aql } from '../src/common/db';

describe('Task Lifecycle E2E', () => {
  test('Full Lifecycle: Create -> Update -> Delete (Cascade)', async () => {
    const hierarchyInput = {
      title: 'Root Task',
      status: 'OPEN',
      project: 'LifecycleTest',
      subtasks: [
        {
          title: 'Child Task',
          status: 'OPEN',
          project: 'LifecycleTest',
          subtasks: [
            {
              title: 'Grandchild Task',
              status: 'OPEN',
              project: 'LifecycleTest',
              subtasks: [],
            },
          ],
        },
      ],
    };

    // 1. CREATE
    const rootTask = await resolvers.Mutation.createTask(null, { input: hierarchyInput });
    expect(rootTask.id).toBeDefined();
    const rootId = rootTask.id;

    // 2. UPDATE
    const updatedRoot = await resolvers.Mutation.updateTask(null, { 
      id: rootId, 
      input: { title: 'Updated Root Task' } 
    });
    expect(updatedRoot.title).toBe('Updated Root Task');

    // 3. VERIFY HIERARCHY before delete
    const fetched = await resolvers.Query.getTask(null, { id: rootId });
    expect(fetched?.subtasks).toHaveLength(1);
    expect(fetched?.subtasks[0].subtasks).toHaveLength(1);

    // 4. DELETE (CASCADE)
    const deleted = await resolvers.Mutation.deleteTask(null, { id: rootId });
    expect(deleted).toBe(true);

    // 5. VERIFY ABSENCE (Root)
    const rootGone = await resolvers.Query.getTask(null, { id: rootId });
    expect(rootGone).toBeNull();

    // 6. VERIFY ABSENCE (Children)
    const childId = fetched?.subtasks[0].id;
    const childGone = await resolvers.Query.getTask(null, { id: childId });
    expect(childGone).toBeNull();

    const grandchildId = fetched?.subtasks[0].subtasks[0].id;
    const grandchildGone = await resolvers.Query.getTask(null, { id: grandchildId });
    expect(grandchildGone).toBeNull();

    // 7. VERIFY EDGES ARE GONE
    const edges = await db.query(aql`FOR e IN TASK_EDGES RETURN e`);
    const allEdges = await edges.all();
    const remainingEdges = allEdges.filter((e: any) => 
      e._from.includes(rootId) || e._to.includes(rootId)
    );
    expect(remainingEdges).toHaveLength(0);
  }, { timeout: 20000 });
});
