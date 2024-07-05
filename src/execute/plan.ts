import { encodeMultiSend } from './multisend'
import { calculateRouteId } from '../query/routes'
import {
  AccountType,
  ConnectionType,
  type Account,
  type PrefixedAddress,
  type Roles,
  type Route,
  type Waypoint,
} from '../types'
import type {
  MetaTransactionData,
  SafeTransaction,
} from '@safe-global/safe-core-sdk-types'
import { initProtocolKit, type CustomProviders } from './safe'
import { EthSafeSignature } from '@safe-global/protocol-kit'
import { encodeApprovedHashSignature } from './signatures'
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
  safeTransactionProperties: {
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
  options?: Options
): Promise<ExecutionPlan> => {
  // encode batch using the appropriate multiSend contract address
  const lastRolesAccount = route.waypoints.findLast(
    (wp) => wp.account.type === AccountType.ROLES
  )?.account as Roles | undefined
  const metaTransaction = encodeMultiSend(
    transactions,
    options?.multiSend ? [options.multiSend] : lastRolesAccount?.multisend
  )

  let result: ExecutionPlan = [{ metaTransaction, from: route.avatar }]

  // starting from the end, encode the execution path
  for (let i = route.waypoints.length - 1; i >= 0; i--) {
    const waypoint = route.waypoints[i]

    if ('connection' in waypoint) {
      switch (waypoint.connection.type) {
        case ConnectionType.OWNS: {
          const request = result[0]
          if (request)
            request = await planSafeOwnerExecution(request, waypoint, options)
          continue
        }

        case ConnectionType.IS_ENABLED: {
          continue
        }

        case ConnectionType.IS_MEMBER: {
          // TODO choose role:
          // - use from options?.roles?[waypoint.account.prefixedAddress]
          // - use waypoint.account.defaultRole
          // - use the first role in waypoint.connection.roles
          // TODO route through execTransactionFromModule (previous node is Delay/Roles mod & validate that chosen role === defaultRole) vs execTransactionWithRole (previous node is EOA/Safe)
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
}

const planSafeOwnerExecution = async (
  request: ExecutionAction,
  waypoint: Waypoint,
  connectedFrom: Account,
  options?: Options
): Promise<ExecutionPlan> => {
  if (waypoint.account.type !== AccountType.SAFE) {
    throw new Error(
      'Only Safe accounts can be connected through an OWNS connection'
    )
  }

  const owner = connectedFrom.address

  const safeTransactionProperties =
    options?.safeTransactionProperties?.[waypoint.account.prefixedAddress]
  const protocolKit = await initProtocolKit(
    waypoint.account.prefixedAddress,
    options?.providers
  )

  if (request.type === ExecutionActionType.EXECUTE_TRANSACTION) {
    const safeTx = await protocolKit.createTransaction({
      transactions: [request.transaction],
      options: safeTransactionProperties,
    })

    const canExecute = waypoint.account.threshold === 1
    const canSignOffchain = true
    const approveOnly = !!safeTransactionProperties?.approveOnly
    const onchainSignature = !!safeTransactionProperties?.onchainSignature

    if (canExecute && !approveOnly) {
      // Make previous node call execTransaction with an approved hash signature (v = 1, r = owner address).
      // The message sender implicitly approves the transaction hash, so we don't have to approve the hash upfront.
      // (see: https://github.com/safe-global/safe-smart-account/blob/8f80a8372d193be121dcdb52e869a258824e5c0f/contracts/Safe.sol#L308)
      safeTx.addSignature(
        new EthSafeSignature(owner, encodeApprovedHashSignature(owner))
      )
      return [
        {
          type: ExecutionActionType.EXECUTE_TRANSACTION,
          transaction: {
            to: waypoint.account.address,
            data: await protocolKit.getEncodedTransaction(safeTx),
            value: '0',
          },
        },
      ]
    }

    if (canSignOffchain && !onchainSignature) {
      // request a signature from the previous node
      const txHash = await protocolKit.getTransactionHash(safeTx)
      return [
        {
          type: ExecutionActionType.SIGN_MESSAGE,
          message: txHash,
        },
        {
          type: ExecutionActionType.RELAY_SAFE_TRANSACTION,
          safeTransaction: safeTx.data,
        },
        // TODO how do we actually get the signature into tge Safe TX relay request?
      ]
    }
  }
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
