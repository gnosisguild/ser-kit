import assert from 'assert'
import {
  Address,
  encodeFunctionData,
  getAddress,
  hashTypedData,
  zeroAddress,
} from 'viem'
import {
  OperationType,
  SafeTransactionData,
  type MetaTransactionData,
} from '@safe-global/types-kit'
import { Eip1193Provider } from '@safe-global/protocol-kit'

import { encodeMultiSend } from './multisend'
import {
  AccountType,
  ChainId,
  Connection,
  ConnectionType,
  StartingPoint,
  type PrefixedAddress,
  type Roles,
  type Route,
  type Waypoint,
} from '../types'

import { createPreApprovedSignature } from './signatures'
import { unwrapExecuteTransaction } from './action'
import {
  avatarAbi,
  encodeApproveHashData,
  encodeExecTransactionFromModuleData,
} from './avatar'
import { encodeExecTransactionWithRoleData } from './roles'
import { encodeExecuteNextTxData } from './delay'
import { formatPrefixedAddress, splitPrefixedAddress } from '../addresses'
import { typedDataForSafeTransaction } from '../eip712'

import {
  ExecuteTransactionAction,
  ExecutionActionType,
  type ExecutionAction,
  type ExecutionPlan,
  type SafeTransactionProperties,
} from './types'

interface Options {
  /** Allows specifying which role to choose at any Roles node in the route in case multiple roles are available. */
  roles?: { [rolesMod: PrefixedAddress]: string }
  /** Allows overriding the default transaction properties for any Safe node in the route that is connected through an OWNS connection. */
  safeTransactionProperties?: {
    [safe: PrefixedAddress]: SafeTransactionProperties
  }
  providers?: {
    [chainId in ChainId]?: string | Eip1193Provider
  }
  /** Allows customizing the multi-send contract address */
  multiSend?: `0x${string}`
}

/**
 * Encodes the given transactions, routing their execution through the given route.
 * Returns a single transaction or signature request for triggering the execution.
 * Throws if the route requires more than a single transaction or signature request.
 * @param transactions The transactions to execute from the avatar.
 * @param route The route to encode for execution.
 * @param options Optional parameters to customize the execution.
 */
export const planExecution = async (
  transactions: readonly MetaTransactionData[],
  route: Route,
  options: Options
): Promise<ExecutionPlan> => {
  // encode batch using the appropriate multiSend contract address
  const lastRolesAccount = route.waypoints.findLast(
    (wp) => wp.account.type === AccountType.ROLES
  )?.account as Roles | undefined
  const transaction = encodeMultiSend(
    transactions,
    options?.multiSend ? [options.multiSend] : lastRolesAccount?.multisend
  )

  const [chainId] = splitPrefixedAddress(route.avatar)
  if (!chainId) {
    throw new Error(
      `Invalid prefixed address for route avatar: ${route.avatar}`
    )
  }

  const waypoints = route.waypoints
  let result: ExecutionAction[] = [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: chainId,
      from: route.avatar,
      transaction,
    },
  ]

  // starting from the end, encode the execution path
  for (let i = waypoints.length - 1; i >= 0; i--) {
    const waypoint = waypoints[i]
    const [action, ...rest] = result

    if (waypoint.account.type == AccountType.EOA) {
      result = [...(await planAsEOA(action, waypoints, i)), ...rest]
    } else if (waypoint.account.type == AccountType.SAFE) {
      result = [...(await planAsSafe(action, waypoints, i, options)), ...rest]
    } else if (waypoint.account.type == AccountType.ROLES) {
      result = [...(await planAsRoles(action, waypoints, i, options)), ...rest]
    } else {
      result = [...(await planAsDelay(action, waypoints, i)), ...rest]
    }
  }

  return result as ExecutionPlan
}

