import { describe, it, expect, beforeEach, mock } from 'bun:test'
import * as safeApiKit from '@safe-global/api-kit'
import type { MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Eip1193Provider } from '@safe-global/protocol-kit'
import { execute } from './execute'
import { testClient } from '../../test/client'
import { planExecution } from './plan'
import { parsePrefixedAddress } from '../addresses'
import { testEao, testRoutes } from '../../test/routes'

const proposeTransactionMock = mock(async () => {})

mock.module('@safe-global/api-kit', async () => {
  const SafeApiKit = safeApiKit.default
  class SafeApiKitMocked extends SafeApiKit {
    proposeTransaction = proposeTransactionMock
  }

  return {
    ...safeApiKit,
    default: SafeApiKitMocked,
  }
})

describe('plan & execute', () => {
  beforeEach(() => {
    proposeTransactionMock.mockReset()
  })

  it('should sign and propose a Safe transaction as owner', async () => {
    const plan = await planExecution(
      [metaTransactions.wrapEth],
      testRoutes.eoaOwnsSafe,
      { providers: { 1: testClient as Eip1193Provider } }
    )
    // impersonate route initiator EOA
    const [_chain, eoaAddress] = parsePrefixedAddress(
      testRoutes.eoaOwnsSafe.initiator
    )

    await testClient.impersonateAccount({ address: eoaAddress })

    await execute(plan, undefined, testClient as Eip1193Provider)

    expect(proposeTransactionMock).toHaveBeenCalledTimes(1)
    expect(proposeTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        safeTxHash: expect.stringContaining('0x'),
        senderAddress: testEao,
        senderSignature: expect.stringContaining('0x'),
      })
    )
  })
})

const metaTransactions = {
  wrapEth: {
    to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    value: BigInt(1e18).toString(),
    data: '0xd0e30db0', // deposit()
  },
} satisfies { [name: string]: MetaTransactionData }
