import { invariant } from '@epic-web/invariant'
import { Address, decodeErrorResult, Hex, RpcRequestError, toHex } from 'viem'
import { normalizeRoute } from './normalizeRoute'
import { planExecution, Options as PlanOptions } from './plan'
import {
  AccountType,
  MetaTransactionRequest,
  Route,
  Waypoint,
  StartingPoint,
  PrefixedAddress,
  ChainId,
} from '../types'
import { splitPrefixedAddress, unprefixAddress } from '../addresses'
import { ExecutionActionType } from './types'
import { getEip1193Provider } from './options'
import encodeExecTransactionWithRole from '../encode/execTransactionWithRole'

export const determineRole = async ({
  rolesMod,
  version,
  member,
  roles,
  transaction,
  options,
}: {
  rolesMod: PrefixedAddress
  version: 1 | 2
  member: PrefixedAddress
  roles: string[]
  transaction: MetaTransactionRequest
  options: PlanOptions
}) => {
  const [chainId, to] = splitPrefixedAddress(rolesMod)
  const memberAddress = unprefixAddress(member)

  invariant(chainId, 'Invalid roles mod address')

  try {
    return await Promise.any(
      roles.map(async (role) => {
        await testPermissions({
          chainId,
          to,
          data: encodeExecTransactionWithRole({
            transaction,
            role,
            version,
          }),
          from: memberAddress,
          options,
        })
        return role
      })
    )
  } catch (e) {
    invariant(e instanceof AggregateError, 'Expected AggregateError')
    invariant(
      e.errors.every((err) => err instanceof PermissionError),
      'Unexpected error'
    )

    // No role allowed the transaction
    return null
  }
}

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

  try {
    await testPermissions({
      chainId: rolesWaypoint.account.chain,
      to: action.transaction.to,
      data: action.transaction.data,
      from: unprefixAddress(roleMemberPrefixedAddress),
      options,
    })
  } catch (e) {
    if (e instanceof PermissionError) {
      return { success: false, error: e.violation }
    }
  }

  return { success: true, error: undefined }
}

class PermissionError extends Error {
  constructor(public readonly violation: PermissionViolation) {
    super(`Permission violation: ${violation}`)
    this.name = 'PermissionError'
  }
}

/**
 * Simulate a call to the Roles mod. Return true if the transaction is allowed.
 * @throws a PermissionError if the transaction is not allowed
 **/
const testPermissions = async ({
  chainId,
  to,
  data,
  from,
  options,
}: {
  chainId: ChainId
  to: Address
  data: Hex
  from: Address
  options: PlanOptions
}) => {
  const provider = getEip1193Provider({
    chainId,
    options,
  })

  try {
    await provider.request({
      method: 'eth_estimateGas',
      params: [
        {
          to,
          data,
          from,
          value: toHex(0),
        },
      ],
    })
  } catch (e) {
    const rolesError = decodeRolesError(e)
    if (rolesError) {
      throw new PermissionError(rolesError)
    }
  }

  // signal success
  return true
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

  const { data, details } = error as RpcRequestError
  const revertData = isHexData(data)
    ? data
    : isHexData(details)
      ? details
      : undefined

  if (!revertData) return undefined

  const decodedError = tryDecodeErrorResult(revertData)

  if (decodedError && decodedError.errorName === 'ConditionViolation') {
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

  if (decodedError && decodedError.errorName in PermissionViolation) {
    return decodedError.errorName as PermissionViolation
  }

  return undefined
}

const isHexData = (data: unknown): data is `0x${string}` => {
  return typeof data === 'string' && data.startsWith('0x')
}

const tryDecodeErrorResult = (revertData: `0x${string}`) => {
  try {
    return decodeErrorResult({
      abi: PERMISSION_CHECK_ERRORS,
      data: revertData,
    })
  } catch {
    return null
  }
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