const planAsEOA = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number
): Promise<ExecutionAction[]> => {
  const { waypoint, right } = pointers(waypoints, index)
  assert(waypoint.account.type == AccountType.EOA)
  assert(right != null)

  if (
    request.type === ExecutionActionType.SAFE_TRANSACTION ||
    request.type === ExecutionActionType.PROPOSE_TRANSACTION
  ) {
    const typedData = typedDataForSafeTransaction({
      chainId: right.account.chain,
      safeAddress: right.account.address,
      safeTransaction: request.safeTransaction,
    })
    return [
      {
        type: ExecutionActionType.SIGN_TYPED_DATA,
        chain: splitPrefixedAddress(waypoint.account.prefixedAddress)[0]!,
        from: waypoint.account.prefixedAddress,
        data: typedData,
      },
      request,
    ]
  }

  return [request]
}

const planAsSafe = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number,
  options: Options
): Promise<ExecutionAction[]> => {
  const { waypoint, left, right } = pointers(waypoints, index)
  assert(waypoint.account.type == AccountType.SAFE)

  assert(
    'connection' in waypoint &&
      (waypoint.connection.type == ConnectionType.IS_ENABLED ||
        waypoint.connection.type == ConnectionType.OWNS)
  )

  assert(
    request.type == ExecutionActionType.SAFE_TRANSACTION ||
      request.type == ExecutionActionType.PROPOSE_TRANSACTION ||
      request.type == ExecutionActionType.EXECUTE_TRANSACTION
  )

  /*
   * We divide plan into two sections: IN and OUT.
   *
   * IN: -----
   * We check if we are generating an approval for a downstream transaction
   * in a safe where we currently hold ownership. If so, we create an
   * additional approval transaction. This involves determining the
   * downstream's EIP-712 hash and calling approveHash with it.
   *
   * OUT: -----
   * For OUT, we handle wrapping. If there is an owner upstream, we wrap
   * the current execution into a relay. If not, we wrap it into a standard
   * execution.
   */

  // IN
  let transaction, result
  if (request.type == ExecutionActionType.EXECUTE_TRANSACTION) {
    transaction = request.transaction
    result = [] as ExecutionAction[]
  } else {
    assert(right && right.account.type == AccountType.SAFE)
    const typedData = typedDataForSafeTransaction({
      chainId: right.account.chain,
      safeAddress: right.account.address,
      safeTransaction: request.safeTransaction,
    })
    transaction = {
      to: right.account.address,
      value: '0',
      data: encodeApproveHashData(hashTypedData(typedData)),
    }
    result = [
      {
        ...request,
        signature: createPreApprovedSignature(waypoint.account.address),
      },
    ] as ExecutionPlan
  }

  // OUT
  if (waypoint.connection.type == ConnectionType.OWNS) {
    return [
      {
        type: shouldPropose(waypoint, options)
          ? ExecutionActionType.PROPOSE_TRANSACTION
          : ExecutionActionType.SAFE_TRANSACTION,
        safe: waypoint.account.prefixedAddress,
        safeTransaction: await populateSafeTransaction({
          chainId: waypoint.account.chain,
          safe: waypoint.account.address,
          transaction,
          options,
        }),

        // to be filled upstream
        proposer: `eoa:${zeroAddress}`,
        // to be filled upstream
        signature: null,
      },
      ...result,
    ]
  } else {
    assert(waypoint.connection.type == ConnectionType.IS_ENABLED)
    return [
      {
        type: ExecutionActionType.EXECUTE_TRANSACTION,
        transaction: {
          to: waypoint.account.address,
          data: encodeExecTransactionFromModuleData(transaction),
          value: '0',
        },
        from: left!.account.prefixedAddress,
        chain: waypoint.account.chain,
      },
      ...result,
    ]
  }
}

