import { encodeFunctionData, getAddress, parseAbi } from 'viem'

import { prefixAddress, splitPrefixedAddress } from '../addresses'

import {
  Account,
  AccountType,
  Address,
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
  return {
    ...waypoint,
    account: await normalizeAccount(waypoint.account, options),
    ...('connection' in waypoint
      ? { connection: normalizeConnection(waypoint.connection as Connection) }
      : {}),
  }
}

async function normalizeAccount(
  account: Account,
  options?: Options
): Promise<Account> {
  account = {
    ...account,
    address: getAddress(account.address).toLowerCase() as Address,
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

function normalizePrefixedAddress(
  prefixedAddress: PrefixedAddress
): PrefixedAddress {
  const [chainId, address] = splitPrefixedAddress(prefixedAddress)
  return prefixAddress(chainId, address)
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
