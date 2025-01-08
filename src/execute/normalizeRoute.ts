import { Address, encodeFunctionData, getAddress, parseAbi } from 'viem'
import { type Eip1193Provider } from '@safe-global/protocol-kit'

import { validatePrefixedAddress } from '../addresses'

import {
  Account,
  AccountType,
  Connection,
  PrefixedAddress,
  Route,
  StartingPoint,
  Waypoint,
} from '../types'

export async function normalizeRoute(
  route: Route,
  provider: Eip1193Provider
): Promise<Route> {
  const waypoints = await Promise.all(
    route.waypoints.map((w) => normalizeWaypoint(w, provider))
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
  provider: Eip1193Provider
): Promise<StartingPoint | Waypoint> {
  waypoint = {
    ...waypoint,
    account: await normalizeAccount(waypoint.account, provider),
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
  provider: Eip1193Provider
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
    account.threshold = await fetchThreshold(account.address, provider)
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
  safe: Address,
  provider: Eip1193Provider
): Promise<number> {
  const abi = parseAbi(['function getThreshold() view returns (uint256)'])
  return Number(
    await provider.request({
      method: 'eth_call',
      params: [
        {
          to: getAddress(safe),
          data: encodeFunctionData({
            abi,
            functionName: 'getThreshold',
            args: [],
          }),
        },
        'latest',
      ],
    })
  )
}
