import { getAddress } from 'viem'
import { chains } from './chains'
import type { PrefixedAddress } from './types'

export const parsePrefixedAddress = (prefixedAddress: PrefixedAddress) => {
  const [prefix, address] = prefixedAddress.split(':')
  const chain =
    prefix !== 'eoa'
      ? chains.find(({ shortName }) => shortName === prefix)
      : undefined
  if (!chain && prefix !== 'eoa') {
    throw new Error(`Unknown chain prefix: ${prefix}`)
  }
  const checksummedAddress = getAddress(address) as `0x${string}`
  return [chain?.chainId, checksummedAddress] as const
}
