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
import { calculateRouteId, collapseModifiers } from '../query/routes'
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
import {
  avatarAbi,
  encodeApproveHashData,
  encodeExecTransactionFromModuleData,
} from './avatar'
import { encodeExecTransactionWithRoleData } from './roles'
import { formatPrefixedAddress, parsePrefixedAddress } from '../addresses'
import { useDefaultRolesForModules } from '../waypoints'
import { typedDataForSafeTransaction } from '../eip712'

import {
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

  const [chainId, safe] = parsePrefixedAddress(route.avatar)
  if (!chainId) {
    throw new Error(
      `Invalid prefixed address for route avatar: ${route.avatar}`
    )
  }

  // pre-processing: simplify route by using default roles for zodiac modules as role members and collapsing modifiers
  let waypoints = useDefaultRolesForModules(route.waypoints)
  waypoints = collapseModifiers(waypoints)

  const safeTransaction = await populateSafeTransaction({
    chainId,
    safe,
    transaction,
    options,
  })

  let result: ExecutionPlan = [
    {
      type: shouldPropose(waypoints[waypoints.length - 1] as Waypoint, options)
        ? ExecutionActionType.PROPOSE_SAFE_TRANSACTION
        : ExecutionActionType.EXECUTE_SAFE_TRANSACTION,
      safe: route.avatar,
      safeTransaction,
      signature: null,
    },
  ]

  // starting from the end, encode the execution path
  for (let i = waypoints.length - 1; i >= 0; i--) {
    const waypoint = waypoints[i]
    const [action, ...rest] = result

    if ('connection' in waypoint) {
      switch (waypoint.connection.type) {
        case ConnectionType.OWNS: {
          result = [
            ...(await planAsSafeOwner(action, waypoints, i, options)),
            ...rest,
          ]
          continue
        }

        case ConnectionType.IS_ENABLED: {
          result = [...(await planAsSafeModule(action, waypoint)), ...rest]
          continue
        }

        case ConnectionType.IS_MEMBER: {
          result = [
            ...(await planAsRoleMember(action, waypoint, options)),
            ...rest,
          ]
          continue
        }

        default: {
          throw new Error(
            `Unsupported connection type: ${(waypoint as any).connection.type}`
          )
        }
      }
    }
  }

  return result
}

const planAsSafeOwner = async (
  request: ExecutionAction,
  waypoints: Route['waypoints'],
  index: number,
  options: Options
): Promise<ExecutionPlan> => {
  const target = waypoints[index]
  if (
    target.account.type !== AccountType.SAFE ||
    !('connection' in target) ||
    target.connection.type !== ConnectionType.OWNS
  ) {
    throw new Error(
      'Expected a Safe account connected through an OWNS connection'
    )
  }
  assert(
    request.type == ExecutionActionType.EXECUTE_SAFE_TRANSACTION ||
      request.type == ExecutionActionType.PROPOSE_SAFE_TRANSACTION
  )

  const [chainId] = parsePrefixedAddress(target.account.prefixedAddress)
  assert(!!chainId)

  const owner = waypoints[index - 1]
  const ownerIsEoa = owner.account.type == AccountType.EOA
  const ownerIsSafe = owner.account.type == AccountType.SAFE

  const typedData = typedDataForSafeTransaction({
    chainId: target.account.chain,
    safeAddress: target.account.address,
    safeTransaction: request.safeTransaction,
  })

  if (ownerIsEoa) {
    /*
     * We will produce an ECDSA signature from owner, authorizing
     * the transaction that will be executed downstream at safe
     */
    return [
      {
        type: ExecutionActionType.SIGN_TYPED_DATA,
        data: typedData,
        from: owner.account.prefixedAddress,
      },
      {
        ...request,
        signature: null, // to be filled
      },
    ]
  } else {
    assert(ownerIsSafe)
    /**
     * When upstream owner is another SAFE:
     * We could implement complex recursive code for generating fully off-chain
     * signatures when possible. However, as a first approach for the sake of
     * stability and simplicity, we will opt to make any intermediate safes to
     * post onchain approvals, and then utilize use pre-approved hashes downstream.
     */

    const approvalTransaction = await populateSafeTransaction({
      chainId,
      safe: owner.account.address,
      transaction: {
        to: target.account.address,
        value: '0',
        data: encodeApproveHashData(hashTypedData(typedData)),
      },
      options,
    })

    return [
      // do the approval from the owner
      {
        type: shouldPropose(owner, options)
          ? ExecutionActionType.PROPOSE_SAFE_TRANSACTION
          : ExecutionActionType.EXECUTE_SAFE_TRANSACTION,
        safe: owner.account.prefixedAddress,
        safeTransaction: approvalTransaction,
        signature: null,
      },
      // patch downstream
      {
        ...request,
        signature: createPreApprovedSignature(owner.account.address),
      },
    ]
  }
}

