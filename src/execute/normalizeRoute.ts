import { Address, encodeFunctionData, parseAbi } from 'viem'

import { splitPrefixedAddress, validatePrefixedAddress } from '../addresses'

import {
  Account,
  AccountType,
  ChainId,
  Connection,
  PrefixedAddress,
  Route,
  StartingPoint,
  Waypoint,
} from '../types'
import { getEip1193Provider, Options } from './options'

export async function normalizeRoute(
  route: Route,
  options?: Options
): Promise<Route> {
  const waypoints = await Promise.all(
    route.waypoints.map((w) => normalizeWaypoint(w, options))
  )

  return {
    id: route.id,
    initiator: normalizePrefixedAddress(route.initiator),
    avatar: normalizePrefixedAddress(route.avatar),
    waypoints: waypoints as [StartingPoint, ...Waypoint[]],
  }
}

export async function normalizeWaypoint(
  waypoint: StartingPoint | Waypoint,
  options?: Options
): Promise<StartingPoint | Waypoint> {
  waypoint = {
    ...waypoint,
    account: await normalizeAccount(waypoint.account, options),
  }

  if ('connection' in waypoint) {
    waypoint = {
      ...waypoint,
      connection: normalizeConnection(waypoint.connection as Connection),
    }
  }

  return waypoint
}

async function normalizeAccount(
  account: Account,
  options?: Options
): Promise<Account> {
  account = {
    ...account,
    address: normalizeAddress(account.address),
    prefixedAddress: normalizePrefixedAddress(account.prefixedAddress),
  }

  if (
    account.type == AccountType.SAFE &&
    typeof account.threshold != 'number'
  ) {
    account.threshold = await fetchThreshold(account, options)
  }

  return account
}

function normalizeConnection(connection: Connection): Connection {
  return {
    ...connection,
    from: normalizePrefixedAddress(connection.from),
  }
}

function normalizeAddress(address: Address): Address {
  validatePrefixedAddress(address)
  return address.toLowerCase() as Address
}

function normalizePrefixedAddress(address: PrefixedAddress): PrefixedAddress {
  validatePrefixedAddress(address)
  return address.toLowerCase() as PrefixedAddress
}

async function fetchThreshold(
  account: Account,
  options?: Options
): Promise<number> {
  const [chainId, safe] = splitPrefixedAddress(account.prefixedAddress)
  const provider = getEip1193Provider({ chainId: chainId as ChainId, options })

  return Number(
    await provider.request({
      method: 'eth_call',
      params: [
        {
          to: safe,
          data: encodeFunctionData({
            abi: parseAbi(['function getThreshold() view returns (uint256)']),
            functionName: 'getThreshold',
            args: [],
          }),
        },
        'latest',
      ],
    })
  )
}
