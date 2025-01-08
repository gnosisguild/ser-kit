import assert from 'assert'

import { expect, describe, it } from 'bun:test'

import { privateKeyToAccount } from 'viem/accounts'
import { randomHash, testClient } from '../../test/client'
import { deploySafe } from '../../test/avatar'
import { eoaSafe } from '../../test/routes'
import { AccountType, ChainId } from '../types'
import { normalizeRoute } from './normalizeRoute'

describe('normalizeRoute', () => {
  it('queries and patches missing threshold in a SAFE account', async () => {
    const signer = privateKeyToAccount(randomHash())
    const signer2 = privateKeyToAccount(randomHash())
    const signer3 = privateKeyToAccount(randomHash())
    const signer4 = privateKeyToAccount(randomHash())

    const safe = await deploySafe({
      owners: [
        signer.address,
        signer2.address,
        signer3.address,
        signer4.address,
      ],
      creationNonce: BigInt(randomHash()),
      threshold: 3,
    })

    let route = eoaSafe({
      eoa: signer.address,
      safe,
    })

    assert(route.waypoints[1].account.type == AccountType.SAFE)
    ;(route.waypoints[1].account as any).threshold = undefined
    assert(route.waypoints[1].account.threshold == undefined)

    route = await normalizeRoute(route, {
      providers: { [testClient.chain.id as ChainId]: testClient },
    })
    assert(route.waypoints[1].account.type == AccountType.SAFE)
    expect(route.waypoints[1].account.threshold).toEqual(3)
  })
})