const planAsSafeModule = async (
  request: ExecutionAction,
  waypoint: Waypoint
): Promise<ExecutionPlan> => {
  if (request.type === ExecutionActionType.EXECUTE_TRANSACTION) {
    return [
      {
        type: ExecutionActionType.EXECUTE_TRANSACTION,
        transaction: {
          to: waypoint.account.address,
          data: encodeExecTransactionFromModuleData(request.transaction),
          value: '0',
        },
        from: waypoint.connection.from,
        chain: waypoint.account.chain,
      },
    ]
  }

  if (
    request.type === ExecutionActionType.SIGN_MESSAGE ||
    request.type === ExecutionActionType.SIGN_TYPED_DATA
  ) {
    // TODO use SignMessageLib (via delegatecall) to approve the transaction hash onchain
    // https://github.com/safe-global/safe-smart-account/blob/499b17ad0191b575fcadc5cb5b8e3faeae5391ae/contracts/libraries/SignMessageLib.sol
    throw new Error('Not implemented')
  }

  throw new Error(
    'Can not handle the given action type as a Safe module: ' + request.type
  )
}

const planAsRoleMember = async (
  request: ExecutionAction,
  waypoint: Waypoint,
  options?: Options
): Promise<ExecutionPlan> => {
  if (
    waypoint.account.type !== AccountType.ROLES ||
    waypoint.connection.type !== ConnectionType.IS_MEMBER
  ) {
    throw new Error(
      'Expected a Roles account connected through an IS_MEMBER connection'
    )
  }

  const version = waypoint.account.version
  const role =
    options?.roles?.[waypoint.connection.from] ||
    waypoint.connection.defaultRole ||
    waypoint.connection.roles[0]

  if (!role) {
    throw new Error('Could not determine a role')
  }

  if (request.type === ExecutionActionType.EXECUTE_TRANSACTION) {
    return [
      {
        type: ExecutionActionType.EXECUTE_TRANSACTION,
        transaction: {
          to: waypoint.account.address,
          data: encodeExecTransactionWithRoleData(
            request.transaction,
            role,
            version
          ),
          value: '0',
        },
        from: waypoint.connection.from,
        chain: waypoint.account.chain,
      },
    ]
  }

  if (
    request.type === ExecutionActionType.SIGN_MESSAGE ||
    request.type === ExecutionActionType.SIGN_TYPED_DATA
  ) {
    throw new Error('Not possible to let Safe sign messages as role member')
  }

  throw new Error(
    'Can not handle the given action type as a role member: ' + request.type
  )
}

/** Splits the route into segments at all Safe nodes that require extra signatures for execution to continue. */
export const splitExecutableSegments = (route: Route): Route[] => {
  const segments: Route[] = []
  let segmentWaypoints = [] as unknown as Route['waypoints']

  for (const waypoint of route.waypoints) {
    segmentWaypoints.push(waypoint)

    const splitRequired =
      waypoint.account.type === AccountType.SAFE &&
      'connection' in waypoint &&
      waypoint.connection.type === ConnectionType.OWNS &&
      waypoint.account.threshold > 1

    if (splitRequired) {
      segments.push({
        id: calculateRouteId(segmentWaypoints),
        waypoints: segmentWaypoints,
        avatar: waypoint.account.prefixedAddress,
        initiator: segmentWaypoints[0].account.prefixedAddress,
      })

      segmentWaypoints = [{ account: waypoint.account }]
    }
  }

  if (segmentWaypoints.length > 1) {
    segments.push({
      id: calculateRouteId(segmentWaypoints),
      waypoints: segmentWaypoints,
      avatar: route.avatar,
      initiator: segmentWaypoints[0].account.prefixedAddress,
    })
  }
  return segments
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
