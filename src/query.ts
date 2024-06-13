import type { PrefixedAddress, Route } from './types'

const SER_API_BASE = 'https://ser.gnosisguild.org/api/v1'

export const queryRoutes = async (
  start: `0x${string}`,
  end: PrefixedAddress
): Promise<Route[]> => {
  const res = await fetch(`${SER_API_BASE}/routes/${start}/${end}`)
  const json = await res.json()

  if (!res.ok) {
    const errorMessage = json?.error || res.statusText
    throw new Error(`Failed to query routes: ${errorMessage}`)
  }

  return json
}
