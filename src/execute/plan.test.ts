import { describe, it, expect } from 'bun:test'
import { Address, getAddress, hashMessage, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { Eip1193Provider } from '@safe-global/protocol-kit'
import { OperationType } from '@safe-global/types-kit'

import { formatPrefixedAddress } from '../addresses'

import {
  AccountType,
  ConnectionType,
  MetaTransactionRequest,
  PrefixedAddress,
  Route,
} from '../types'
import {
  ExecutionActionType,
  ExecuteTransactionAction,
  SafeTransactionAction,
  SignTypedDataAction,
} from './types'

import { setupRolesMod } from '../../test/roles'
import { deployDelayMod, enableModule } from '../../test/delay'

import {
  deployer,
  fund,
  randomHash,
  testClient,
  testClientWithAccount,
} from '../../test/client'
import { deploySafe, enableModuleInSafe } from '../../test/avatar'
import {
  eoaDelaySafe,
  eoaRolesDelaySafe,
  eoaRolesSafe,
  eoaSafe,
  eoaSafeMemberOfSafe,
  eoaSafeOwnsSafe,
} from '../../test/routes'

import { planExecution } from './plan'
import { execute } from './execute'
import encodeExecTransaction from '../encode/execTransaction'

const withPrefix = (address: Address) =>
  formatPrefixedAddress(testClient.chain.id, address)

describe('plan', () => {
  describe('EOA --owns--> SAFE-1/1', () => {
    it('plans and executes', async () => {
      const signer = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [signer.address],
        creationNonce: BigInt(randomHash()),
        threshold: 1,
      })

      const route = eoaSafe({
        eoa: signer.address,
        safe,
        threshold: 1,
      })

      await fund([signer.address, [safe, parseEther('2')]])

      const chainId = testClient.chain.id

      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address as `0x{string}`,
            value: parseEther('1'),
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

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      const state = [] as any

      await execute(plan, state, testClient as Eip1193Provider, {
        getWalletClient: (() => testClientWithAccount(signer)) as any,
      })

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('1'))
      expect(state).toHaveLength(2)
    })

    it('plans and executes independently', async () => {
      const signer = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [signer.address],
        creationNonce: BigInt(randomHash()),
        threshold: 1,
      })

      const route = eoaSafe({
        eoa: signer.address,
        safe,
        threshold: 1,
      })

      await fund([[safe, parseEther('2')]])

      const chainId = testClient.chain.id

      const plan = await planExecution(
        [
          {
            data: '0x',
            to: receiver.address as `0x${string}`,
            value: parseEther('1'),
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
      expect(execute.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)

      const signature = await signer.signTypedData(sign.typedData)

      const transaction = {
        to: execute.safe,
        data: await encodeExecTransaction({
          safeTransaction: execute.safeTransaction,
          signature,
        }),
      }

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

      const route = eoaSafe({
        eoa: signer.address,
        safe,
        threshold: 1,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('1'),
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

      const route = eoaSafe({
        eoa: signer1.address,
        safe,
        threshold: 2,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('1'),
        operation: OperationType.Call,
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
    it('plans and executes', async () => {
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

      const route = eoaSafeOwnsSafe({
        eoa: eoa.address,
        s1: safe1,
        s2: safe2,
      })

      await fund([eoa.address, [safe2, parseEther('2')]])

      const chainId = testClient.chain.id

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver as `0x${string}`,
        value: parseEther('1'),
        operation: OperationType.Call,
      }

      // plan a transfer of 1 eth into receiver
      const plan = await planExecution([transaction], route, {
        providers: { [chainId]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(3)

      const state: any[] = []

      // Except the receiver to have 0, and afterwards 1
      expect(await testClient.getBalance({ address: receiver })).toEqual(0n)
      await execute(plan, state, testClient as Eip1193Provider, {
        getWalletClient: () => testClientWithAccount(eoa) as any,
      })
      expect(await testClient.getBalance({ address: receiver })).toEqual(
        parseEther('1')
      )
    })
    it('plans and executes independently', async () => {
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

      const route = eoaSafeOwnsSafe({
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

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver as `0x${string}`,
        value: parseEther('1'),
        operation: OperationType.Call,
      }

      // plan a transfer of 1 eth into receiver
      const plan = await planExecution([transaction], route, {
        providers: { [chainId]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(3)

      let [sign, execute1, execute2] = plan as [
        SignTypedDataAction,
        SafeTransactionAction,
        SafeTransactionAction,
      ]

      expect(sign.type).toEqual(ExecutionActionType.SIGN_TYPED_DATA)
      expect(sign.from).toEqual(getAddress(eoa.address))

      const signature = await eoa.signTypedData(sign.typedData)
      expect(execute1.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute1.signature).toBe(null)
      const transaction1 = {
        to: execute1.safe,
        data: encodeExecTransaction({
          ...execute1,
          signature,
        }),
      }

      await expect(await testClient.getBalance({ address: receiver })).toEqual(
        0n
      )
      await testClient.sendTransaction({
        account: deployer,
        ...transaction1,
      })
      expect(await testClient.getBalance({ address: receiver })).toEqual(0n)

      expect(execute2.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute2.signature).not.toBe(null)
      const transaction2 = {
        to: execute2.safe,
        data: encodeExecTransaction(execute2),
      }

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
    it('plans and executes', async () => {
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

      await fund([
        eoa.address,
        [deployer.address, parseEther('2')],
        [someoneelse.address, parseEther('1')],
      ])

      // enable safe1 on safe2
      await enableModuleInSafe({
        owner: someoneelse,
        safe: safe2,
        module: safe1,
      })

      const route = eoaSafeMemberOfSafe({
        eoa: eoa.address,
        s1: safe1,
        s2: safe2,
      })

      await fund([[safe2, parseEther('2')]])

      const chainId = testClient.chain.id

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('1'),
        operation: OperationType.Call,
      }

      // plan a transfer of 1 eth into receiver
      const plan = await planExecution([transaction], route, {
        providers: { [chainId]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await execute(plan, [], testClient as Eip1193Provider, {
        getWalletClient: (() => testClientWithAccount(eoa)) as any,
      })

      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('1'))
    })

    it('plans and executes independently', async () => {
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
      await enableModuleInSafe({
        owner: someoneelse,
        safe: safe2,
        module: safe1,
      })

      const route = eoaSafeMemberOfSafe({
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
            to: receiver.address as `0x${string}`,
            value: parseEther('1'),
            operation: OperationType.Call,
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
      expect(sign.from).toEqual(getAddress(eoa.address))

      const signature = await eoa.signTypedData(sign.typedData)

      expect(execute.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute.signature).toBe(null)
      const transaction = {
        to: execute.safe,
        data: await encodeExecTransaction({ ...execute, signature }),
      }

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
    it('plans and executes', async () => {
      const owner = privateKeyToAccount(randomHash())
      const member = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await fund([owner.address, member.address, safe])

      const { roles, roleId } = await setupRolesMod({
        owner: owner,
        avatar: safe,
        member: member.address,
        destination: receiver.address,
      })

      await enableModuleInSafe({ safe, owner, module: roles })

      const route = eoaRolesSafe({
        eoa: member.address as any,
        roles,
        roleId,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(1)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('1')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await execute(plan, [], testClient as Eip1193Provider, {
        getWalletClient: (({ account }: any) => {
          if (getAddress(account) == getAddress(member.address)) {
            return testClientWithAccount(member)
          }
          return testClientWithAccount(deployer)
        }) as any,
      })

      await expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('0.877')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })

    it('plans and executes independently', async () => {
      const owner = privateKeyToAccount(randomHash())
      const member = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await fund([owner.address, member.address, safe])

      const { roles, roleId } = await setupRolesMod({
        owner: owner,
        avatar: safe,
        member: member.address,
        destination: receiver.address,
      })

      await enableModuleInSafe({ safe, owner, module: roles })

      const route = eoaRolesSafe({
        eoa: member.address as any,
        roles,
        roleId,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

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
        ...execute.transaction,
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
    it('plans and executes', async () => {
      const owner = privateKeyToAccount(randomHash())
      const eoa = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())
      const someone = privateKeyToAccount(randomHash())

      const safe = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      expect(null)

      await fund([
        owner.address,
        eoa.address,
        [safe, parseEther('10')],
        someone.address,
      ])

      const cooldown = 100

      const delay = await deployDelayMod({
        owner: owner.address,
        avatar: safe,
        cooldown,
      })

      await enableModule({ owner, module: delay, moduleToEnable: eoa.address })
      await enableModuleInSafe({ owner, safe, module: delay })

      const route = eoaDelaySafe({
        eoa: eoa.address,
        delay,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      let state: any[] = []
      try {
        // TODO set up tooling to assert on revert happening when contract invoking
        await execute(plan, state, testClient as Eip1193Provider, {
          getWalletClient: (({ account }: any) => {
            return getAddress(account) == getAddress(eoa.address)
              ? testClientWithAccount(eoa)
              : testClientWithAccount(someone)
          }) as any,
        })
      } catch (e) {}
      expect(state).toHaveLength(1)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.increaseTime({
        seconds: cooldown * 2,
      })

      await execute(plan, state, testClient as Eip1193Provider, {
        getWalletClient: (() => testClientWithAccount(someone)) as any,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })

    it('plans and executes independently', async () => {
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

      const delay = await deployDelayMod({
        owner: owner.address,
        avatar: safe,
        cooldown,
      })

      await enableModule({ owner, module: delay, moduleToEnable: eoa.address })
      await enableModuleInSafe({ owner, safe, module: delay })

      const route = eoaDelaySafe({
        eoa: eoa.address,
        delay,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

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
        ...execute1.transaction,
      })

      await testClient.increaseTime({
        seconds: cooldown * 2,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: someone,
        ...execute2.transaction,
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
    it('plans and executes', async () => {
      const owner = privateKeyToAccount(randomHash())
      const member = privateKeyToAccount(randomHash())
      const receiver = privateKeyToAccount(randomHash())
      const someone = privateKeyToAccount(randomHash())

      await fund([owner.address, member.address, someone.address])

      const safe1 = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      const safe2 = await deploySafe({
        owners: [safe1],
        threshold: 1,
        creationNonce: BigInt(randomHash()),
      })

      await fund([safe1, safe2])

      const { roles, roleId } = await setupRolesMod({
        owner: owner,
        avatar: safe1,
        member: member.address,
        destination: safe2,
      })

      await enableModuleInSafe({
        owner,
        safe: safe1,
        module: roles,
      })

      const route = {
        waypoints: [
          {
            account: {
              type: AccountType.EOA,
              prefixedAddress: `eoa:${member.address}` as PrefixedAddress,
              address: member.address as `0x${string}`,
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
              from: `eoa:${member.address}`,
            },
          },
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress: withPrefix(safe1),
              address: safe1,
              chain: testClient.chain.id,
              threshold: 1,
            },
            connection: {
              type: ConnectionType.IS_ENABLED,
              from: withPrefix(roles),
            },
          },
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress: withPrefix(safe2),
              address: safe2,
              chain: testClient.chain.id,
              threshold: 1,
            },
            connection: {
              type: ConnectionType.OWNS,
              from: withPrefix(safe1),
            },
          },
        ],
        id: 'test',
        initiator: `eoa:${member.address}` as PrefixedAddress,
        avatar: withPrefix(safe2),
      } as Route

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(await testClient.getBalance({ address: safe2 })).toEqual(
        parseEther('1')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      expect(plan).toHaveLength(2)

      const state: any[] = []
      await execute(plan, state, testClient as Eip1193Provider, {
        getWalletClient: (({ account }: any) => {
          if (getAddress(account) == getAddress(member.address)) {
            return testClientWithAccount(member)
          }
          return testClientWithAccount(someone)
        }) as any,
      })
      expect(state).toHaveLength(2)

      expect(await testClient.getBalance({ address: safe2 })).toEqual(
        parseEther('1') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })

    it('plans and executes independently', async () => {
      const owner = privateKeyToAccount(hashMessage('1'))
      const member = privateKeyToAccount(hashMessage('2'))
      const receiver = privateKeyToAccount(hashMessage('3'))
      const someone = privateKeyToAccount(hashMessage('4'))

      await fund([owner.address, member.address, someone.address])

      const safe1 = await deploySafe({
        owners: [owner.address],
        threshold: 1,
        creationNonce: BigInt(hashMessage('6')),
      })

      const safe2 = await deploySafe({
        owners: [safe1],
        threshold: 1,
        creationNonce: BigInt(hashMessage('7')),
      })

      await fund([safe1, safe2])

      const { roles, roleId } = await setupRolesMod({
        owner: owner,
        avatar: safe1,
        member: member.address,
        destination: safe2,
      })

      await enableModuleInSafe({
        owner,
        safe: safe1,
        module: roles,
      })

      const route = {
        waypoints: [
          {
            account: {
              type: AccountType.EOA,
              prefixedAddress: `eoa:${member.address}` as PrefixedAddress,
              address: member.address as `0x${string}`,
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
              from: `eoa:${member.address}`,
            },
          },
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress: withPrefix(safe1),
              address: safe1,
              chain: testClient.chain.id,
              threshold: 1,
            },
            connection: {
              type: ConnectionType.IS_ENABLED,
              from: withPrefix(roles),
            },
          },
          {
            account: {
              type: AccountType.SAFE,
              prefixedAddress: withPrefix(safe2),
              address: safe2,
              chain: testClient.chain.id,
              threshold: 1,
            },
            connection: {
              type: ConnectionType.OWNS,
              from: withPrefix(safe1),
            },
          },
        ],
        id: 'test',
        initiator: `eoa:${member.address}` as PrefixedAddress,
        avatar: withPrefix(safe2),
      } as Route

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)

      const [execute1, execute2] = plan as [
        ExecuteTransactionAction,
        SafeTransactionAction,
      ]
      expect(execute1.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)
      expect(execute2.type).toEqual(ExecutionActionType.SAFE_TRANSACTION)
      expect(execute2.signature).not.toBe(null)

      expect(await testClient.getBalance({ address: safe2 })).toEqual(
        parseEther('1')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: member,
        ...execute1.transaction,
      })

      await testClient.sendTransaction({
        account: someone,
        to: execute2.safe,
        data: encodeExecTransaction({
          safeTransaction: execute2.safeTransaction,
          signature: execute2.signature as any,
        }),
      })

      expect(await testClient.getBalance({ address: safe2 })).toEqual(
        parseEther('1') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })
  })

  describe('EOA --member--> ROLES --enabled--> DELAY --enabled--> SAFE*/*', () => {
    it('plans and executes', async () => {
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
      const delay = await deployDelayMod({
        owner: owner.address,
        avatar: safe,
        target: safe,
        cooldown,
      })

      const { roles, roleId } = await setupRolesMod({
        owner,
        avatar: safe,
        target: delay,
        member: eoa.address,
        destination: receiver.address,
      })

      await enableModule({ owner, module: delay, moduleToEnable: roles })
      await enableModuleInSafe({ owner, safe, module: delay })

      const route = eoaRolesDelaySafe({
        eoa: eoa.address as any,
        roles,
        roleId,
        delay,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      const state: any[] = []
      try {
        // TODO we need execution to support cooldown delay
        await execute(plan, state, testClient as Eip1193Provider, {
          getWalletClient: (() => testClientWithAccount(eoa)) as any,
        })
      } catch (e) {}
      expect(state).toHaveLength(1)

      await testClient.increaseTime({
        seconds: cooldown * 2,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await execute(plan, state, testClient as Eip1193Provider, {
        getWalletClient: (() => testClientWithAccount(someone)) as any,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })

    it('plans and executes independently', async () => {
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
      const delay = await deployDelayMod({
        owner: owner.address,
        avatar: safe,
        target: safe,
        cooldown,
      })

      const { roles, roleId } = await setupRolesMod({
        owner,
        avatar: safe,
        target: delay,
        member: eoa.address,
        destination: receiver.address,
      })

      await enableModule({ owner, module: delay, moduleToEnable: roles })
      await enableModuleInSafe({ owner, safe, module: delay })

      const route = eoaRolesDelaySafe({
        eoa: eoa.address as any,
        roles,
        roleId,
        delay,
        safe,
      })

      const transaction: MetaTransactionRequest = {
        data: '0x',
        to: receiver.address as `0x${string}`,
        value: parseEther('0.123'),
        operation: OperationType.Call,
      }

      const plan = await planExecution([transaction], route, {
        providers: { [testClient.chain.id]: testClient as Eip1193Provider },
      })

      expect(plan).toHaveLength(2)

      const [execute1, execute2] = plan as [
        ExecuteTransactionAction,
        ExecuteTransactionAction,
      ]

      expect(execute1.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)
      expect(execute2.type).toEqual(ExecutionActionType.EXECUTE_TRANSACTION)

      expect(execute1.transaction.to).toEqual(roles as any)
      expect(execute2.transaction.to).toEqual(delay as any)

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: eoa,
        ...execute1.transaction,
      })

      await testClient.increaseTime({
        seconds: cooldown * 2,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(0n)

      await testClient.sendTransaction({
        account: someone,
        ...execute2.transaction,
      })

      expect(await testClient.getBalance({ address: safe })).toEqual(
        parseEther('10') - parseEther('0.123')
      )
      expect(
        await testClient.getBalance({ address: receiver.address })
      ).toEqual(parseEther('0.123'))
    })
  })
})
