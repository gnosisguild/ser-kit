import type { PrefixedAddress, Route } from '../types'

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
): Promise<Route[]> => {
  // in the future we might also include routes to other avatars, such as ERC6551 token-bound accounts
  return await fetchRoutes(`${SER_API_BASE}/safes/${initiator}`)
}

export const queryInitiators = async (
  avatar: PrefixedAddress
): Promise<Route[]> => {
  return await fetchRoutes(`${SER_API_BASE}/initiators/${avatar}`)
}
