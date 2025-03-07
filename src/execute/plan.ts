import { invariant } from '@epic-web/invariant'
import {
  decodeFunctionData,
  getAddress,
  hashTypedData,
  parseAbi,
  zeroAddress,
} from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'

import { createPreApprovedSignature } from './signatures'
import { encodeMultiSend } from './multisend'
import { normalizeRoute } from './normalizeRoute'
import { prepareSafeTransaction } from './safeTransaction'

import { splitPrefixedAddress } from '../addresses'
import { typedDataForSafeTransaction } from '../eip712'

import encodeApproveHash from '../encode/approveHash'
import encodeExecTransaction from '../encode/execTransaction'
import encodeExecTransactionFromModule from '../encode/execTransactionFromModule'
import encodeExecTransactionWithRole from '../encode/execTransactionWithRole'
import encodeExecuteNextTxData from '../encode/executeNextTx'

import {
  ExecuteTransactionAction,
  ExecutionActionType,
  SafeTransactionAction,
  type ExecutionAction,
  type ExecutionPlan,
  type SafeTransactionProperties,
} from './types'

import {
  AccountType,
  Address,
  ChainId,
  Connection,
  ConnectionType,
  MetaTransactionRequest,
  SafeTransactionRequest,
  StartingPoint,
  type PrefixedAddress,
  type Roles,
  type Route,
  type Waypoint,
} from '../types'

export interface Options {
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
  multiSend?: Address
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
  transactions: readonly MetaTransactionRequest[],
  route: Route,
  options: Options = {}
): Promise<ExecutionPlan> => {
  route = await normalizeRoute(route, options)

  // encode batch using the appropriate multiSend contract address
  const lastRolesAccount = route.waypoints.findLast(
    (wp) => wp.account.type === AccountType.ROLES
  )?.account as Roles | undefined
  const transaction = encodeMultiSend(
    transactions,
    options?.multiSend ? [options.multiSend] : lastRolesAccount?.multisend
  )

  const [chainId, avatar] = splitPrefixedAddress(route.avatar)
  if (!chainId) {
    throw new Error(
      `Invalid prefixed address for route avatar: ${route.avatar}`
    )
  }

  const waypoints = route.waypoints
  let result: ExecutionAction[] = [
    {
      type: ExecutionActionType.SAFE_TRANSACTION,
      chain: chainId,
      safe: avatar,
      safeTransaction: transaction as SafeTransactionRequest,
      proposer: zeroAddress,
      signature: null,
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
  invariant(
    waypoint.account.type == AccountType.EOA,
    `Expected account type to be "${AccountType.EOA}" but got "${waypoint.account.type}"`
  )
  invariant(right != null, 'Expected next waypoint to not be undefined')

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
        chain: right.account.chain,
        from: waypoint.account.address,
        typedData,
      },
      {
        ...request,
        proposer: waypoint.account.address,
        signature: null,
      },
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
  const { waypoint, connection, left, right } = pointers(waypoints, index)

  invariant(
    waypoint.account.type == AccountType.SAFE,
    `Expected account type to be "${AccountType.SAFE}" but got "${waypoint.account.type}"`
  )

  if (left !== null) {
    invariant(
      connection?.type == ConnectionType.IS_ENABLED ||
        connection?.type == ConnectionType.OWNS,
      `Connection type must be "${ConnectionType.IS_ENABLED}" or "${ConnectionType.OWNS}" but got "${connection?.type}"`
    )
  }

  invariant(
    request.type == ExecutionActionType.SAFE_TRANSACTION ||
      request.type == ExecutionActionType.PROPOSE_TRANSACTION ||
      request.type == ExecutionActionType.EXECUTE_TRANSACTION,
    `Request type must be "${ExecutionActionType.SAFE_TRANSACTION}", "${ExecutionActionType.PROPOSE_TRANSACTION}", or "${ExecutionActionType.EXECUTE_TRANSACTION}" nut was "${request.type}"`
  )

  const isAnchor = right == null

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
  let transaction: MetaTransactionRequest = ((
    request as ExecuteTransactionAction
  ).transaction ||
    (request as SafeTransactionAction)
      .safeTransaction) as MetaTransactionRequest
  let result = [] as ExecutionAction[]

  if (
    (request.type == ExecutionActionType.SAFE_TRANSACTION ||
      request.type == ExecutionActionType.PROPOSE_TRANSACTION) &&
    !isAnchor
  ) {
    invariant(
      right.account.type == AccountType.SAFE,
      `Expected account type "${AccountType.SAFE}" but got "${right.account.type}"`
    )
    const typedData = typedDataForSafeTransaction({
      chainId: right.account.chain,
      safeAddress: right.account.address,
      safeTransaction: request.safeTransaction,
    })
    transaction = {
      to: right.account.address,
      data: encodeApproveHash(hashTypedData(typedData)),
      value: 0n,
    }
    result = [
      {
        ...request,
        proposer: waypoint.account.address,
        signature: createPreApprovedSignature(waypoint.account.address),
      },
    ]
  }

  // OUT
  const isInitiator = left == null
  const isUpstreamOwner = connection?.type == ConnectionType.OWNS
  const isUpstreamModule = connection?.type == ConnectionType.IS_ENABLED

  if (isUpstreamOwner) {
    if (shouldExecute(waypoint, options)) {
      return [
        {
          type: ExecutionActionType.EXECUTE_TRANSACTION,
          chain: waypoint.account.chain,
          from: left?.account.address!,
          transaction: {
            to: waypoint.account.address,
            data: encodeExecTransaction({
              safeTransaction: await prepareSafeTransaction({
                chainId: waypoint.account.chain,
                safe: waypoint.account.address,
                transaction,
                options,
              }),
              signature: createPreApprovedSignature(left?.account.address!),
            }),
            value: 0n,
          },
        },
        ...result,
      ]
    }

    return [
      {
        type: shouldPropose(waypoint, options)
          ? ExecutionActionType.PROPOSE_TRANSACTION
          : ExecutionActionType.SAFE_TRANSACTION,
        chain: waypoint.account.chain,
        safe: waypoint.account.address,
        safeTransaction: await prepareSafeTransaction({
          chainId: waypoint.account.chain,
          safe: waypoint.account.address,
          transaction,
          options,
        }),

        // to be filled upstream
        proposer: zeroAddress,
        // to be filled upstream
        signature: null,
      },
      ...result,
    ]
  }

  if (isUpstreamModule) {
    return [
      {
        type: ExecutionActionType.EXECUTE_TRANSACTION,
        chain: waypoint.account.chain,
        from: left!.account.address,
        transaction: {
          to: waypoint.account.address,
          data: encodeExecTransactionFromModule(transaction),
          value: 0n,
        },
      },
      ...result,
    ]
  }

  invariant(isInitiator, 'Expected isInitiator to be "true"')

  return [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      from: waypoint.account.address,
      transaction,
    },
    ...result,
  ]
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
  invariant(
    waypoint.account.type == AccountType.ROLES,
    `Expected account type to be "${AccountType.ROLES}" but got "${waypoint.account.type}"`
  )

  const validUpstream =
    left != null &&
    'connection' in waypoint &&
    waypoint.connection.type == ConnectionType.IS_MEMBER
  if (!validUpstream) {
    throw new Error(`Invalid Roles upstream relationship`)
  }
  invariant(
    waypoint.connection.type == ConnectionType.IS_MEMBER,
    `Expected connection type to be "${ConnectionType.IS_MEMBER}" but got "${waypoint.connection.type}"`
  )

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
      from: left.account.address,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecTransactionWithRole({
          transaction,
          role,
          version,
        }),
        value: 0n,
      },
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
  invariant(
    waypoint.account.type == AccountType.DELAY,
    `Expected account type to be "${AccountType.DELAY}" but got "${waypoint.account.type}"`
  )
  invariant(left != null, 'Expected waypoint to have a predecessor')

  const transaction = unwrapExecuteTransaction(
    request as ExecuteTransactionAction
  )

  return [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      from: left.account.address,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecTransactionFromModule(transaction),
        value: 0n,
      },
    },
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      chain: waypoint.account.chain,
      from: left.account.address,
      transaction: {
        to: waypoint.account.address,
        data: encodeExecuteNextTxData(transaction),
        value: 0n,
      },
    },
  ]
}

