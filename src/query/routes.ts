import { hexToBytes, sha256 } from 'viem'
import { ConnectionType, type Route, type Waypoint } from '../types'

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

/**
 * Collapses modifier waypoints. Modifiers pass the meta transaction through to the next node in the chain, so no extra wrapping/encoding is required for execution.
 * This function removes all IS_ENABLED waypoints following another IS_ENABLED/IS_MEMBER waypoint.
 *
 * Examples:
 * - `(EOA) -[IS ENABLED]-> (Delay Modifier) -[IS ENABLED]-> (Safe)` becomes `(EOA) -[IS ENABLED]-> (Delay Modifier)`
 * - `(EOA) -[IS MEMBER]-> (Roles Modifier) -[IS ENABLED]-> (Safe)` becomes `(EOA) -[IS MEMBER]-> (Roles Modifier)`
 * - `(EOA) -[IS ENABLED]-> (Delay Modifier) -[IS ENABLED]-> (Safe A) -[IS ENABLED]-> (Safe B)` becomes `(EOA) -[IS ENABLED]-> (Delay Modifier) -[IS ENABLED]-> (Safe B)`
 *
 */
export const collapseModifiers = (
  waypoints: Route['waypoints']
): Route['waypoints'] =>
  waypoints.filter((waypoint, index) => {
    const next = waypoints[index + 1] as Waypoint | undefined
    return (
      !('connection' in waypoint) ||
      waypoint.connection.type !== ConnectionType.IS_ENABLED ||
      next?.connection.type !== ConnectionType.IS_ENABLED
    )
  }) as Route['waypoints']
