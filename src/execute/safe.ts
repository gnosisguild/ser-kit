import Safe, { type Eip1193Provider } from '@safe-global/protocol-kit'
import type { ChainId, PrefixedAddress } from '../types'
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
  return await Safe.init({
    provider: providers[chainId] || defaultRpc[chainId],
    safeAddress,
  })
}
