import * as Factories from '../../mocks/factories/core';

const FACTORY_MAP: Record<string, Function> = {
  Task: Factories.TaskFactory,
  Retrospective: Factories.RetrospectiveFactory,
  EpistemicMark: Factories.EpistemicMarkFactory,
  SoterIncident: Factories.SoterIncidentFactory,
  SovereignPivot: Factories.SovereignPivotFactory,
  SovereignQuest: Factories.SovereignQuestFactory,
  Hypothesis: Factories.HypothesisFactory,
  ActionablePlan: Factories.ActionablePlanFactory,
  SymbolNode: Factories.SymbolNodeFactory,
  // Add others as needed
};

export const mockResolvers = {
  Query: {
    getState: () => ({
      unresolvedIncidents: 0,
      readyTasks: [Factories.TaskFactory()],
      recentMemory: null,
    }),
    getTasks: () => [Factories.TaskFactory(), Factories.TaskFactory()],
    getSoterIncidents: () => [Factories.SoterIncidentFactory()],
    getSoterReviews: () => [],
    getEpistemicMarks: () => [Factories.EpistemicMarkFactory()],
    getShadowEntries: () => [],
    getSymbolNodes: () => [Factories.SymbolNodeFactory()],
    getBenchmarkResults: () => [],
    getProvenanceChain: () => ({
      plan: Factories.ActionablePlanFactory(),
      concept: { id: '1', name: 'Mock Concept', description: 'Mock' },
      hypothesis: Factories.HypothesisFactory(),
      session: { id: '1', timestamp: new Date().toISOString(), userPrompt: '...', seedConcepts: [] },
      planToConceptEdge: { id: 'e1', from: 'p1', to: 'c1' },
      conceptToHypothesisEdge: { id: 'e2', from: 'c1', to: 'h1' },
      hypothesisToSessionEdge: { id: 'e3', from: 'h1', to: 's1' },
    }),
  },
  Mutation: {
    createTask: (_, { input }) => ({ ...Factories.TaskFactory(), ...input }),
    updateTask: (_, { id, input }) => ({ ...Factories.TaskFactory({ id }), ...input }),
    updateTaskStatus: (_, { input }) => ({ ...Factories.TaskFactory({ id: input.id }), status: input.status }),
    createDependency: (_, { input }) => ({ ...input, id: 'dep1' }),
    createIncident: (_, { input }) => ({ ...Factories.SoterIncidentFactory(), ...input }),
    updateIncident: (_, { id, input }) => ({ ...Factories.SoterIncidentFactory({ id }), ...input }),
    createReview: (_, { input }) => ({ ...Factories.SoterIncidentFactory({ id: 'rev1' }), ...input }),
    updateReview: (_, { id, input }) => ({ ...Factories.SoterIncidentFactory({ id }), ...input }),
    createEpistemicMark: (_, { input }) => ({ ...Factories.EpistemicMarkFactory(), ...input }),
    updateEpistemicMark: (_, { id, input }) => ({ ...Factories.EpistemicMarkFactory({ id }), ...input }),
    createShadowEntry: (_, { input }) => ({ ...Factories.SoterIncidentFactory({ id: 'sha1' }), ...input }),
    updateShadowEntry: (_, { id, input }) => ({ ...Factories.SoterIncidentFactory({ id }), ...input }),
    createSymbol: (_, { name, stage }) => ({ ...Factories.SymbolNodeFactory(), name, stage }),
    updateSymbol: (_, { input }) => ({ ...Factories.SymbolNodeFactory(), ...input }),
    createPivot: (_, { input }) => ({ ...Factories.SovereignPivotFactory(), ...input }),
    createQuest: (_, { input }) => ({ ...Factories.SovereignQuestFactory(), ...input }),
    createPlan: (_, { input }) => ({ ...Factories.ActionablePlanFactory(), ...input }),
    updatePlan: (_, { id, input }) => ({ ...Factories.ActionablePlanFactory({ id }), ...input }),
  }
};
