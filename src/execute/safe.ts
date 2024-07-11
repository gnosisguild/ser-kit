import Safe, { type Eip1193Provider } from '@safe-global/protocol-kit'
import {
  ConnectionType,
  type ChainId,
  type PrefixedAddress,
  type Route,
} from '../types'
import { defaultRpc } from '../chains'
import { parsePrefixedAddress } from '../addresses'

export type CustomProviders = {
  [chainId in ChainId]?: string | Eip1193Provider
}

export const initProtocolKit = async (
  safe: PrefixedAddress,
  providers: CustomProviders = {}
) => {
  const [chainId, safeAddress] = parsePrefixedAddress(safe)
  if (!chainId) throw new Error(`invalid prefixed address for a Safe: ${safe}`)

  return await Safe.init({
    provider: providers[chainId] || defaultRpc[chainId],
    safeAddress,
  })
}

/** Returns true if the giving (sub) route is executable with off-chain signatures */
export const canSignOffChain = (waypoints: Route['waypoints']) => {
  return waypoints.every(
    (waypoint) =>
      !('connection' in waypoint) ||
      waypoint.connection.type === ConnectionType.OWNS
  )
}
