import { describe, it, expect, beforeEach, mock } from 'bun:test'
import * as safeApiKit from '@safe-global/api-kit'
import type { MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import type { Eip1193Provider } from '@safe-global/protocol-kit'
import { execute } from './execute'
import { testClient } from '../../test/client'
import { planExecution } from './plan'
import { parsePrefixedAddress } from '../addresses'
import { testEao, testRoutes } from '../../test/routes'
import { AccountType, ConnectionType } from '../types'
import { ExecutionActionType } from './types'

describe('plan', () => {
  it('should correctly plan execution through a role', async () => {
    const plan = await planExecution(
      [
        {
          data: '0x70d0f384000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002200000000000000000000000000eb5b03c0303f2f47cd81d7be4275af8ed347576000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000669cf0cfd096c5d610d4455bcae4bff719d18345939c5d6b20d56c6a1f37d0247ad10f7100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000016617262697472756d666f756e646174696f6e2e6574680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008736e617073686f7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027b7d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000008736e617073686f740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005302e312e34000000000000000000000000000000000000000000000000000000',
          operation: 1,
          to: '0xa58Cf66d0f14AEFb2389c6998f6ad219dd4885c1',
          value: '0',
        },
      ],
      {
        waypoints: [
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress:
                'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
              address: '0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
              chain: 42161,
              threshold: 3,
            },
          },
          {
            account: {
              type: AccountType.ROLES,
              prefixedAddress:
                'arb1:0xd8c71be42ae496286b8b75929f9cec967ade7455',
              address: '0xd8c71be42ae496286b8b75929f9cec967ade7455',
              chain: 42161,
              version: 2,
              multisend: ['0xa238cbeb142c10ef7ad8442c6d1f9e89e07e7761'],
            },
            connection: {
              type: ConnectionType.IS_MEMBER,
              from: 'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
              roles: [
                '0x6172630000000000000000000000000000000000000000000000000000000000',
              ],
            },
          },
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress:
                'arb1:0x0eb5b03c0303f2f47cd81d7be4275af8ed347576',
              address: '0x0eb5b03c0303f2f47cd81d7be4275af8ed347576',
              chain: 42161,
              threshold: 5,
            },
            connection: {
              type: ConnectionType.IS_ENABLED,
              from: 'arb1:0xd8c71be42ae496286b8b75929f9cec967ade7455',
            },
          },
        ],
        id: 'test',
        initiator: 'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
        avatar: 'arb1:0x0eb5b03c0303f2f47cd81d7be4275af8ed347576',
      }
    )

    expect(plan).toEqual([
      {
        type: ExecutionActionType.EXECUTE_TRANSACTION,
        transaction: {
          to: '0xd8c71be42ae496286b8b75929f9cec967ade7455',
          data: '0xc6fe8747000000000000000000000000a58cf66d0f14aefb2389c6998f6ad219dd4885c1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000016172630000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000002e470d0f384000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002200000000000000000000000000eb5b03c0303f2f47cd81d7be4275af8ed347576000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000669cf0cfd096c5d610d4455bcae4bff719d18345939c5d6b20d56c6a1f37d0247ad10f7100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000016617262697472756d666f756e646174696f6e2e6574680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008736e617073686f7400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000027b7d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000008736e617073686f740000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005302e312e3400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
          value: '0',
        },
        from: 'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
        chain: 42161,
      },
    ])
  })
})