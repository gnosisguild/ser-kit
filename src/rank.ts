import { AccountType, ConnectionType, type Route } from './types'

const countExtraSignaturesRequired = (route: Route): number =>
  route.waypoints.reduce<number>((result, waypoint) => {
    if (
      waypoint.account.type === AccountType.SAFE &&
      'connection' in waypoint &&
      waypoint.connection.type === ConnectionType.OWNS
    ) {
      return result + waypoint.account.threshold - 1
    }
    return result
  }, 0)

/**
 * Orders the given routes so that the first route is the most "frictionless" execution path.
 * The following criteria are used to determine the order:
 * - Fewest extra signatures required
 * - Shortest path length
 */
export const rankRoutes = (routes: Route[]): Route[] => {
  return routes.sort((a, b) => {
    const aExtraSignatures = countExtraSignaturesRequired(a)
    const bExtraSignatures = countExtraSignaturesRequired(b)
    if (aExtraSignatures !== bExtraSignatures) {
      return aExtraSignatures - bExtraSignatures
    }
    return a.waypoints.length - b.waypoints.length
  })
}
