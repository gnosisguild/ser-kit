import { invariant } from '@epic-web/invariant'
import {
  AccountType,
  Address,
  ChainId,
  ConnectionType,
  Delay,
  Eoa,
  PrefixedAddress,
  Roles,
  Route,
  Safe,
  StartingPoint,
  Waypoint,
} from '../types'
import { prefixAddress } from '../addresses'
import { normalizeWaypoint } from '../execute/normalizeRoute'
import { calculateRouteId } from '../query'

interface EoaInput {
  EOA: `0x${string}`
}

interface SafeInput {
  SAFE: string

  /** defaults to IS_ENABLED for modules, OWNS for Safes & EOAs */
  connection?: 'OWNS' | 'IS_ENABLED'
}

interface RolesInput {
  ROLES: `0x${string}`

  version: 1 | 2
  roles: string[]
  multisend: `0x${string}`[]
}

interface DelayInput {
  DELAY: `0x${string}`
}

type WaypointInput = SafeInput | RolesInput | DelayInput

export const buildRoute = async (
  chain: ChainId,
  waypoints: [EoaInput, ...WaypointInput[], SafeInput]
): Promise<Route> => {
  invariant(waypoints.length > 1, 'At least two waypoints are required')

  let previousPrefixedAddress: PrefixedAddress | undefined
  const finalWaypoints = (await Promise.all(
    waypoints.map((waypoint) => {
      if ('EOA' in waypoint) {
        const address = waypoint.EOA.toLowerCase() as Address
        const prefixedAddress = prefixAddress(undefined, address)

        const result = normalizeWaypoint({
          account: {
            type: AccountType.EOA,
            address,
            prefixedAddress,
          } as Eoa,
        })

        previousPrefixedAddress = prefixedAddress
        return result
      }

      invariant(
        previousPrefixedAddress != null,
        'Previous prefixed address is not set'
      )

      if ('SAFE' in waypoint) {
        const address = waypoint.SAFE.toLowerCase() as Address
        const prefixedAddress = prefixAddress(chain, address)
        const result = normalizeWaypoint({
          account: {
            type: AccountType.SAFE,
            prefixedAddress,
            address,
            chain,
          } as Safe,
          connection: {
            from: previousPrefixedAddress,
            type:
              waypoint.connection === 'OWNS'
                ? ConnectionType.OWNS
                : ConnectionType.IS_ENABLED,
          },
        })

        previousPrefixedAddress = prefixedAddress
        return result
      }

      if ('ROLES' in waypoint) {
        const address = waypoint.ROLES.toLowerCase() as Address
        const prefixedAddress = prefixAddress(chain, address)
        const result = normalizeWaypoint({
          account: {
            type: AccountType.ROLES,
            version: waypoint.version,
            address,
            prefixedAddress,
            chain,
            multisend: waypoint.multisend as Address[],
          } satisfies Roles,
          connection: {
            from: previousPrefixedAddress,
            type: ConnectionType.IS_MEMBER,
            roles: waypoint.roles,
          },
        })

        previousPrefixedAddress = prefixedAddress
        return result
      }

      if ('DELAY' in waypoint) {
        const address = waypoint.DELAY.toLowerCase() as Address
        const prefixedAddress = prefixAddress(chain, address)
        const result = normalizeWaypoint({
          account: {
            type: AccountType.DELAY,
            address,
            prefixedAddress,
            chain,
          } satisfies Delay,
          connection: {
            from: previousPrefixedAddress,
            type: ConnectionType.IS_ENABLED,
          },
        })

        previousPrefixedAddress = prefixedAddress
        return result
      }
    })
  )) as [StartingPoint, ...Waypoint[]]

  return {
    id: calculateRouteId(finalWaypoints),
    avatar: finalWaypoints[finalWaypoints.length - 1].account.prefixedAddress,
    initiator: finalWaypoints[0].account.prefixedAddress,
    waypoints: finalWaypoints,
  }
}
