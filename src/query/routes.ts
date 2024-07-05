import { hexToBytes, sha256 } from 'viem'
import { ConnectionType, type Route } from '../types'

const CONNECTION_TYPE_IDS = [
  ConnectionType.OWNS,
  ConnectionType.IS_ENABLED,
  ConnectionType.IS_MEMBER,
]

const connectionTypeId = (type: ConnectionType): number => {
  const index = CONNECTION_TYPE_IDS.indexOf(type)
  if (index === -1) {
    throw new Error(`Unexpected connection type: ${type}`)
  }
  return index
}

/** A route is defined by its waypoints. A unique ID for it is derived by hashing a bytes representation of all waypoints. */
export const calculateRouteId = (waypoints: Route['waypoints']): string => {
  const byteArray = waypoints.flatMap((waypoint) => [
    ...('connection' in waypoint
      ? [connectionTypeId(waypoint.connection.type)]
      : []),

    'chain' in waypoint.account ? waypoint.account.chain : 0,
    ...Array.from(hexToBytes(waypoint.account.address)),
  ])
  return sha256(new Uint8Array(byteArray), 'hex')
}
