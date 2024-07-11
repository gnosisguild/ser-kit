import {
  AccountType,
  ConnectionType,
  calculateRouteId,
  type Route,
} from '../src'

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
