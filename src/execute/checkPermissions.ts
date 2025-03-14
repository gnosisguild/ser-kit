import { normalizeRoute } from './normalizeRoute'
import { planExecution, Options as PlanOptions } from './plan'
import {
  AccountType,
  MetaTransactionRequest,
  Route,
  Roles,
  Waypoint,
  StartingPoint,
} from '../types'
import { unprefixAddress } from '../addresses'
import { invariant } from '@epic-web/invariant'
import { ExecutionActionType } from './types'
import { getEip1193Provider } from './options'
import { decodeErrorResult, RpcRequestError, toHex } from 'viem'

export const checkPermissions = async (
  transactions: readonly MetaTransactionRequest[],
  route: Route,
  options: PlanOptions = {}
): Promise<
  | { success: true; error: undefined }
  | { success: false; error: PermissionViolation }
> => {
  route = await normalizeRoute(route, options)

  // find the first roles mod on the route
  const index = route.waypoints.findIndex(
    (waypoint) => waypoint.account.type === AccountType.ROLES
  )
  if (index === -1) {
    // no roles mod found, no permissions to check
    return { success: true, error: undefined }
  }
  invariant(index > 0, 'Roles mod cannot be used as starting point')

  // derive a sub route starting with an artificial EAO role member
  const rolesWaypoint = route.waypoints[index] as Waypoint
  const roleMemberPrefixedAddress = rolesWaypoint.connection.from
  const subRoute: Route = {
    id: `${route.id}-${index}`,
    avatar: route.avatar,
    initiator: roleMemberPrefixedAddress,
    waypoints: [
      {
        account: {
          type: AccountType.EOA,
          address: unprefixAddress(roleMemberPrefixedAddress),
          prefixedAddress: roleMemberPrefixedAddress,
        },
      } as StartingPoint,
      ...(route.waypoints.slice(index) as Waypoint[]),
    ],
  }

  // simulate the call to the Roles mod and check if it reverts with a permissions error
  const [action] = await planExecution(
    transactions,
    subRoute,
    overrideNonceInSafeTransactionProperties(subRoute, options)
  )
  invariant(
    action.type === ExecutionActionType.EXECUTE_TRANSACTION,
    'Expected first action to be EXECUTE_TRANSACTION'
  )
  const provider = getEip1193Provider({
    chainId: rolesWaypoint.account.chain,
    options,
  })
  const tx = {
    ...action.transaction,
    from: unprefixAddress(roleMemberPrefixedAddress),
    value: toHex(action.transaction.value),
  }

  try {
    await provider.request({
      method: 'eth_estimateGas',
      params: [tx],
    })
  } catch (e) {
    const rolesError = decodeRolesError(e)
    if (rolesError) {
      return { success: false, error: rolesError }
    }
  }

  return { success: true, error: undefined }
}

/** Override the nonce for all safes in the route to 1 so we save unnecessary nonce fetches from the Safe TX service or RPC */
const overrideNonceInSafeTransactionProperties = (
  route: Route,
  options: PlanOptions
): PlanOptions => {
  // clone so we don't mutate function arguments
  const safeTransactionProperties = options.safeTransactionProperties
    ? { ...options.safeTransactionProperties }
    : {}

  const safes = route.waypoints
    .filter((wp) => wp.account.type === AccountType.SAFE)
    .map((wp) => wp.account.prefixedAddress)

  for (const safe of safes) {
    safeTransactionProperties[safe] = {
      ...safeTransactionProperties[safe],
      nonce: 1,
    }
  }

  return { ...options, safeTransactionProperties }
}

const decodeRolesError = (error: unknown): PermissionViolation | undefined => {
  // re-throw unexpected errors
  if (
    !error ||
    typeof error !== 'object' ||
    !('name' in error) ||
    error.name !== 'RpcRequestError'
  ) {
    throw error
  }

  const rpcError = error as RpcRequestError
  const data = rpcError.data as `0x${string}`
  if (!data) return undefined

  const decodedError = decodeErrorResult({ abi: PERMISSION_CHECK_ERRORS, data })
  if (decodedError.errorName === 'ConditionViolation') {
    const [status] = decodedError.args
    invariant(
      status !== ConditionViolationStatus.Ok,
      'Invalid condition violation status'
    )
    const violation = ConditionViolationStatus[status]
    invariant(
      violation in PermissionViolation,
      'Unexpected condition violation status: ' + violation
    )
    return violation as PermissionViolation
  }

  if (decodedError.errorName in PermissionViolation) {
    return decodedError.errorName as PermissionViolation
  }

  return undefined
}

