import { beforeAll } from 'bun:test'
import { parseEther } from 'viem'
import waitOn from 'wait-on'
import { anvilUrl, deployer, testClient } from './client'

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
    params: [deployer.address, parseEther('100000')],
  })

  // for when we stop using forking
  // await deployFactories({ provider: testClient as Eip1193Provider })
  // await deployRolesMastercopies()

  console.log('Fork is ready!')
}
