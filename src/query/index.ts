import { unprefixAddress } from '../addresses'
import type { Address, PrefixedAddress, Route } from '../types'

export { calculateRouteId } from './routes'

const SER_API_BASE = 'https://ser.gnosisguild.org'

const fetchRoutes = async (url: string): Promise<Route[]> => {
  const res = await fetch(url)
  const json = await res.json()

  if (!res.ok) {
    const errorMessage = json?.error || res.statusText
    throw new Error(`Failed to fetch routes: ${errorMessage}`)
  }

  return json
}

export const queryRoutes = async (
  initiator: `0x${string}`,
  avatar: PrefixedAddress
): Promise<Route[]> => {
  return await fetchRoutes(`${SER_API_BASE}/routes/${initiator}/${avatar}`)
}

export const queryAvatars = async (
  initiator: `0x${string}`
): Promise<PrefixedAddress[]> => {
  // in the future we might also include routes to other avatars, such as ERC6551 token-bound accounts
  const routes = await fetchRoutes(`${SER_API_BASE}/safes/${initiator}`)

  return Array.from(new Set(routes.map((route) => route.avatar)))
}

export const queryInitiators = async (
  avatar: PrefixedAddress
): Promise<Address[]> => {
  const routes = await fetchRoutes(`${SER_API_BASE}/initiators/${avatar}`)

  return Array.from(
    new Set(routes.map((route) => unprefixAddress(route.initiator)))
  )
}
