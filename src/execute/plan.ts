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
  ConnectionType,
  StartingPoint,
  type PrefixedAddress,
  type Roles,
  type Route,
  type Waypoint,
} from '../types'

import { type CustomProviders } from './safe'

import { createPreApprovedSignature } from './signatures'
import { avatarAbi, encodeApproveHashData } from './avatar'
import { formatPrefixedAddress, parsePrefixedAddress } from '../addresses'
import { typedDataForSafeTransaction } from '../eip712'

import {
  ExecutionActionType,
  type ExecutionAction,
  type ExecutionPlan,
  type SafeTransactionProperties,
} from './types'
import { encodeExecTransactionWithRoleData } from './roles'

interface Options {
  /** Allows specifying which role to choose at any Roles node in the route in case multiple roles are available. */
  roles?: { [rolesMod: PrefixedAddress]: string }
  /** Allows overriding the default transaction properties for any Safe node in the route that is connected through an OWNS connection. */
  safeTransactionProperties?: {
    [safe: PrefixedAddress]: SafeTransactionProperties
  }
  providers?: CustomProviders
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

  const [chainId] = parsePrefixedAddress(route.avatar)
  if (!chainId) {
    throw new Error(
      `Invalid prefixed address for route avatar: ${route.avatar}`
    )
  }

  const waypoints = route.waypoints
  let result: ExecutionAction[] = [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      transaction,
      chain: chainId,
      from: route.avatar,
    },
  ]

  // starting from the end, encode the execution path
  for (let i = waypoints.length - 1; i >= 0; i--) {
    const waypoint = waypoints[i]
    const [action, ...rest] = result

    if (waypoint.account.type == AccountType.EOA) {
      result = [...(await planAsEOA(action, waypoints, i, options)), ...rest]
    } else if (waypoint.account.type == AccountType.SAFE) {
      result = [...(await planAsSafe(action, waypoints, i, options)), ...rest]
    } else if (waypoint.account.type == AccountType.ROLES) {
      result = [...(await planAsRoles(action, waypoints, i, options)), ...rest]
    } else {
      assert(waypoint.account.type == AccountType.DELAY)
      throw new Error('TODO')
    }
  }

  return result as ExecutionPlan
}

const planAsEOA = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number,
  options: Options
): Promise<ExecutionAction[]> => {
  const { prev, curr, next, chainId } = unfold(waypoints, index)
  assert(prev == null)
  assert(curr.account.type == AccountType.EOA)
  assert(next && 'connection' in next)

  if (
    request.type === ExecutionActionType.RELAY_SAFE_TRANSACTION ||
    request.type === ExecutionActionType.PROPOSE_SAFE_TRANSACTION
  ) {
    const typedData = typedDataForSafeTransaction({
      chainId: next.account.chain,
      safeAddress: next.account.address,
      safeTransaction: request.safeTransaction,
    })
    return [
      {
        type: ExecutionActionType.SIGN_TYPED_DATA,
        data: typedData,
        from: curr.account.prefixedAddress,
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
  const curr = waypoints[index]
  assert(curr.account.type == AccountType.SAFE)

  if (!('connection' in curr)) {
    throw new Error('Expected a Safe connected to')
  }
  const [chainId] = parsePrefixedAddress(curr.account.prefixedAddress)
  assert(!!chainId)

  const prev = index > 0 ? waypoints[index - 1] : null
  const next = index < waypoints.length + 1 ? waypoints[index + 1] : null
  assert(curr.connection.from == prev?.account.prefixedAddress)

  if (request.type == ExecutionActionType.EXECUTE_TRANSACTION) {
    const safeTransaction = await populateSafeTransaction({
      chainId,
      safe: curr.account.address,
      transaction: request.transaction,
      options,
    })
    return [
      {
        type: shouldPropose(curr, options)
          ? ExecutionActionType.PROPOSE_SAFE_TRANSACTION
          : ExecutionActionType.RELAY_SAFE_TRANSACTION,
        safe: curr.account.prefixedAddress,
        safeTransaction,
        signature: null, // to be filled
      },
    ]
  }

  if (
    request.type == ExecutionActionType.RELAY_SAFE_TRANSACTION ||
    request.type == ExecutionActionType.PROPOSE_SAFE_TRANSACTION
  ) {
    assert(next?.account.type == AccountType.SAFE)
    const typedData = typedDataForSafeTransaction({
      chainId: next.account.chain,
      safeAddress: next.account.address,
      safeTransaction: request.safeTransaction,
    })
    const approvalTransaction = await populateSafeTransaction({
      chainId,
      safe: curr.account.address,
      transaction: {
        to: next.account.address,
        value: '0',
        data: encodeApproveHashData(hashTypedData(typedData)),
      },
      options,
    })

    return [
      {
        type: shouldPropose(curr, options)
          ? ExecutionActionType.PROPOSE_SAFE_TRANSACTION
          : ExecutionActionType.RELAY_SAFE_TRANSACTION,
        safe: curr.account.prefixedAddress,
        safeTransaction: approvalTransaction,
        signature: null, // to be filled upstream
      },
      {
        ...request,
        signature: createPreApprovedSignature(curr.account.address),
      },
    ]
  }

  throw new Error(`Unsupported/Unexpected (TODO better message)`)
}

const planAsRoles = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number,
  options: Options
): Promise<ExecutionAction[]> => {
  /*
   * Once we add backend support, we will be able
   * to detect relay friendliness on roles mods
   * and an option to relay will be intruced here as
   * well
   */

  const { prev, curr, next, chainId } = unfold(waypoints, index)
  assert(curr.account.type == AccountType.ROLES)

  const validUpstream =
    prev != null &&
    'connection' in curr &&
    curr.connection.type == ConnectionType.IS_MEMBER
  if (!validUpstream) {
    throw new Error(`Invalid Roles upstream relationship`)
  }
  assert(curr.connection.type == ConnectionType.IS_MEMBER)

  const validDownstream =
    next?.connection.type == ConnectionType.IS_ENABLED &&
    (next?.account.type == AccountType.SAFE ||
      next?.account.type == AccountType.DELAY)
  if (!validDownstream) {
    throw new Error(`Invalid Roles downstream relationship`)
  }
  assert(
    [
      ExecutionActionType.EXECUTE_TRANSACTION,
      ExecutionActionType.RELAY_SAFE_TRANSACTION,
      ExecutionActionType.PROPOSE_SAFE_TRANSACTION,
    ].includes(request.type)
  )

  const version = curr.account.version
  const role =
    options?.roles?.[curr.connection.from] ||
    curr.connection.defaultRole ||
    curr.connection.roles[0]

  const transaction: MetaTransactionData =
    (request as any).transaction || (request as any).safeTransaction

  return [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      transaction: {
        to: curr.account.address,
        data: encodeExecTransactionWithRoleData(transaction, role, version),
        value: '0',
      },
      from: prev.account.prefixedAddress,
      chain: chainId,
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

function unfold(waypoints: Route['waypoints'], index: number) {
  const curr = waypoints[index]
  const prev = index > 0 ? waypoints[index - 1] : null
  const next = index < waypoints.length + 1 ? waypoints[index + 1] : null
  if ('connection' in curr) {
    assert(curr.connection.from == prev?.account.prefixedAddress)
  }

  const [chainId] = parsePrefixedAddress(
    waypoints[index].account.prefixedAddress
  )
  assert(!!chainId)

  return {
    prev,
    curr,
    next,
    chainId,
  } as {
    prev: StartingPoint | Waypoint | null
    curr: StartingPoint | Waypoint
    next: Waypoint | null
    chainId: ChainId
  }
}
