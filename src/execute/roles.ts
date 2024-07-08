import { AccountType, ConnectionType, type Route } from '../types'

const MODULE_ACCOUNT_TYPES = [AccountType.ROLES, AccountType.DELAY]

// validate that if another zodiac module is used as a role member, the Roles mod must have the respective role set as defaultRole for that module address

/**
 * If a zodiac module is used as a role member, the Roles mod must have the respective role set as defaultRole for that module address.
 * This function checks if this is the case and turns the IS_MEMBER connection into an IS_ENABLED connection so that the call will be passed through the IAvatar's standard execTransactionFromModule function.
 */
export const useDefaultRolesForModules = (waypoints: Route['waypoints']) =>
  waypoints.map((waypoint, index) => {
    const previousAccount = index > 0 ? waypoints[index - 1].account : null
    if (!previousAccount) return waypoint

    if (!MODULE_ACCOUNT_TYPES.includes(previousAccount.type)) return waypoint

    if (
      waypoint.account.type === AccountType.ROLES &&
      'connection' in waypoint &&
      waypoint.connection.type === ConnectionType.IS_MEMBER
    ) {
      const defaultRole = waypoint.account.defaultRole.get(
        previousAccount.address
      )

      if (!defaultRole) {
        throw new Error(
          `Roles module at waypoint #${index} does not have a default role set for module ${previousAccount.address}`
        )
      }

      return {
        ...waypoint,
        connection: { type: ConnectionType.IS_ENABLED },
      }
    }

    return waypoint
  }) as Route['waypoints']
