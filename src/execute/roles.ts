import { type MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import { encodeFunctionData } from 'viem'

import { AccountType, ConnectionType, type Route } from '../types'

const ROLES_V1_ABI = [
  {
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
      {
        name: 'operation',
        type: 'uint8',
      },
      {
        name: 'role',
        type: 'uint16',
      },
      {
        name: 'shouldRevert',
        type: 'bool',
      },
    ],
    name: 'execTransactionWithRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const ROLES_V2_ABI = [
  {
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
      {
        name: 'operation',
        type: 'uint8',
      },
      {
        name: 'roleKey',
        type: 'bytes32',
      },
      {
        name: 'shouldRevert',
        type: 'bool',
      },
    ],
    name: 'execTransactionWithRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export const encodeExecTransactionWithRoleData = (
  transaction: MetaTransactionData,
  role: string,
  version: 1 | 2
): `0x${string}` => {
  return version === 1
    ? encodeFunctionData({
        abi: ROLES_V1_ABI,
        functionName: 'execTransactionWithRole',
        args: [
          transaction.to as `0x${string}`,
          BigInt(transaction.value),
          transaction.data as `0x${string}`,
          transaction.operation || 0,
          Number(role),
          true,
        ],
      })
    : encodeFunctionData({
        abi: ROLES_V2_ABI,
        functionName: 'execTransactionWithRole',
        args: [
          transaction.to as `0x${string}`,
          BigInt(transaction.value),
          transaction.data as `0x${string}`,
          transaction.operation || 0,
          role as `0x${string}`,
          true,
        ],
      })
}

const MODULE_ACCOUNT_TYPES = [AccountType.ROLES, AccountType.DELAY]

/**
 * If a zodiac module is used as a role member, the Roles mod must have the respective role set as defaultRole for that module address.
 * This function checks if this is the case and turns the IS_MEMBER connection into an IS_ENABLED connection so that the call will be passed through the IAvatar's standard execTransactionFromModule function.
 */
export const useDefaultRolesForModules = (waypoints: Route['waypoints']) =>
  waypoints.map((waypoint, index) => {
    const previousAccount = index > 0 ? waypoints[index - 1].account : null
    if (!previousAccount) return waypoint

    if (!MODULE_ACCOUNT_TYPES.includes(previousAccount.type)) return waypoint

    if (
      waypoint.account.type === AccountType.ROLES &&
      'connection' in waypoint &&
      waypoint.connection.type === ConnectionType.IS_MEMBER
    ) {
      const { defaultRole } = waypoint.connection

      if (!defaultRole) {
        throw new Error(
          `Roles module at waypoint #${index} does not have a default role set for module ${previousAccount.address}`
        )
      }

      return {
        ...waypoint,
        connection: { type: ConnectionType.IS_ENABLED },
      }
    }

    return waypoint
  }) as Route['waypoints']
