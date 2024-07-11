import { beforeAll } from 'bun:test'
import waitOn from 'wait-on'
import { anvilUrl } from './client'

beforeAll(async () => {
  // global setup
  await waitForNetwork()
})

async function waitForNetwork() {
  console.log('\nWaiting for fork to be ready...')
  await waitOn({
    interval: 100,
    timeout: 10000,
    resources: [anvilUrl],
    validateStatus(status: number) {
      return status === 405
    },
  })
  console.log('Fork is ready!')
}
