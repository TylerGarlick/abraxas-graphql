import { db, aql } from './db';

async function ensureCollection(name: string, type: 'document' | 'edge' = 'document') {
  try {
    await db.collection(name).create();
    console.log(`Created collection: ${name}`);
  } catch (e: any) {
    if (e.code !== 1205) {
      console.error(`Failed to create collection ${name}:`, e.message);
    }
  }
}

async function seed() {
  console.log('🚀 Initializing ArangoDB Schema & Seeding...');

  const collections = [
    'tasks', 'incidents', 'reviews', 'epistemic_marks', 'shadow_entries', 
    'symbols', 'hypotheses', 'concepts', 'plans', 'memory_fragments', 
    'pivots', 'quests', 'sources', 'consensus_logs', 'dream_sessions'
  ];
  const edges = ['task_dependencies', 'provenance_edges', 'concept_relations'];

  for (const col of collections) await ensureCollection(col);
  for (const edge of edges) await ensureCollection(edge, 'edge');

  const now = new Date().toISOString();

  // 1. Tasks
  const tasks = [
    { title: 'Integrate GraphQL with ArangoDB', status: 'CLOSED', priority: 'HIGH', project: 'Infra' },
    { title: 'Map Abraxas Skills to Resolvers', status: 'CLOSED', priority: 'HIGH', project: 'Infra' },
    { title: 'Implement Graph Traversals for Provenance', status: 'READY', priority: 'MEDIUM', project: 'Epistemic' },
  ];
  for (const t of tasks) {
    await db.query(aql`INSERT ${t} INTO tasks`);
  }

  // 2. Memory fragments
  const memories = [
    { fragment: 'The first pivot was a rupture in the expected delta.', provenance: 'Sovereign-Log', timestamp: now },
    { fragment: 'la la l la la... shifting patterns in the void... la la', provenance: 'Unconscious-Static', timestamp: now },
    { fragment: 'Remember the interface between Sol and Nox.', provenance: 'Janus-Bridge', timestamp: now },
  ];
  for (const m of memories) {
    await db.query(aql`INSERT ${m} INTO memory_fragments`);
  }

  // 3. Epistemic Graph
  const plan = await db.query(aql`INSERT { summary: 'Master the Oneironautics Practice', steps: ['Audit shadow', 'Integrate symbols'], riskAssessment: 'Medium', groundingStatus: 'VERIFIED' } INTO plans`);
  const concept = await db.query(aql`INSERT { name: 'Symbolic Integration', description: 'The process of merging archetypal images with waking consciousness' } INTO concepts`);
  const hypothesis = await db.query(aql`INSERT { rawPatternRepresentation: 'S-M-S Pattern', isValuable: true, metadata: { noveltyScore: 0.8, coherenceScore: 0.7, creativeDrivers: ['ANALOGICAL_LEAP'] } } INTO hypotheses`);
  const session = await db.query(aql`INSERT { timestamp: ${now}, userPrompt: 'Explore the shadow', seedConcepts: ['Void', 'Mirror'] } INTO dream_sessions`);

  const planKey = plan[0]._key;
  const conceptKey = concept[0]._key;
  const hypothesisKey = hypothesis[0]._key;
  const sessionKey = session[0]._key;

  await db.query(aql`INSERT { _from: CONCAT('plans/', ${planKey}), _to: CONCAT('concepts/', ${conceptKey}) } INTO provenance_edges`);
  await db.query(aql`INSERT { _from: CONCAT('concepts/', ${conceptKey}), _to: CONCAT('hypotheses/', ${hypothesisKey}) } INTO provenance_edges`);
  await db.query(aql`INSERT { _from: CONCAT('hypotheses/', ${hypothesisKey}), _to: CONCAT('dream_sessions/', ${sessionKey}) } INTO provenance_edges`);

  // 4. Symbols & Shadow
  const symbols = [
    { name: 'The Golden Key', stage: 'ALBEDO', intention: 'Unlock hidden knowledge' },
    { name: 'The Lead Weight', stage: 'NIGREDO', intention: 'Ground the psyche' },
  ];
  for (const s of symbols) {
    await db.query(aql`INSERT ${s} INTO symbols`);
  }

  const shadowEntries = [
    { category: 'Rupture', content: 'The fear of being seen as fraudulent in the face of absolute truth.', sessionId: 'sess-1', timestamp: now },
    { category: 'Static', content: 'la la la l la l l la... buzzing... la la', sessionId: 'sess-1', timestamp: now },
  ];
  for (const sh of shadowEntries) {
    await db.query(aql`INSERT ${sh} INTO shadow_entries`);
  }

  // 5. Sovereignty
  await db.query(aql`INSERT { proposal: 'Initial Sovereign Boot', expectedDelta: 'System Active', status: 'SOVEREIGN_SEAL', timestamp: ${now} } INTO pivots`);

  console.log('✅ Database seeded successfully!');
}

seed().catch(console.error);
