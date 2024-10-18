import { beforeAll } from 'bun:test'
import waitOn from 'wait-on'
import { anvilUrl, deployer, testClient } from './client'
import { parseEther } from 'viem'

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

  await testClient.reset()
  await testClient.request({
    method: 'anvil_setBalance' as any,
    params: [deployer.address, parseEther('100')],
  })

  console.log('Fork is ready!')
}