const planAsRoles = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number,
  options: Options
): Promise<ExecutionAction[]> => {
  /*
   * coming soon: relays for Modules
   */
  const { waypoint, left, right } = pointers(waypoints, index)
  assert(waypoint.account.type == AccountType.ROLES)

  const validUpstream =
    left != null &&
    'connection' in waypoint &&
    waypoint.connection.type == ConnectionType.IS_MEMBER
  if (!validUpstream) {
    throw new Error(`Invalid Roles upstream relationship`)
  }
  assert(waypoint.connection.type == ConnectionType.IS_MEMBER)

  const validDownstream =
    right?.connection.type == ConnectionType.IS_ENABLED &&
    (right?.account.type == AccountType.SAFE ||
      right?.account.type == AccountType.DELAY)
  if (!validDownstream) {
    throw new Error(`Invalid Roles downstream relationship`)
  }

  const version = waypoint.account.version
  const role =
    options?.roles?.[waypoint.connection.from] ||
    waypoint.connection.defaultRole ||
    waypoint.connection.roles[0]

  const transaction = unwrapExecuteTransaction(
    request as ExecuteTransactionAction
  )

  return [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecTransactionWithRoleData(transaction, role, version),
        value: '0',
      },
      from: left.account.prefixedAddress,
    },
  ]
}

const planAsDelay = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number
): Promise<ExecutionAction[]> => {
  /*
   * coming soon: relays for Modules
   */
  const { waypoint, left } = pointers(waypoints, index)
  assert(waypoint.account.type == AccountType.DELAY)
  assert(left != null)

  const transaction = unwrapExecuteTransaction(
    request as ExecuteTransactionAction
  )

  return [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecTransactionFromModuleData(transaction),
        value: '0',
      },
      from: left.account.prefixedAddress,
    },
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecuteNextTxData(transaction),
        value: '0',
      },
      from: left.account.prefixedAddress,
    },
  ]
}

function shouldPropose(waypoint: Waypoint | StartingPoint, options?: Options) {
  assert(waypoint.account.type == AccountType.SAFE)
  const safeTransactionProperties =
    options?.safeTransactionProperties?.[waypoint.account.prefixedAddress]

  const proposeOnly = !!safeTransactionProperties?.proposeOnly
  const canExecute = waypoint.account.threshold === 1
  return proposeOnly || !canExecute
}

async function populateSafeTransaction({
  chainId,
  safe,
  transaction,
  options,
}: {
  chainId: ChainId
  safe: Address
  transaction: MetaTransactionData
  options: Options
}) {
  if (!options.providers || !options.providers[chainId]) {
    throw new Error('Provider is required')
  }

  const provider = options.providers[chainId] as Eip1193Provider
  const defaults =
    options?.safeTransactionProperties?.[formatPrefixedAddress(chainId, safe)]

  const nonce = BigInt(
    (await provider.request({
      method: 'eth_call',
      params: [
        {
          to: safe,
          data: encodeFunctionData({
            abi: avatarAbi,
            functionName: 'nonce',
            args: [],
          }),
        },
      ],
    })) as string
  )

  return {
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
    operation: transaction.operation ?? OperationType.Call,
    safeTxGas: Number(defaults?.safeTxGas || 0),
    baseGas: Number(defaults?.baseGas || 0),
    gasPrice: Number(defaults?.gasPrice || 0),
    gasToken: getAddress(defaults?.gasToken || zeroAddress),
    refundReceiver: getAddress(defaults?.refundReceiver || zeroAddress),
    nonce: defaults?.nonce || nonce,
  } as unknown as SafeTransactionData
}

function pointers(waypoints: Route['waypoints'], index: number) {
  const waypoint = waypoints[index]

  const left = index > 0 ? waypoints[index - 1] : null
  if (left) {
    assert(
      'connection' in waypoint &&
        waypoint.connection.from == left?.account.prefixedAddress
    )
  }

  const right = index < waypoints.length + 1 ? waypoints[index + 1] : null
  if (right) {
    assert(
      'connection' in right &&
        (right.connection as Connection).from ==
          waypoint.account.prefixedAddress
    )
  }

  return {
    waypoint,
    left,
    right,
  } as {
    waypoint: StartingPoint | Waypoint
    left: StartingPoint | Waypoint | null
    right: Waypoint | null
  }
}