export enum PermissionViolation {
  // V1 & V2 common violations
  /** The caller is not a member of the role */
  NoMembership = 'NoMembership',
  /** The caller is not enabled on the Roles modifier */
  NotAuthorized = 'NotAuthorized',

  /** Role not allowed to delegate call to target address */
  DelegateCallNotAllowed = 'DelegateCallNotAllowed',
  /** Role not allowed to call target address */
  TargetAddressNotAllowed = 'TargetAddressNotAllowed',
  /** Role not allowed to call this function on target address */
  FunctionNotAllowed = 'FunctionNotAllowed',
  /** Role not allowed to send to target address */
  SendNotAllowed = 'SendNotAllowed',
  /** Parameter value is not equal to allowed */
  ParameterNotAllowed = 'ParameterNotAllowed',
  /** Parameter value less than allowed */
  ParameterLessThanAllowed = 'ParameterLessThanAllowed',
  /** Parameter value greater than maximum allowed by role */
  ParameterGreaterThanAllowed = 'ParameterGreaterThanAllowed',

  // V1 only violations
  /** Role not allowed to use bytes for parameter */
  ParameterNotOneOfAllowed = 'ParameterNotOneOfAllowed',

  // V2 only violations
  /** Or condition not met */
  OrViolation = 'OrViolation',
  /** Nor condition not met */
  NorViolation = 'NorViolation',
  /** Parameter value does not match */
  ParameterNotAMatch = 'ParameterNotAMatch',
  /** Array elements do not meet allowed criteria for every element */
  NotEveryArrayElementPasses = 'NotEveryArrayElementPasses',
  /** Array elements do not meet allowed criteria for at least one element */
  NoArrayElementPasses = 'NoArrayElementPasses',
  /** Parameter value not a subset of allowed */
  ParameterNotSubsetOfAllowed = 'ParameterNotSubsetOfAllowed',
  /** Bitmask exceeded value length */
  BitmaskOverflow = 'BitmaskOverflow',
  /** Bitmask not an allowed value */
  BitmaskNotAllowed = 'BitmaskNotAllowed',
  CustomConditionViolation = 'CustomConditionViolation',
  AllowanceExceeded = 'AllowanceExceeded',
  CallAllowanceExceeded = 'CallAllowanceExceeded',
  EtherAllowanceExceeded = 'EtherAllowanceExceeded',
}

enum ConditionViolationStatus {
  Ok,
  DelegateCallNotAllowed,
  TargetAddressNotAllowed,
  FunctionNotAllowed,
  SendNotAllowed,
  OrViolation,
  NorViolation,
  ParameterNotAllowed,
  ParameterLessThanAllowed,
  ParameterGreaterThanAllowed,
  ParameterNotAMatch,
  NotEveryArrayElementPasses,
  NoArrayElementPasses,
  ParameterNotSubsetOfAllowed,
  BitmaskOverflow,
  BitmaskNotAllowed,
  CustomConditionViolation,
  AllowanceExceeded,
  CallAllowanceExceeded,
  EtherAllowanceExceeded,
}

export const PERMISSION_CHECK_ERRORS = [
  // V1 & V2 common errors
  {
    inputs: [],
    name: 'NoMembership',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DelegateCallNotAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'TargetAddressNotAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'FunctionNotAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SendNotAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ParameterNotAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ParameterLessThanAllowed',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ParameterGreaterThanAllowed',
    type: 'error',
  },

  // V1 only errors
  {
    inputs: [],
    name: 'ParameterNotOneOfAllowed',
    type: 'error',
  },

  // V2 only errors
  {
    inputs: [
      {
        internalType: 'enum PermissionChecker.Status',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'bytes32',
        name: 'info',
        type: 'bytes32',
      },
    ],
    name: 'ConditionViolation',
    type: 'error',
  },
  {
    inputs: [],
    name: 'NoMembership',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
    ],
    name: 'NotAuthorized',
    type: 'error',
  },
] as const
