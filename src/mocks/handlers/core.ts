import { graphql, HttpResponse } from 'msw'

export const handlers = [
  graphql.query('getState', () => {
    return HttpResponse.json({
      data: {
        getState: {
          unresolvedIncidents: 0,
          readyTasks: [],
          recentMemory: null,
        },
      },
    })
  }),
  
  graphql.query('getTasks', () => {
    return HttpResponse.json({
      data: {
        getTasks: [
          {
            id: '1',
            title: 'Implement GraphQL Schema',
            status: 'READY',
            priority: 'HIGH',
            project: 'Infrastructure',
            scope: 'API',
            description: 'Extract SDL and set up Yoga',
            notes: 'Use MSW for mocking',
            definitionOfDone: 'Schema verified in playground',
            prompt: 'Help me build a modular GraphQL server',
            results: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subtasks: [],
          },
        ],
      },
    })
  }),
]
