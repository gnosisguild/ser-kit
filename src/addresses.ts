import { Address, getAddress, isAddress, zeroAddress } from 'viem'
import { chains } from './chains'

import type { ChainId, PrefixedAddress } from './types'

export function prefixAddress(
  chainId: ChainId | undefined,
  address: Address
): PrefixedAddress {
  const chain = chains.find((chain) => chain.chainId === chainId)

  if (chainId && !chain) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  if (!isAddress(address)) {
    throw new Error(`Not an Address: "${address}"`)
  }

  const prefix = chain ? chain.shortName : 'eoa'
  return `${prefix}:${getAddress(address).toLowerCase()}` as PrefixedAddress
}

export function unprefixAddress(
  prefixedAddress: PrefixedAddress | Address
): Address {
  const [, address] = splitPrefixedAddress(prefixedAddress)
  return address
}

export function splitPrefixedAddress(
  prefixedAddress: PrefixedAddress | Address
): [ChainId | undefined, Address] {
  // without prefix
  if (prefixedAddress.length == zeroAddress.length) {
    if (!isAddress(prefixedAddress)) {
      throw new Error(`Not an Address: ${prefixedAddress}`)
    }
    return [undefined, getAddress(prefixedAddress).toLowerCase() as Address]
  }

  if (prefixedAddress.indexOf(':') == -1) {
    throw new Error(`Unsupported PrefixedAddress format: ${prefixedAddress}`)
  }

  // with prefix
  const [prefix, address] = prefixedAddress.split(':')
  const chain = chains.find(({ shortName }) => shortName === prefix)
  if (prefix && prefix != 'eoa' && !chain) {
    throw new Error(`Unsupported chain shortName: ${prefix}`)
  }

  return [chain?.chainId, getAddress(address).toLowerCase() as Address] as const
}
