import { encodeMultiSend } from './multisend'
import { calculateRouteId, collapseModifiers } from '../query/routes'
import {
  AccountType,
  ConnectionType,
  type Account,
  type PrefixedAddress,
  type Roles,
  type Route,
  type Waypoint,
} from '../types'
import type { MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import { initProtocolKit, type CustomProviders } from './safe'
import { EthSafeSignature } from '@safe-global/protocol-kit'
import { encodeApprovedHashSignature } from './signatures'
import {
  ExecutionActionType,
  type ExecutionAction,
  type ExecutionPlan,
  type SafeTransactionProperties,
} from './types'
import {
  decodeExecTransactionFromModuleData,
  encodeExecTransactionFromModuleData,
} from './avatar'
import { useDefaultRolesForModules } from './roles'

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
  const transaction = encodeMultiSend(
    transactions,
    options?.multiSend ? [options.multiSend] : lastRolesAccount?.multisend
  )

  let result: ExecutionPlan = [
    {
      type: ExecutionActionType.EXECUTE_TRANSACTION,
      transaction,
      from: route.avatar,
    },
  ]

  // pre-processing: simplify route by using default roles for zodiac modules as role members and collapsing modifiers
  let waypoints = useDefaultRolesForModules(route.waypoints)
  waypoints = collapseModifiers(waypoints)

  // starting from the end, encode the execution path
  for (let i = waypoints.length - 1; i >= 0; i--) {
    const waypoint = waypoints[i]

    if ('connection' in waypoint) {
      switch (waypoint.connection.type) {
        case ConnectionType.OWNS: {
          const [action, ...rest] = result
          const plan = await planSafeOwnerExecution(
            action,
            waypoint,
            waypoints[i - 1].account,
            options
          )
          // replace the action with the safe exec action(s), keeping the rest of the plan
          result = [...plan, ...rest]
          continue
        }

        case ConnectionType.IS_ENABLED: {
          const [action, ...rest] = result
          const plan = await planSafeModuleExecution(
            action,
            waypoint,
            waypoints[i - 1].account
          )
          // replace the action with the safe module exec action(s), keeping the rest of the plan
          result = [...plan, ...rest]
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

  return result
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
    const proposeOnly = !!safeTransactionProperties?.proposeOnly
    const onchainSignature = !!safeTransactionProperties?.onchainSignature

    if (canExecute && !proposeOnly) {
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
          from: connectedFrom.prefixedAddress,
        },
      ]
    }

    // sign and propose, but don't execute the transaction

    if (!onchainSignature) {
      // request a signature from the previous node & propose the transaction via the Safe Transaction Service
      const txHash = await protocolKit.getTransactionHash(safeTx)
      return [
        {
          type: ExecutionActionType.SIGN_MESSAGE,
          message: txHash,
          from: connectedFrom.prefixedAddress,
        },
        {
          type: ExecutionActionType.PROPOSE_SAFE_TRANSACTION,
          safeTransaction: safeTx.data,
          // the signature produced from the above sign message action will be inserted here during execution of the plan
          signature: null,
        },
      ]
    } else {
      // approve the transaction hash on-chain & propose the transaction via the Safe Transaction Service
      const txHash = await protocolKit.getTransactionHash(safeTx)
      const safeInterface =
        protocolKit.getContractManager().safeContract?.contract.interface
      if (!safeInterface) throw new Error('Could not retrieve Safe interface')
      return [
        {
          type: ExecutionActionType.EXECUTE_TRANSACTION,
          transaction: {
            to: waypoint.account.address,
            data: safeInterface.encodeFunctionData('approveHash', [txHash]),
            value: '0',
          },
          from: connectedFrom.prefixedAddress,
        },
        {
          type: ExecutionActionType.PROPOSE_SAFE_TRANSACTION,
          safeTransaction: safeTx.data,
          signature: new EthSafeSignature(
            owner,
            encodeApprovedHashSignature(owner)
          ),
        },
      ]
    }
  }

  if (request.type === ExecutionActionType.SIGN_MESSAGE) {
    // sign a message with a Safe
    throw new Error('Not implemented')
  }

  if (request.type === ExecutionActionType.SIGN_TYPED_DATA) {
    // sign a message with a Safe
    throw new Error('Not implemented')
  }

  throw new Error(
    'Can not handle the given action type as a Safe owner: ' + request.type
  )
}

const planSafeModuleExecution = async (
  request: ExecutionAction,
  waypoint: Waypoint,
  connectedFrom: Account
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
        from: connectedFrom.prefixedAddress,
      },
    ]
  }

  if (
    request.type === ExecutionActionType.SIGN_MESSAGE ||
    request.type === ExecutionActionType.SIGN_TYPED_DATA
  ) {
    throw new Error('Impossible to sign as a Safe module')
  }

  throw new Error(
    'Can not handle the given action type as a Safe module: ' + request.type
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
