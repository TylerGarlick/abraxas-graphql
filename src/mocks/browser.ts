import { setupWorker } from 'msw/browser'
import { handlers } from './handlers/core'

export const worker = setupWorker(...handlers)

export async function initMocks() {
  if (process.env.NODE_ENV === 'development') {
    await worker.start({
      onUnhandledRequest: 'bypass',
    })
  }
}
