import { Address, getAddress } from 'viem'
import { chains } from './chains'
import type { ChainId, PrefixedAddress } from './types'

export const formatPrefixedAddress = (
  chainId: ChainId | undefined,
  address: Address
) => {
  const chain = chainId && chains.find((chain) => chain.chainId === chainId)

  if (!chain && chainId) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  const prefix = chain ? chain.shortName : 'eoa'
  return `${prefix}:${getAddress(address)}` as PrefixedAddress
}

export const splitPrefixedAddress = (prefixedAddress: PrefixedAddress) => {
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

export const parsePrefixedAddress = (
  prefixedAddress: PrefixedAddress | Address
) => {
  if (!prefixedAddress.includes(':')) {
    return getAddress(prefixedAddress) as `0x${string}`
  }

  const [, address] = prefixedAddress.split(':')
  return getAddress(address) as `0x${string}`
}
