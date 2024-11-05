import { describe, it, expect } from 'bun:test'
import {
  Address,
  getAddress,
  Hash,
  hashMessage,
  Hex,
  parseEther,
  toHex,
  zeroAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { Eip1193Provider } from '@safe-global/protocol-kit'
import { OperationType } from '@safe-global/types-kit'

import { planExecution } from './plan'
import { formatPrefixedAddress, parsePrefixedAddress } from '../addresses'

import { deployer, fund, randomHash, testClient } from '../../test/client'
import { deploySafe, enableModule } from '../../test/avatar'
import { AccountType, ConnectionType, PrefixedAddress, Route } from '../types'
import {
  ExecuteTransactionAction,
  ExecutionActionType,
  SafeTransactionAction,
  SignTypedDataAction,
} from './types'

import { encodeExecTransaction } from './avatar'
import { setupRolesMod } from '../../test/roles'
import { setupDelayMod } from '../../test/delay'

const withPrefix = (address: Address) =>
  formatPrefixedAddress(testClient.chain.id, address)

describe('plan', () => {
  it.skip('should correctly plan execution through a role', async () => {
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
      },
      {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
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

  describe('EOA --owns--> SAFE-1/1', () => {
    it('plans execution', async () => {
      const signer = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [signer.address],
        creationNonce: BigInt(randomHash()),
        threshold: 1,
      })

      const route = createRouteEoaOwnsSafe({
        eoa: signer.address,
        safe,
        threshold: 1,
      })

      // fund the safe
      await testClient.sendTransaction({
        account: deployer,
        to: safe,
        value: parseEther('2'),
      })

      const chainId = testClient.chain.id

      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address,
            value: String(parseEther('1')),
            operation: OperationType.Call,
          },
        ],
        route,
        {
          providers: { [chainId]: testClient as Eip1193Provider },
          safeTransactionProperties: {
            [formatPrefixedAddress(chainId, safe)]: {
              proposeOnly: false,
              onchainSignature: false,
            },
          },
        }
      )

      expect(plan).toHaveLength(2)

      let [sign, execute] = plan as [SignTypedDataAction, SafeTransactionAction]

      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      const signature = await signer.signTypedData(sign.data)
      expect(execute.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)

      const transaction = await encodeExecTransaction(
        execute.safe,
        execute.safeTransaction,
        signature
      )

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)
      await testClient.sendTransaction({
        account: deployer,
        ...transaction,
      })

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('1'))
    })

    it('plans proposal with signature, when proposeOnly', async () => {
      const signer = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [signer.address],
        creationNonce: BigInt(randomHash()),
        threshold: 1,
      })

      const route = createRouteEoaOwnsSafe({
        eoa: signer.address,
        safe,
        threshold: 1,
      })

      const transaction = {
        data: '0x',
        to: receiver.address,
        value: String(parseEther('1')),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
        safeTransactionProperties: {
          [withPrefix(safe)]: { proposeOnly: true },
        },
      })

      expect(plan).toHaveLength(2)
      const [sign, propose] = plan
      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(propose.type).toEqual(ExecutionActionType.PROPOSE_TRANSACTION)
    })
  })

  describe('EOA --owns--> SAFE-2/2', () => {
    it('plans proposal with signature, since direct execution is not possible', async () => {
      const signer1 = privateKeyToAccount(randomHash())
      const signer2 = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [signer1.address, signer2.address],
        creationNonce: BigInt(randomHash()),
        threshold: 2,
      })

      const route = createRouteEoaOwnsSafe({
        eoa: signer1.address,
        safe,
        threshold: 2,
      })

      const transaction = {
        data: '0x',
        to: receiver.address,
        value: '0',
        operation: 1,
      }

      const chainId = testClient.chain.id
      const plan = await planExecution([transaction], route, {
        providers: { [chainId]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)
      const [sign, propose] = plan
      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(propose.type).toEqual(ExecutionActionType.PROPOSE_TRANSACTION)
    })
  })

  describe('EOA --owns--> SAFE1/1 --owns--> SAFE1/1', () => {
    it('plans execution', async () => {
      const eoa = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash()).address

      const safe1 = await deploySafe({
        owners: [eoa.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      const safe2 = await deploySafe({
        owners: [safe1],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      const route = createRouteEoaOwnsSafeOwnsSafe({
        eoa: eoa.address,
        s1: safe1,
        s2: safe2,
      })

      // fund the safe with 2 eth
      await testClient.sendTransaction({
        account: deployer,
        to: safe2,
        value: parseEther('2'),
      })

      const chainId = testClient.chain.id

      // plan a transfer of 1 eth into receiver
      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver,
            value: String(parseEther('1')),
          },
        ],
        route,
        {
          providers: { [chainId]: testClient as Eip1193Provider },
        }
      )

      expect(plan).toHaveLength(3)

      let [sign, execute1, execute2] = plan as [
        SignTypedDataAction,
        SafeTransactionAction,
        SafeTransactionAction,
      ]

      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(parsePrefixedAddress(sign.from)).toEqual([
        undefined,
        getAddress(eoa.address) as any,
      ])

      const signature = await eoa.signTypedData(sign.data)
      expect(execute1.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute1.signature).toBe(null)
      const transaction1 = await encodeExecTransaction(
        execute1.safe,
        execute1.safeTransaction,
        signature
      )

      expect(await testClient.getBalance({ address: receiver })).toEqual(0n)
      await testClient.sendTransaction({
        account: deployer,
        ...transaction1,
      })
      expect(await testClient.getBalance({ address: receiver })).toEqual(0n)

      expect(execute2.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute2.signature).not.toBe(null)
      const transaction2 = await encodeExecTransaction(
        execute2.safe,
        execute2.safeTransaction,
        execute2.signature as Hex
      )

      // Except the receiver to have 0, and afterwards 1
      expect(await testClient.getBalance({ address: receiver })).toEqual(0n)
      await testClient.sendTransaction({
        account: deployer,
        ...transaction2,
      })
      expect(await testClient.getBalance({ address: receiver })).toEqual(
        parseEther('1')
      )
    })
  })

  describe('EOA --owns--> SAFE1/1 --enabled--> SAFE1/1', () => {
    it('plans execution', async () => {
      const eoa = privateKeyToAccount(randomHash())
      const someoneelse = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe1 = await deploySafe({
        owners: [eoa.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      const safe2 = await deploySafe({
        owners: [someoneelse.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await testClient.sendTransaction({
        account: deployer,
        to: someoneelse.address,
        value: parseEther('1'),
      })

      await testClient.sendTransaction({
        account: deployer,
        to: safe2,
        value: parseEther('2'),
      })

      // enable safe1 on safe2
      await enableModule({ owner: someoneelse, safe: safe2, module: safe1 })

      const route = createRouteEoaOwnsSafeMemberOfSafe({
        eoa: eoa.address,
        s1: safe1,
        s2: safe2,
      })

      // fund the safe with 2 eth
      await testClient.sendTransaction({
        account: deployer,
        to: safe2,
        value: parseEther('2'),
      })

      const chainId = testClient.chain.id

      // plan a transfer of 1 eth into receiver
      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address,
            value: String(parseEther('1')),
          },
        ],
        route,
        {
          providers: { [chainId]: testClient as Eip1193Provider },
        }
      )

      expect(plan).toHaveLength(2)

      const [sign, execute] = plan as [
        SignTypedDataAction,
        SafeTransactionAction,
      ]

      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(parsePrefixedAddress(sign.from)).toEqual([
        undefined,
        getAddress(eoa.address) as any,
      ])

      const signature = await eoa.signTypedData(sign.data)
      expect(execute.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute.signature).toBe(null)
      const transaction = await encodeExecTransaction(
        execute.safe,
        execute.safeTransaction,
        signature
      )

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)
      await testClient.sendTransaction({
        account: deployer,
        ...transaction,
      })
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('1'))
    })
  })

  describe('EOA --member--> ROLES --enabled--> SAFE*/*', () => {
    it('plans execution', async () => {
      const owner = privateKeyToAccount(randomHash())
      const member = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      /*
       * Steps:
       * Fund a safe with 2 ETH
       * Setup a role for sending eth from the safe
       * Use member key to send 0.123 ETH to receiver
       */
      const safe = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await testClient.sendTransaction({
        account: deployer,
        to: owner.address,
        value: parseEther('1'),
      })

      await testClient.sendTransaction({
        account: deployer,
        to: member.address,
        value: parseEther('1'),
      })

      // fund the safe with 2 eth
      await testClient.sendTransaction({
        account: deployer,
        to: safe,
        value: parseEther('1'),
      })

      const { roles, roleId } = await setupRolesMod({
        owner: owner,
        avatar: safe,
        member: member.address,
        destination: receiver.address,
      })

      const route = createRouteEoaRolesSafe({
        eoa: member.address as any,
        roles,
        roleId,
        safe,
      })

      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address,
            value: String(parseEther('0.123')),
          },
        ],
        route,
        {
          providers: { [testClient.chain.id]: testClient as Eip1193Provider },
        }
      )

      expect(plan).toHaveLength(1)

      const [execute] = plan as [ExecuteTransactionAction]
      expect(execute.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('1')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)
      await testClient.sendTransaction({
        account: member,
        to: execute.transaction.to,
        data: execute.transaction.data as `0x{string}`,
        value: BigInt(execute.transaction.value),
      })
      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('0.877')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })
  })

  describe('EOA --enabled--> DELAY --enabled--> SAFE*/*', () => {
    it('plans execution', async () => {
      const owner = privateKeyToAccount(randomHash())
      const eoa = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())
      const someone = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await fund([
        owner.address,
        eoa.address,
        [safe, parseEther('10')],
        someone.address,
      ])

      const cooldown = 100

      const delay = await setupDelayMod({
        owner,
        avatar: safe,
        module: eoa.address,
        cooldown,
      })

      const route = createRouteEoaDelaySafe({
        eoa: eoa.address,
        delay,
        safe,
      })

      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address,
            value: String(parseEther('0.123')),
          },
        ],
        route,
        {
          providers: { [testClient.chain.id]: testClient as Eip1193Provider },
        }
      )

      expect(plan).toHaveLength(2)

      const [execute1, execute2] = plan as [
        ExecuteTransactionAction,
        ExecuteTransactionAction,
      ]
      expect(execute1.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)
      expect(execute2.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: eoa,
        to: execute1.transaction.to,
        data: execute1.transaction.data as any,
        value: BigInt(execute1.transaction.value),
      })

      await testClient.request({
        method: 'anvil_mine' as any,
        params: [cooldown],
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: someone,
        to: execute2.transaction.to,
        data: execute2.transaction.data as any,
        value: BigInt(execute2.transaction.value),
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })
  })

  describe('EOA --member--> ROLES --enabled--> SAFE*/* --owns--> SAFE1/1', () => {
    // TODO
  })

  describe('EOA --member--> ROLES --enabled--> DELAY --enabled--> SAFE*/*', () => {
    // TODO
  })
})

