import { expect, test, describe } from "bun:test";
import { resolvers } from "../src/resolvers/index";
import { db, aql } from "../src/common/db";

describe("getTasks Recursive Verification", () => {
  test("should fetch full recursive subtask hierarchy", async () => {
    // 1. Setup: Create 3-level hierarchy
    // Parent -> Child -> Grandchild
    const parent = await resolvers.Mutation.createTask(null, {
      input: { title: "Root Parent", status: "OPEN", project: "Recursive-Test" }
    });
    
    const child = await resolvers.Mutation.createTask(null, {
      input: { title: "Mid Child", status: "OPEN", project: "Recursive-Test" }
    });

    const grandchild = await resolvers.Mutation.createTask(null, {
      input: { title: "Leaf Grandchild", status: "OPEN", project: "Recursive-Test" }
    });

    // Use internal IDs (_id) for the edges
    const getInternalId = async (key: string) => {
      const res = await db.query(aql`FOR t IN tasks FILTER t._key == ${key} RETURN t._id`);
      const results = await res.all();
      return results[0];
    };

    const pId = await getInternalId(parent.id);
    const cId = await getInternalId(child.id);
    const gId = await getInternalId(grandchild.id);

    // Create edges
    await db.query(aql`
      INSERT { _from: ${pId}, _to: ${cId}, type: 'SUBTASK' } INTO TASK_EDGES
    `);
    await db.query(aql`
      INSERT { _from: ${cId}, _to: ${gId}, type: 'SUBTASK' } INTO TASK_EDGES
    `);

    // 2. Execute getTasks
    const tasks = await resolvers.Query.getTasks(null, { project: "Recursive-Test" });
    console.log("Fetched Tasks:", JSON.stringify(tasks, null, 2));
    
    // Find the root parent
    const root = tasks.find(t => t.title === "Root Parent");
    expect(root).toBeDefined();
    
    // Verify Child
    expect(root?.subtasks).toHaveLength(1);
    const midChild = root?.subtasks[0];
    expect(midChild?.title).toBe("Mid Child");
    
    // Verify Grandchild (Recursive Depth)
    expect(midChild?.subtasks).toHaveLength(1);
    const leaf = midChild?.subtasks[0];
    expect(leaf?.title).toBe("Leaf Grandchild");

    // Cleanup
    await db.query(aql`FOR t IN tasks FILTER t.project == 'Recursive-Test' REMOVE t IN tasks`);
    await db.query(aql`FOR e IN TASK_EDGES FILTER e._from IN (FOR t IN tasks FILTER t.project == 'Recursive-Test' RETURN t._id) REMOVE e IN TASK_EDGES`);
  });
});
