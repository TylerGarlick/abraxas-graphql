import { db } from '../common/db'
import { CollectionType } from 'arangojs/collections'

const edges = [
  'STORED_IN',
  'DEPENDS_ON',
  'NEXT_STEP',
  'HYPO_TO_CONCEPT',
  'CONCEPT_TO_PLAN',
  'ECOT_EDGES',
  'TASK_EDGES',
  'SUPERSEDES',
  'SESS_TO_HYPO',
  'DERIVED_FROM',
]

const collections = [
  'memory_markdown',
  'ecot_nodes',
  'heartbeat_logs',
  'claims',
  'memory_relations',
  'concepts',
  'benchmark_results',
  'sources',
  'provenance_traces',
  'epistemic_ledger',
  'memory_events',
  'actionable_plans',
  'dream_sessions',
  'events',
  'provenance_chain',
  'files',
  'incidents',
  'hypotheses',
  'knowledge_fragments',
  'memory_entities',
  'fragments',
  'tasks',
  'reviews',
  'epistemic_marks',
  'shadow_entries',
  'symbols',
  'pivots',
  'quests',
  'plans',
  'memory_fragments',
  'consensus_logs',
  'consensus',
  'qualia_bridges',
  'symbolic_integrations',
  'archetypes'
]


console.log(`Running bootstrap on: ${db.name}`)

/**
 * Bootstrap the collections
 */
export async function bootstrap() {
  const existing = (await db.collections(true)).map(collection => collection.name) || []
  for (const collection of edges) {
    if (!existing.some((name) => name.toUpperCase() === collection.toUpperCase())) {
      await db.createCollection(collection, { type: CollectionType.EDGE_COLLECTION })
      console.log(`Created ${collection} collection`)
    } else {
      console.log(`${collection} exists`)
    }
  }

  for (const collection of collections) {
    if (!existing.some((name) => name.toUpperCase() === collection.toUpperCase())) {
      await db.createCollection(collection, { type: CollectionType.DOCUMENT_COLLECTION })
      console.log(`Created ${collection} collection`)
    } else {
      console.log(`${collection} exists`)
    }
  }
}

bootstrap().then()