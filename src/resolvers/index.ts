import { db, aql } from '../common/db'
import { mapArangoDoc, mapArangoList } from '../common/mapper'
import { GraphQLError } from 'graphql'

const getCol = (name: string) => db.collection(name);

export const resolvers = {
  Query: {
    getDatabaseStatus: async () => {
      try {
        const version = await db.version();
        return {
          version,
          status: 'ACCESSIBLE',
        };
      } catch (error) {
        return {
          version: null,
          status: 'INACCESSIBLE',
        };
      }
    },
    getState: async () => {
      const taskCursor = await db.query(aql`FOR t IN tasks FILTER t.status == 'READY' RETURN t`);
      const tasks = await taskCursor.all();
      const incidentCursor = await db.query(aql`FOR i IN incidents FILTER i.resolved == false RETURN i`);
      const incidents = await incidentCursor.all();
      const memoryCursor = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`);
      const memory = await memoryCursor.all();
      
      return {
        unresolvedIncidents: incidents.length,
        readyTasks: mapArangoList(tasks),
        recentMemory: mapArangoDoc(memory[0]) || null,
      };
    },
    getTask: async (_, { id }) => {
      const cursor = await db.query(aql`FOR t IN tasks FILTER t._key == ${id} RETURN t`);
      const results = await cursor.all();
      const task = results[0];
      if (!task) return null;

      const resolveTask = async (t: any): Promise<any> => {
        const subtaskCursor = await db.query(aql`
          FOR v IN 1..1 OUTBOUND ${t._id} TASK_EDGES 
          RETURN v
        `);
        const subtasks = await subtaskCursor.all();
        
        return {
          ...mapArangoDoc(t),
          subtasks: await Promise.all(subtasks.map(st => resolveTask(st))),
        };
      };

      return resolveTask(task);
    },
    getTasks: async (_, { project, status }) => {
      const cursor = await db.query(aql`
        FOR t IN tasks 
        FILTER (${project ? aql`t.project == ${project}` : 'true'}) 
        FILTER (${status ? aql`t.status == ${status}` : 'true'}) 
        RETURN t
      `);
      const tasks = await cursor.all();
      
      const enrichedTasks = await Promise.all(tasks.map(async (task) => {
        const subtaskCursor = await db.query(aql`
          FOR v IN 1..1 OUTBOUND ${task._id} TASK_EDGES 
          RETURN v
        `);
        const subtasks = await subtaskCursor.all();
        return {
          ...mapArangoDoc(task),
          subtasks: mapArangoList(subtasks),
        };
      }));
      
      return enrichedTasks;
    },

    getTasks: async (_, { project, status }) => {
      const cursor = await db.query(aql`
        FOR t IN tasks 
        FILTER (${project ? aql`t.project == ${project}` : 'true'}) 
        FILTER (${status ? aql`t.status == ${status}` : 'true'}) 
        RETURN t
      `);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getSoterIncidents: async () => {
      const cursor = await db.query(aql`FOR i IN incidents RETURN i`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getSoterReviews: async () => {
      const cursor = await db.query(aql`FOR r IN reviews RETURN r`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getEpistemicMarks: async () => {
      const cursor = await db.query(aql`FOR e IN epistemic_marks RETURN e`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getShadowEntries: async () => {
      const cursor = await db.query(aql`FOR s IN shadow_entries RETURN s`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getSymbolNodes: async () => {
      const cursor = await db.query(aql`FOR sy IN symbols RETURN sy`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getBenchmarkResults: async () => {
      const cursor = await db.query(aql`FOR b IN benchmark_results RETURN b`);
      const results = await cursor.all();
      return mapArangoList(results);
    },
    getProvenanceChain: async (_, { planId }) => {
      const chain = await db.query(aql`
        FOR p IN 1..3 OUTBOUND ${planId} provenance_edges
        RETURN {
          plan: p.document,
          concept: p.vertices[0],
          hypothesis: p.vertices[1],
          session: p.vertices[2]
        }
      `);
      if (!chain[0]) return null;
      const { plan, concept, hypothesis, session } = chain[0];
      return {
        plan: mapArangoDoc(plan),
        concept: mapArangoDoc(concept),
        hypothesis: mapArangoDoc(hypothesis),
        session: mapArangoDoc(session),
        planToConceptEdge: mapArangoDoc(p.edges[0]?.document), // This needs the actual edge doc
        conceptToHypothesisEdge: mapArangoDoc(p.edges[1]?.document),
        hypothesisToSessionEdge: mapArangoDoc(p.edges[2]?.document),
      };
    },
    getRecentMemory: async () => {
      const memories = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`);
      return mapArangoDoc(memories[0]) || null;
    },
    getRelevantContext: async (_, { conceptId }) => {
      const results = await db.query(aql`FOR c IN concepts FILTER c._key == ${conceptId} RETURN c`);
      return mapArangoList(results);
    },
    verifyGenealogy: async (_, { conceptId }) => {
      const results = await db.query(aql`FOR p IN 1..5 OUTBOUND ${conceptId} provenance_edges RETURN p`);
      return results.map(p => ({
        ...p,
        // ProvenanceChain requires specific structure, mapping the vertices and edges here
      }));
    }
  },
  Mutation: {
    createTask: async (_, { input }) => {
      const now = new Date().toISOString();
      
      const createRecursiveTask = async (taskInput: any, parentId?: string) => {
        const cursor = await db.query(aql`
          INSERT {
            title: ${taskInput.title},
            status: ${taskInput.status},
            priority: ${taskInput.priority ?? null},
            project: ${taskInput.project ?? null},
            scope: ${taskInput.scope ?? null},
            description: ${taskInput.description ?? null},
            notes: ${taskInput.notes ?? null},
            definitionOfDone: ${taskInput.definitionOfDone ?? null},
            prompt: ${taskInput.prompt ?? null},
            results: ${taskInput.results ?? null},
            createdAt: ${now},
            updatedAt: ${now}
          } INTO tasks RETURN NEW
        `);
        const results = await cursor.all();
        const task = results[0];
        
        if (parentId) {
          await db.query(aql`
            INSERT {
              _from: ${parentId},
              _to: ${task._id},
              type: 'SUBTASK'
            } INTO TASK_EDGES
          `);
        }
        
        if (taskInput.subtasks && Array.isArray(taskInput.subtasks)) {
          for (const subtask of taskInput.subtasks) {
            await createRecursiveTask(subtask, task._id);
          }
        }
        
        return task;
      };

      const finalTask = await createRecursiveTask(input);
      return mapArangoDoc(finalTask);
    },


    updateTask: async (_, { id, input }) => {
      const now = new Date().toISOString();
      const cursor = await db.query(aql`
        UPDATE ${id} WITH {
          title: ${input.title ?? null},
          status: ${input.status ?? null},
          priority: ${input.priority ?? null},
          project: ${input.project ?? null},
          scope: ${input.scope ?? null},
          description: ${input.description ?? null},
          notes: ${input.notes ?? null},
          definitionOfDone: ${input.definitionOfDone ?? null},
          prompt: ${input.prompt ?? null},
          results: ${input.results ?? null},
          updatedAt: ${now}
        } IN tasks RETURN NEW
      `);
      const results = await cursor.all();
      return mapArangoDoc(results[0]);
    },

    updateTaskStatus: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH { status: ${input.status} } IN tasks
      `);
      return mapArangoDoc(result);
    },
    createDependency: async (_, { input }) => {
      await db.query(aql`
        INSERT {
          _from: CONCAT('tasks/', ${input.fromId}),
          _to: CONCAT('tasks/', ${input.toId}),
          depType: ${input.depType}
        } INTO task_dependencies
      `);
      return { fromId: input.fromId, toId: input.toId, depType: input.depType };
    },
    createIncident: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: ${input.timestamp || aql`DATE_ISO8601()`}
        } INTO incidents
      `);
      return mapArangoDoc(result[0]);
    },
    updateIncident: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN incidents
      `);
      return mapArangoDoc(result);
    },
    createReview: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          createdAt: DATE_ISO8601()
        } INTO reviews
      `);
      return mapArangoDoc(result[0]);
    },
    updateReview: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN reviews
      `);
      return mapArangoDoc(result);
    },
    createEpistemicMark: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO epistemic_marks
      `);
      return mapArangoDoc(result[0]);
    },
    updateEpistemicMark: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN epistemic_marks
      `);
      return mapArangoDoc(result);
    },
    createShadowEntry: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO shadow_entries
      `);
      return mapArangoDoc(result[0]);
    },
    updateShadowEntry: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN shadow_entries
      `);
      return mapArangoDoc(result);
    },
    createSymbol: async (_, { name, stage }) => {
      const result = await db.query(aql`
        INSERT { name, stage } INTO symbols
      `);
      return mapArangoDoc(result[0]);
    },
    updateSymbol: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH {
          stage: ${input.stage},
          intention: ${input.intention}
        } IN symbols
      `);
      return mapArangoDoc(result);
    },
    createPivot: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO pivots
      `);
      return mapArangoDoc(result[0]);
    },
    createQuest: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO quests
      `);
      return mapArangoDoc(result[0]);
    },
    createPlan: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          groundingStatus: 'PENDING'
        } INTO plans
      `);
      return mapArangoDoc(result[0]);
    },
    updatePlan: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN plans
      `);
      return mapArangoDoc(result);
    },
    createMemoryFragment: async (_, { fragment, provenance }) => {
      const result = await db.query(aql`
        INSERT {
          fragment,
          provenance,
          timestamp: DATE_ISO8601()
        } INTO memory_fragments
      `);
      return mapArangoDoc(result[0]);
    },
    setSourceCredibility: async (_, { sourceId, tier }) => {
      await db.query(aql`
        UPDATE ${sourceId} WITH { credibilityTier: ${tier} } IN sources
      `);
      return { sourceId, tier };
    },
    recordConsensus: async (_, { divergence, agreement }) => {
      const result = await db.query(aql`
        INSERT {
          divergence,
          agreement,
          timestamp: DATE_ISO8601()
        } INTO consensus_logs
      `);
      return mapArangoDoc(result[0]);
    },
    bootSovereign: async (_, { config }) => {
      await db.query(aql`
        INSERT {
          proposal: 'BOOT SEQUENCE',
          expectedDelta: 'INIT_STATE',
          status: 'SOVEREIGN_SEAL',
          timestamp: DATE_ISO8601(),
          config: ${config}
        } INTO pivots
      `);
      
      return await resolvers.Query.getState();
    }
  }
}
