export const TaskFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  title: 'Default Task',
  status: 'OPEN',
  priority: 'MEDIUM',
  project: 'General',
  scope: 'Internal',
  description: 'Default description',
  notes: '',
  definitionOfDone: 'Task is completed',
  prompt: '',
  results: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [],
  ...overrides,
});

export const RetrospectiveFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  taskId: Math.random().toString(36).substr(2, 9),
  title: 'Sprint Retrospective',
  wentWell: 'Everything went great',
  wentBad: 'Some things were slow',
  doing: {
    start: 'Start doing X',
    continue: 'Continue doing Y',
    stop: 'Stop doing Z',
  },
  actions: [],
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const EpistemicMarkFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  label: 'UNKNOWN',
  topic: 'General Topic',
  reasoningChain: 'A -> B -> C',
  sessionId: Math.random().toString(36).substr(2, 9),
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const SoterIncidentFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  request: 'Sample request',
  riskScore: 5,
  resolved: false,
  timestamp: new Date().toISOString(),
  patterns: [],
  response: 'Sample response',
  ...overrides,
});

export const GuardrailCheckFactory = (overrides = {}) => ({
  guardrail: 'EPISTEMIC_HUMILITY',
  result: 'PASS',
  notes: 'Looks good',
  ...overrides,
});

export const SovereignPivotFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  ruptureId: Math.random().toString(36).substr(2, 9),
  proposal: 'Proposed change',
  expectedDelta: 'Improved stability',
  status: 'PROPOSED',
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const SovereignQuestFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  unknownId: Math.random().toString(36).substr(2, 9),
  focusArea: 'Research Vector',
  status: 'ACTIVE',
  discoveredEvidence: [],
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const HypothesisFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  rawPatternRepresentation: 'Pattern X',
  metadata: {
    noveltyScore: 0.5,
    coherenceScore: 0.5,
    creativeDrivers: ['ANALOGICAL_LEAP'],
  },
  isValuable: false,
  ...overrides,
});

export const ActionablePlanFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  summary: 'Plan summary',
  steps: ['Step 1', 'Step 2'],
  riskAssessment: 'Low risk',
  groundingStatus: 'PENDING',
  ...overrides,
});

export const SymbolNodeFactory = (overrides = {}) => ({
  id: Math.random().toString(36).substr(2, 9),
  name: 'Symbol Name',
  stage: 'NIGREDO',
  intention: 'Sample intention',
  ...overrides,
});
