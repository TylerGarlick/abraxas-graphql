import { db, aql } from '../common/db'
import { mapArangoDoc, mapArangoList } from '../common/mapper'
import { GraphQLError } from 'graphql'

const getCol = (name: string) => db.collection(name)

async function applySoterVeto(input: any, forcePass = false) {
  if (forcePass) return 0
  const riskScore = Math.floor(Math.random() * 100) // Mocked risk scoring
  if (riskScore > 80) {
    throw new GraphQLError('Soter Veto: Operation blocked due to high risk score.')
  }
  return riskScore
}

const epistemicSieve = (data: any) => {
  if (!data) return null
  // Deterministic labeling based on presence of evidence/provenance
  const label = data.verified ? 'KNOWN' : (data.inferred ? 'INFERRED' : 'UNCERTAIN')
  return { ...data, label }
}

export const resolvers = {
  Query: {
    getDatabaseStatus: async () => {
      try {
        const version = await db.version()
        return {
          version,
          status: 'ACCESSIBLE',
        }
      } catch (error) {
        return {
          version: 'UNKNOWN',
          status: 'INACCESSIBLE',
        }
      }
    },
    getState: async () => {
      const taskCursor = await db.query(aql`FOR t IN tasks FILTER t.status == 'READY' RETURN t`)
      const tasks = await taskCursor.all()
      const incidentCursor = await db.query(aql`FOR i IN incidents FILTER i.resolved == false RETURN i`)
      const incidents = await incidentCursor.all()
      const memoryCursor = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`)
      const memory = await memoryCursor.all()

      return {
        unresolvedIncidents: incidents.length,
        readyTasks: mapArangoList(tasks, 'Task'),
        recentMemory: mapArangoDoc(memory[0], 'MemoryFragment'),
      }
    },
    getTask: async (_, { id }) => {
      const cursor = await db.query(aql`FOR t IN tasks FILTER t._key == ${id} RETURN t`)
      const results = await cursor.all()
      const task = results[0]
      if (!task) return mapArangoDoc(null, 'Task')

      const resolveTask = async (t: any): Promise<any> => {
        const subtaskCursor = await db.query(aql`
          FOR v IN 1..1 OUTBOUND ${t._id} TASK_EDGES 
          RETURN v
        `)
        const subtasks = await subtaskCursor.all()

        return {
          ...mapArangoDoc(t, 'Task'),
          subtasks: await Promise.all(subtasks.map(st => resolveTask(st))),
        }
      }

      return resolveTask(task)
    },
    getTasks: async (_, { project, status }) => {
      const cursor = await db.query(aql`
        FOR t IN tasks 
        FILTER (${project ? aql`t.project == ${project}` : 'true'}) 
        FILTER (${status ? aql`t.status == ${status}` : 'true'}) 
        RETURN t
      `)
      const tasks = await cursor.all()

      const enrichedTasks = await Promise.all(tasks.map(async (task) => {
        const subtaskCursor = await db.query(aql`
          FOR v IN 1..1 OUTBOUND ${task._id} TASK_EDGES 
          RETURN v
        `)
        const subtasks = await subtaskCursor.all()
        return {
          ...mapArangoDoc(task, 'Task'),
          subtasks: mapArangoList(subtasks, 'Task'),
        }
      }))

      return enrichedTasks
    },
    getSoterIncidents: async () => {

      const cursor = await db.query(aql`FOR i IN incidents RETURN i`)
      const results = await cursor.all()
      return mapArangoList(results, 'SoterIncident')
    },
    getSoterReviews: async () => {
      const cursor = await db.query(aql`FOR r IN reviews RETURN r`)
      const results = await cursor.all()
      return mapArangoList(results, 'SoterReview')
    },
    getEpistemicMarks: async () => {
      const cursor = await db.query(aql`FOR e IN epistemic_marks RETURN e`)
      const results = await cursor.all()
      return mapArangoList(results, 'EpistemicMark')
    },
    getShadowEntries: async () => {
      const cursor = await db.query(aql`FOR s IN shadow_entries RETURN s`)
      const results = await cursor.all()
      return mapArangoList(results, 'ShadowEntry')
    },
    getSymbolNodes: async () => {
      const cursor = await db.query(aql`FOR sy IN symbols RETURN sy`)
      const results = await cursor.all()
      return mapArangoList(results, 'SymbolNode')
    },
    getBenchmarkResults: async () => {
      const cursor = await db.query(aql`FOR b IN benchmark_results RETURN b`)
      const results = await cursor.all()
      return mapArangoList(results, 'BenchmarkResult')
    },
    getProvenanceChain: async (_, { planId }) => {
      const chainCursor = await db.query(aql`
        FOR p IN 1..3 OUTBOUND ${planId} provenance_edges
        RETURN {
          plan: p.document,
          concept: p.vertices[0],
          hypothesis: p.vertices[1],
          session: p.vertices[2],
          edges: p.edges
        }
      `)
      const chain = await chainCursor.all()
      if (!chain[0]) return {
        plan: mapArangoDoc(null, 'ActionablePlan'),
        concept: mapArangoDoc(null, 'Concept'),
        hypothesis: mapArangoDoc(null, 'SoterIncident'), // Example placeholder since Hypothesis default wasn't fully defined, using SoterIncident or creating one
        session: mapArangoDoc(null, 'MemoryFragment'),
        planToConceptEdge: mapArangoDoc(null, 'EdgeInfo'),
        conceptToHypothesisEdge: mapArangoDoc(null, 'EdgeInfo'),
        hypothesisToSessionEdge: mapArangoDoc(null, 'EdgeInfo'),
      }

      const { plan, concept, hypothesis, session, edges } = chain[0]
      return {
        plan: mapArangoDoc(plan, 'ActionablePlan'),
        concept: mapArangoDoc(concept, 'Concept'),
        hypothesis: mapArangoDoc(hypothesis, 'SoterIncident'), 
        session: mapArangoDoc(session, 'MemoryFragment'),
        planToConceptEdge: mapArangoDoc(edges[0]?.document, 'EdgeInfo'),
        conceptToHypothesisEdge: mapArangoDoc(edges[1]?.document, 'EdgeInfo'),
        hypothesisToSessionEdge: mapArangoDoc(edges[2]?.document, 'EdgeInfo'),
      }
    },
    getRecentMemory: async () => {
      const memories = await db.query(aql`FOR m IN memory_fragments SORT m.timestamp DESC LIMIT 1 RETURN m`)
      return mapArangoDoc(memories[0], 'MemoryFragment')
    },
    getRelevantContext: async (_, { conceptId }) => {
      const results = await db.query(aql`FOR c IN concepts FILTER c._key == ${conceptId} RETURN c`)
      return mapArangoList(results, 'Concept')
    },
    getConsensus: async (_, { claim }) => {
      const result = await db.query(aql`FOR c IN consensus FILTER c.claim == ${claim} RETURN c`)
      const docs = await result.all()
      return mapArangoDoc(docs[0], 'JanusConsensus')
    },
    getSovereignReceipt: async (_, { claimId }) => {
      const claimCursor = await db.query(aql`FOR c IN claims FILTER c._key == ${claimId} RETURN c`)
      const claims = await claimCursor.all()
      const claim = claims[0]
      if (!claim) return {
        claim: mapArangoDoc(null, 'JanusConsensus'),
        consensusSeal: 'SVR-UNKNOWN-0',
        provenanceChain: [],
      }

      const eventCursor = await db.query(aql`
        FOR e IN events 
        FILTER e.claimId == ${claimId}
        SORT e.index ASC
        RETURN e
      `)
      const events = await eventCursor.all()

      return {
        claim: mapArangoDoc(claim, 'JanusConsensus'),
        consensusSeal: `SVR-${claim._key.toUpperCase()}-${events.length}`,
        provenanceChain: mapArangoList(events, 'MemoryFragment'),
      }
    },
  },
  Mutation: {
    createTask: async (_, { input }) => {
      return await applySoterVeto(input, true).then(async () => {
        const now = new Date().toISOString()

        const createRecursiveTask = async (taskInput: any, parentId?: string) => {
          try {
            const cursor = await db.query(aql`
                INSERT
                {
                title:
                ${taskInput.title},
                status
                :
                ${taskInput.status},
                priority
                :
                ${taskInput.priority ?? null},
                project
                :
                ${taskInput.project ?? null},
                scope
                :
                ${taskInput.scope ?? null},
                description
                :
                ${taskInput.description ?? null},
                notes
                :
                ${taskInput.notes ?? null},
                definitionOfDone
                :
                ${taskInput.definitionOfDone ?? null},
                prompt
                :
                ${taskInput.prompt ?? null},
                results
                :
                ${taskInput.results ?? null},
                createdAt
                :
                ${now},
                updatedAt
                :
                ${now}
                }
                INTO
                tasks
                RETURN
                NEW
            `)
            const results = await cursor.all()
            const task = results[0]

            if (!task) throw new Error('Failed to insert task')

            if (parentId) {
              await db.query(aql`
                  INSERT
                  {
                  _from:
                  ${parentId},
                  _to
                  :
                  ${task._id},
                  type
                  :
                  'SUBTASK'
                  }
                  INTO
                  TASK_EDGES
              `)
            }

            if (taskInput.subtasks && Array.isArray(taskInput.subtasks)) {
              for (const subtask of taskInput.subtasks) {
                await createRecursiveTask(subtask, task._id)
              }
            }

            return task
          } catch (error: any) {
            console.error(`Error creating task ${taskInput.title}:`, error)
            throw error
          }
        }

        const finalTask = await createRecursiveTask(input)
        return mapArangoDoc(finalTask)
      })
    },


    updateTask: async (_, { id, input }) => {
      const now = new Date().toISOString()
      return await applySoterVeto(input).then(async () => {
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
        `)
        const results = await cursor.all()
        return mapArangoDoc(results[0])
      })
    },
    deleteTask: async (_, { id }) => {
      const taskCursor = await db.query(aql`FOR t IN tasks FILTER t._key == ${id} RETURN t`)
      const taskResults = await taskCursor.all()
      const task = taskResults[0]
      if (!task) return false

      const taskInternalId = task._id

      const cascadeDelete = async (currentId: string) => {
        const childrenCursor = await db.query(aql`
          FOR v IN 1..1 OUTBOUND ${currentId} TASK_EDGES 
          RETURN v
        `)
        const children = await childrenCursor.all()

        if (children && children.length > 0) {
          for (const child of children) {
            await cascadeDelete(child._id)
          }
        }

        await db.query(aql`
          FOR edge IN TASK_EDGES 
          FILTER edge._from == ${currentId} OR edge._to == ${currentId} 
          REMOVE edge IN TASK_EDGES
        `)

        try {
          await db.collection('tasks').remove(currentId.split('/')[1])
        } catch (e) {
          // Ignore
        }
      }

      try {
        await cascadeDelete(taskInternalId)
        return true
      } catch (e) {
        console.error('Cascade delete failed:', e)
        return false
      }
    },


    updateTaskStatus: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH { status: ${input.status} } IN tasks RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createDependency: async (_, { input }) => {
      await db.query(aql`
          INSERT
          {
          _from: CONCAT('tasks/',
          ${input.fromId}
          ),
          _to
          :
          CONCAT
          (
          'tasks/',
          ${input.toId}
          ),
          depType
          :
          ${input.depType}
          }
          INTO
          task_dependencies
      `)
      return { fromId: input.fromId, toId: input.toId, depType: input.depType }
    },
    createIncident: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          request:
          ${input.request},
          score
          :
          ${input.score},
          resolved
          :
          ${input.resolved ?? false},
          timestamp
          :
          ${input.timestamp || now},
          patterns
          :
          ${input.patterns ?? []}
          }
          INTO
          incidents
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updateIncident: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN incidents RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createReview: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          incidentId:
          ${input.incidentId},
          status
          :
          ${input.status},
          priority
          :
          ${input.priority},
          decision
          :
          ${input.decision ?? null},
          createdAt
          :
          ${now}
          }
          INTO
          reviews
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updateReview: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN reviews RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createEpistemicMark: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          label:
          ${input.label},
          topic
          :
          ${input.topic},
          reasoningChain
          :
          ${input.reasoningChain ?? null},
          sessionId
          :
          ${input.sessionId ?? null},
          timestamp
          :
          ${now}
          }
          INTO
          epistemic_marks
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updateEpistemicMark: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN epistemic_marks RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createShadowEntry: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          category:
          ${input.category},
          content
          :
          ${input.content},
          sessionId
          :
          ${input.sessionId ?? null},
          timestamp
          :
          ${now}
          }
          INTO
          shadow_entries
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updateShadowEntry: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN shadow_entries RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createSymbol: async (_, { name, stage }) => {
      const result = await db.query(aql`
          INSERT
          { name:
          ${name},
          stage
          :
          ${stage}
          }
          INTO
          symbols
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updateSymbol: async (_, { input }) => {
      const result = await db.query(aql`
        UPDATE ${input.id} WITH {
          stage: ${input.stage},
          intention: ${input.intention}
        } IN symbols RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createPivot: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          ruptureId:
          ${input.ruptureId},
          proposal
          :
          ${input.proposal},
          expectedDelta
          :
          ${input.expectedDelta},
          channelId
          :
          ${input.channelId},
          timestamp
          :
          ${now}
          }
          INTO
          pivots
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createQuest: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          unknownId:
          ${input.unknownId},
          focusArea
          :
          ${input.focusArea},
          channelId
          :
          ${input.channelId},
          timestamp
          :
          ${now}
          }
          INTO
          quests
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createPlan: async (_, { input }) => {
      const result = await db.query(aql`
          INSERT
          {
          summary:
          ${input.summary},
          steps
          :
          ${input.steps ?? []},
          riskAssessment
          :
          ${input.riskAssessment ?? null},
          groundingStatus
          :
          'PENDING'
          }
          INTO
          plans
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    updatePlan: async (_, { id, input }) => {
      const result = await db.query(aql`
        UPDATE ${id} WITH ${input} IN plans RETURN NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createMemoryFragment: async (_, { fragment, provenance }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          fragment:
          ${fragment},
          provenance
          :
          ${provenance},
          timestamp
          :
          ${now}
          }
          INTO
          memory_fragments
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    setSourceCredibility: async (_, { sourceId, tier }) => {
      await db.query(aql`
        UPDATE ${sourceId} WITH { credibilityTier: ${tier} } IN sources
      `)
      return { sourceId, tier }
    },
    recordConsensus: async (_, { divergence, agreement }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          divergence,
          agreement,
          timestamp:
          ${now}
          }
          INTO
          consensus_logs
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    bootSovereign: async (_, { config }) => {
      const now = new Date().toISOString()
      await db.query(aql`
          INSERT
          {
          proposal: 'BOOT SEQUENCE',
          expectedDelta: 'INIT_STATE',
          status: 'SOVEREIGN_SEAL',
          timestamp:
          ${now},
          config
          :
          ${config}
          }
          INTO
          pivots
      `)

      return await resolvers.Query.getState()
    },

    createConsensus: async (_, { input }) => {
      const now = new Date().toISOString()
      const result = await db.query(aql`
          INSERT
          {
          claim:
          ${input.claim},
          evidence
          :
          ${input.evidence ?? []},
          confidence
          :
          ${input.confidence},
          label
          :
          ${input.label ?? 'UNCERTAIN'},
          timestamp
          :
          ${now}
          }
          INTO
          consensus
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    createQualiaBridge: async (_, { input }) => {
      const result = await db.query(aql`
          INSERT
          {
          solSide:
          ${input.solSide},
          noxSide
          :
          ${input.noxSide},
          bridgeStatus
          :
          'ACTIVE',
          resonance
          :
          1.0,
          }
          INTO
          qualia_bridges
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
    triggerSovereignQuest: async (_, { focusArea, unknownId }) => {
      return await applySoterVeto({ focusArea, unknownId }).then(async () => {
        const now = new Date().toISOString()
        const questCursor = await db.query(aql`
            INSERT
            {
            unknownId:
            ${unknownId},
            focusArea
            :
            ${focusArea},
            status
            :
            'ACTIVE',
            discoveredEvidence
            :
            [
            ],
            timestamp
            :
            ${now}
            }
            INTO
            quests
            RETURN
            NEW
        `)
        const quests = await questCursor.all()
        const quest = quests[0]

        const discoveryTasks = [
          { title: `Audit ${focusArea} for ${unknownId}`, status: 'READY' },
          { title: `Cross-reference ${unknownId} with Mnemosyne Vault`, status: 'READY' },
        ]

        for (const taskData of discoveryTasks) {
          await db.query(aql`
              INSERT
              {
              title:
              ${taskData.title},
              status
              :
              ${taskData.status},
              project
              :
              'Sovereign-Quest',
              createdAt
              :
              ${now}
              }
              INTO
              tasks
          `)
        }

        return mapArangoDoc(quest)
      })
    },
    integrateSymbol: async (_, { symbolId, archetypeId }) => {
      const result = await db.query(aql`
          INSERT
          {
          symbolId:
          ${symbolId},
          archetypeId
          :
          ${archetypeId},
          integrationQuality
          :
          1.0,
          notes
          :
          'Automated integration'
          }
          INTO
          symbolic_integrations
          RETURN
          NEW
      `)
      const docs = await result.all()
      return mapArangoDoc(docs[0])
    },
  },
}

