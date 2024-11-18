import { Address, Hash } from 'viem'

import { testClient } from './client'

import { calculateRouteId } from '../src/query'
import { formatPrefixedAddress } from '../src/addresses'

import {
  AccountType,
  ConnectionType,
  PrefixedAddress,
  Route,
} from '../src/types'

/**
 * These routes exist in the mainnet snapshot and can be used for actually executing transactions.
 * However, since they are real accounts, while we can impersonate them for executing transaction on anvil
 * we won't be able to produce signatures with them.
 */
export const realRoutes = {
  eoaOwnsSafe: {
    id: '0xd48ce39bde5fc636dd1e7850037834f1f41a9acf122c5c024fa996ff8f2d90d1',
    initiator: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
    avatar: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          address: '0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
          prefixedAddress: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          address: '0x849d52316331967b6ff1198e5e32a0eb168d039d',
          chain: 1,
          prefixedAddress: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
          threshold: 3,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
        },
      },
    ],
  },
  safeAsRoleMember: {
    id: '0xd3f552f459bd0e01f9cf29cbee7619bfac71c2205d262104cf280159afafd9a4',
    initiator: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
    avatar: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          address: '0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
          prefixedAddress: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          address: '0xf099e0f6604bde0aa860b39f7da75770b34ac804',
          chain: 1,
          prefixedAddress: 'eth:0xf099e0f6604bde0aa860b39f7da75770b34ac804',
          threshold: 2,
        },
        connection: {
          type: ConnectionType.OWNS,
          from: 'eoa:0x1b0c638616ed79db430edbf549ad9512ff4a8ed1',
        },
      },
      {
        account: {
          type: AccountType.ROLES,
          address: '0x1cfb0cd7b1111bf2054615c7c491a15c4a3303cc',
          chain: 1,
          multisend: ['0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761'],
          prefixedAddress: 'eth:0x1cfb0cd7b1111bf2054615c7c491a15c4a3303cc',
          version: 1,
        },
        connection: {
          type: ConnectionType.IS_MEMBER,
          roles: ['1'],
          from: 'eth:0xf099e0f6604bde0aa860b39f7da75770b34ac804',
        },
      },
      {
        account: {
          type: AccountType.SAFE,
          address: '0x849d52316331967b6ff1198e5e32a0eb168d039d',
          chain: 1,
          prefixedAddress: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
          threshold: 3,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: 'eth:0x1cfb0cd7b1111bf2054615c7c491a15c4a3303cc',
        },
      },
    ],
  },
} satisfies { [name: string]: Route }

// This is default account that anvil uses
export const testEao = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

const eoaOwnsSafeWaypoints: Route['waypoints'] = [
  {
    account: {
      type: AccountType.EOA,
      address: testEao,
      prefixedAddress: `eoa:${testEao}`,
    },
  },
  {
    account: {
      type: AccountType.SAFE,
      address: '0x849d52316331967b6ff1198e5e32a0eb168d039d',
      chain: 1,
      prefixedAddress: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
      threshold: 3,
    },
    connection: {
      type: ConnectionType.OWNS,
      from: `eoa:${testEao}`,
    },
  },
]
/**
 * These routes use anvil testing accounts. They can be used to test signing flows without actually executing transactions.
 */
export const testRoutes = {
  eoaOwnsSafe: {
    id: calculateRouteId(eoaOwnsSafeWaypoints),
    waypoints: eoaOwnsSafeWaypoints,
    initiator: `eoa:${testEao}`,
    avatar: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
  },
} satisfies { [name: string]: Route }

const withPrefix = (address: Address) =>
  formatPrefixedAddress(testClient.chain.id, address)

export function eoaSafe({
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

export function eoaRolesSafe({
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
          address: eoa,
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

export function eoaDelaySafe({
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

export function eoaRolesDelaySafe({
  eoa,
  roles,
  roleId,
  delay,
  safe,
}: {
  eoa: `0x${string}`
  roles: Address
  roleId: Hash
  delay: Address
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
          type: AccountType.DELAY,
          address: delay as any,
          prefixedAddress: withPrefix(delay),
          chain: testClient.chain.id,
        },
        connection: {
          type: ConnectionType.IS_ENABLED,
          from: withPrefix(roles),
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
    initiator: `eoa:${eoa}`,
    avatar: withPrefix(safe),
  }
}

export function eoaRolesSafeOwnsSafe({
  eoa,
  roles,
  roleId,
  safe1,
  safe2,
}: {
  eoa: `0x${string}`
  roles: Address
  roleId: Hash
  safe1: Address
  safe2: Address
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
    initiator: `eoa:${eoa}` as PrefixedAddress,
    avatar: withPrefix(safe2),
  } as Route
}

export function eoaSafeOwnsSafe({
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

export function eoaSafeMemberOfSafe({
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

// const metaTransactions = {
//   wrapEth: {
//     to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
//     value: BigInt(1e18).toString(),
//     data: '0xd0e30db0', // deposit()
//   },
// } satisfies { [name: string]: MetaTransactionData }