function createRouteEoaOwnsSafe({
  eoa,
  safe,
  threshold = 1,
}: {
  eoa: Address
  safe: Address
  threshold?: number
}) {
  const route = {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: `eoa:${eoa}`,
          address: eoa,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(safe),
          address: safe,
          chain: testClient.chain.id,
          threshold,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: `eoa:${eoa}`,
        },
      },
    ],
    id: 'test',
    initiator: `eoa:${eoa}`,
    avatar: withPrefix(safe),
  } as Route

  return route
}

function createRouteEoaOwnsSafeOwnsSafe({
  eoa,
  s1,
  s1Threshold = 1,
  s2,
  s2Threshold = 1,
}: {
  eoa: Address
  s1: Address
  s1Threshold?: number
  s2: Address
  s2Threshold?: number
}): Route {
  const route = {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: `eoa:${eoa}`,
          address: eoa,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(s1),
          address: s1,
          chain: testClient.chain.id,
          threshold: s1Threshold,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: `eoa:${eoa}`,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(s2),
          address: s2,
          chain: testClient.chain.id,
          threshold: s2Threshold,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: withPrefix(s1),
        },
      },
    ],
    id: 'test',
    initiator: `eoa:${eoa}`,
    avatar: withPrefix(s2),
  } as Route

  return route
}