function shouldExecute(waypoint: Waypoint | StartingPoint, options?: Options) {
  invariant(
    waypoint.account.type == AccountType.SAFE,
    `Expected account type to be "${AccountType.SAFE}" but got "${waypoint.account.type}"`
  )
  const safeTransactionProperties =
    options?.safeTransactionProperties?.[waypoint.account.prefixedAddress]

  const proposeOnly = !!safeTransactionProperties?.proposeOnly
  const canExecute = waypoint.account.threshold === 1
  return !proposeOnly && canExecute
}

function shouldPropose(waypoint: Waypoint | StartingPoint, options?: Options) {
  invariant(
    waypoint.account.type == AccountType.SAFE,
    `Expected account type to be "${AccountType.SAFE}" but got "${waypoint.account.type}"`
  )
  const safeTransactionProperties =
    options?.safeTransactionProperties?.[waypoint.account.prefixedAddress]

  const proposeOnly = !!safeTransactionProperties?.proposeOnly
  const canExecute = waypoint.account.threshold === 1
  return proposeOnly || !canExecute
}

function unwrapExecuteTransaction(
  action: ExecuteTransactionAction
): MetaTransactionRequest {
  const abi = parseAbi([
    'function approveHash(bytes32 hashToApprove)',
    'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
    'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  ])

  const {
    args: [to, value, data, operation],
  } = decodeFunctionData({
    abi,
    data: action.transaction.data as any,
  })

  return {
    to: getAddress(to).toLowerCase() as Address,
    value: value!,
    data: data!,
    operation,
  }
}

function pointers(waypoints: Route['waypoints'], index: number) {
  const waypoint = waypoints[index]

  const left = index > 0 ? waypoints[index - 1] : null
  if (left) {
    invariant(
      'connection' in waypoint &&
        waypoint.connection.from == left.account.prefixedAddress,
      'connection' in waypoint
        ? `Expected "${waypoint.connection.from}" to equal "${left.account.prefixedAddress}"`
        : 'Expected waypoint to contain a connection but it did not.'
    )
  }

  const right = index < waypoints.length + 1 ? waypoints[index + 1] : null
  if (right) {
    invariant(
      'connection' in right &&
        (right.connection as Connection).from ==
          waypoint.account.prefixedAddress,
      'connection' in right
        ? `Expected "${(right.connection as Connection).from}" to equal "${waypoint.account.prefixedAddress}"`
        : 'Expected waypoint to contain a connection but it did not'
    )
  }

  return {
    waypoint,
    left,
    right,
    connection: left ? (waypoint as Waypoint).connection! : null,
  } as {
    waypoint: StartingPoint | Waypoint
    left: StartingPoint | Waypoint | null
    right: Waypoint | null
    connection: Connection | null
  }
}
