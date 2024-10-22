import assert from 'assert'
import { Address, getAddress, toHex, zeroAddress } from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'
import { OperationType } from '@safe-global/safe-core-sdk-types'
import { describe, it, expect } from 'bun:test'

import { planExecution } from './plan'
import { formatPrefixedAddress } from '../addresses'

import { testClient } from '../../test/client'
import { deploySafe, encodeSafeTransaction } from '../../test/avatar'
import { AccountType, ConnectionType, Route } from '../types'
import { ExecutionActionType } from './types'

const makeAddress = (number: number): Address =>
  getAddress(toHex(number, { size: 20 }))

const withPrefix = (address: Address) =>
  formatPrefixedAddress(testClient.chain.id, address)

let safeCounter = 0

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

  describe('EOA owns SAFE-1/1', () => {
    it('plans execution', async () => {
      const { eoa, safe, route } = await setupEOAOwnerOfSafe({
        creationNonce: safeCounter++,
        threshold: 1,
      })

      const receiver = makeAddress(5)

      const safeTx = {
        data: '0xaabbccdd',
        operation: OperationType.Call,
        to: receiver,
        value: '0',
      }

      const chainId = testClient.chain.id

      const plan = await planExecution([safeTx], route, {
        providers: { [chainId]: testClient as Eip1193Provider },
        safeTransactionProperties: {
          [formatPrefixedAddress(chainId, safe)]: {
            proposeOnly: false,
            onchainSignature: false,
          },
        },
      })

      expect(plan).toHaveLength(1)
      const [step] = plan
      expect(step.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)

      assert('chain' in step)
      const { chain, from, transaction } = step

      expect(from).toEndWith(eoa)
      expect(chain).toEqual(testClient.chain.id)

      const encodedSafeTx = encodeSafeTransaction({
        transaction: safeTx,
        signatures: toHex(0, { size: 65 }), // blank signature
      })
      expect(transaction.to).toEqual(safe)
      expect(transaction.value).toEqual('0')
      expect(transaction.data.length).toEqual(encodedSafeTx.length)

      // length encoded 65 bytes
      const sigLength = 32 * 2 + 65 * 2
      expect(transaction.data.slice(0, -sigLength)).toEqual(
        encodedSafeTx.slice(0, -sigLength)
      )
    })

    it('ignores onchainSignature=true when execution is possible', async () => {
      const { safe, route } = await setupEOAOwnerOfSafe({
        creationNonce: safeCounter++,
        threshold: 1,
      })

      const safeTx = {
        data: '0xaabbccdd',
        operation: OperationType.Call,
        to: zeroAddress,
        value: '0',
      }

      const plan = await planExecution([safeTx], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
        safeTransactionProperties: {
          [withPrefix(safe)]: { onchainSignature: true },
        },
      })

      expect(plan).toHaveLength(1)
      const [step] = plan
      expect(step.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)
    })

    it.only('plans proposal with signature when proposeOnly=true', async () => {
      const { eoa, safe, route } = await setupEOAOwnerOfSafe({
        creationNonce: safeCounter++,
        threshold: 1,
      })

      const receiver = makeAddress(5)

      const safeTx = {
        data: '0xaabbccdd',
        operation: OperationType.Call,
        to: receiver,
        value: '0',
      }

      const plan = await planExecution([safeTx], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
        safeTransactionProperties: {
          [withPrefix(safe)]: { proposeOnly: true },
        },
      })

      expect(plan).toHaveLength(2)
      const [sign, propose] = plan
      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(propose.type).toEqual(ExecutionActionType.PROPOSE_SAFE_TRANSACTION)

      // TODO do some content and encoding checks
    })

    it('plans proposal with onchain approval when proposeOnly=true and onchainSignature=true', async () => {})
  })

  describe('EOA owns SAFE-2+/m', () => {
    it('direct execution is not possible', async () => {})

    it('plans proposal with signature', async () => {})

    it('plans proposal with onchain approval when onchainSignature=true', async () => {})
  })

  it('should plan: EOA --owns--> SAFE1/1 --owns--> SAFE1/1', async () => {})

  it('should plan: EOA --owns--> SAFE1/1 --enabled--> SAFE*/*', async () => {})

  it('should plan: EOA --member--> ROLES --enabled--> DELAY --enabled--> SAFE*/*', async () => {})
})

async function setupEOAOwnerOfSafe({
  threshold,
  creationNonce,
}: {
  threshold: number
  creationNonce: number
}) {
  const eoa = makeAddress(3)

  const safe = await deploySafe({
    owners: [eoa, makeAddress(999)],
    threshold,
    creationNonce,
  })

  const route = {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: withPrefix(eoa),
          address: eoa,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(safe),
          address: safe,
          chain: 1,
          threshold: 1,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: withPrefix(eoa),
        },
      },
    ],
    id: 'test',
    initiator: withPrefix(eoa),
    avatar: withPrefix(safe),
  } as Route

  return { route, eoa, safe }
}