function createRouteEoaOwnsSafeMemberOfSafe({
  eoa,
  s1,
  s1Threshold = 1,
  s2,
  s2Threshold = 1,
}: {
  eoa: Address
  s1: Address
  s1Threshold?: number
  s2: Address
  s2Threshold?: number
}): Route {
  const route = {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: `eoa:${eoa}`,
          address: eoa,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(s1),
          address: s1,
          chain: testClient.chain.id,
          threshold: s1Threshold,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: `eoa:${eoa}`,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          prefixedAddress: withPrefix(s2),
          address: s2,
          chain: testClient.chain.id,
          threshold: s2Threshold,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: withPrefix(s1),
        },
      },
    ],
    id: 'test',
    initiator: `eoa:${eoa}`,
    avatar: withPrefix(s2),
  } as Route

  return route
}

function createRouteEoaRolesSafe({
  eoa,
  roles,
  roleId,
  safe,
}: {
  eoa: `0x${string}`
  roles: Address
  roleId: Hash
  safe: Address
}): Route {
  return {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: `eoa:${eoa}`,
          address: eoa as `0x${string}`,
        },
      },
      {
        account: {
          type: AccountType.ROLES,
          address: roles as `0x${string}`,
          prefixedAddress: withPrefix(roles),
          chain: testClient.chain.id,
          multisend: [] as `0x${string}`[],
          version: 2,
        },
        connection: {
          type: ConnectionType.IS_MEMBER,
          roles: [roleId],
          from: `eoa:${eoa}`,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          address: safe as `0x${string}`,
          prefixedAddress: withPrefix(safe),

          chain: testClient.chain.id,
          threshold: 1,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: withPrefix(roles),
        },
      },
    ],
    id: 'test',
    initiator: `eoa:${eoa}`,
    avatar: withPrefix(safe),
  }
}

function createRouteEoaDelaySafe({
  eoa,
  delay,
  safe,
}: {
  eoa: Address
  delay: Address
  safe: Address
}): Route {
  return {
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          prefixedAddress: `eoa:${eoa}` as PrefixedAddress,
          address: eoa as `0x${string}`,
        },
      },
      {
        account: {
          type: AccountType.DELAY,
          address: delay as any,
          prefixedAddress: withPrefix(delay),
          chain: testClient.chain.id,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: `eoa:${eoa}` as PrefixedAddress,
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          address: safe as `0x${string}`,
          prefixedAddress: withPrefix(safe),

          chain: testClient.chain.id,
          threshold: 1,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: withPrefix(delay),
        },
      },
    ],
    id: 'test',
    initiator: `eoa:${eoa}` as PrefixedAddress,
    avatar: withPrefix(safe),
  }
}
