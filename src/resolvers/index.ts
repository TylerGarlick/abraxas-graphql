import { db, aql } from '../common/db'
import { GraphQLError } from 'graphql'

const getCol = (name: string) => db.collection(name);

export const resolvers = {
  Query: {
    getState: async () => {
      const tasks = await db.query(aql`FOR t IN tasks FILTER t.status == 'READY' RETURN t`);
      const incidents = await db.query(aql`FOR i IN incidents FILTER i.resolved == false RETURN i`);
      const memory = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`);
      
      return {
        unresolvedIncidents: incidents.length,
        readyTasks: tasks,
        recentMemory: memory[0] || null,
      };
    },
    getTask: async (_, { id }) => {
      const cursor = await db.query(aql`FOR t IN tasks FILTER t._key == ${id} RETURN t`);
      return cursor[0] || null;
    },
    getTasks: async (_, { project, status }) => {
      const cursor = await db.query(aql`
        FOR t IN tasks 
        FILTER (${project ? aql`t.project == ${project}` : 'true'}) 
        FILTER (${status ? aql`t.status == ${status}` : 'true'}) 
        RETURN t
      `);
      return cursor;
    },
    getSoterIncidents: async () => {
      return await db.query(aql`FOR i IN incidents RETURN i`);
    },
    getSoterReviews: async () => {
      return await db.query(aql`FOR r IN reviews RETURN r`);
    },
    getEpistemicMarks: async () => {
      return await db.query(aql`FOR e IN epistemic_marks RETURN e`);
    },
    getShadowEntries: async () => {
      return await db.query(aql`FOR s IN shadow_entries RETURN s`);
    },
    getSymbolNodes: async () => {
      return await db.query(aql`FOR sy IN symbols RETURN sy`);
    },
    getBenchmarkResults: async () => {
      return await db.query(aql`FOR b IN benchmark_results RETURN b`);
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
      return chain[0] || null;
    },
    getRecentMemory: async () => {
      const memories = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`);
      return memories[0] || null;
    },
    getRelevantContext: async (_, { conceptId }) => {
      return await db.query(aql`FOR c IN concepts FILTER c._key == ${conceptId} RETURN c`);
    },
    verifyGenealogy: async (_, { conceptId }) => {
      return await db.query(aql`FOR p IN 1..5 OUTBOUND ${conceptId} provenance_edges RETURN p`);
    }
  },
  Mutation: {
    createTask: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          createdAt: DATE_ISO8601(),
          updatedAt: DATE_ISO8601()
        } INTO tasks
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updateTask: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH {
          ...${input},
          updatedAt: DATE_ISO8601()
        } IN tasks
      `);
      return { id: result._key, ...result };
    },
    updateTaskStatus: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH { status: ${input.status} } IN tasks
      `);
      return { id: result._key, ...result };
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
      return { id: result[0]._key, ...result[0] };
    },
    updateIncident: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN incidents
      `);
      return { id: result._key, ...result };
    },
    createReview: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          createdAt: DATE_ISO8601()
        } INTO reviews
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updateReview: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN reviews
      `);
      return { id: result._key, ...result };
    },
    createEpistemicMark: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO epistemic_marks
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updateEpistemicMark: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN epistemic_marks
      `);
      return { id: result._key, ...result };
    },
    createShadowEntry: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO shadow_entries
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updateShadowEntry: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN shadow_entries
      `);
      return { id: result._key, ...result };
    },
    createSymbol: async (_, { name, stage }) => {
      const result = await db.query(aql`
        INSERT { name, stage } INTO symbols
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updateSymbol: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH {
          stage: ${input.stage},
          intention: ${input.intention}
        } IN symbols
      `);
      return { id: result._key, ...result };
    },
    createPivot: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO pivots
      `);
      return { id: result[0]._key, ...result[0] };
    },
    createQuest: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          timestamp: DATE_ISO8601()
        } INTO quests
      `);
      return { id: result[0]._key, ...result[0] };
    },
    createPlan: async (_, { input }) => {
      const result = await db.query(aql`
        INSERT {
          ...${input},
          groundingStatus: 'PENDING'
        } INTO plans
      `);
      return { id: result[0]._key, ...result[0] };
    },
    updatePlan: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN plans
      `);
      return { id: result._key, ...result };
    },
    createMemoryFragment: async (_, { fragment, provenance }) => {
      const result = await db.query(aql`
        INSERT {
          fragment,
          provenance,
          timestamp: DATE_ISO8601()
        } INTO memory_fragments
      `);
      return { id: result[0]._key, ...result[0] };
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
      return { id: result[0]._key, ...result[0] };
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
