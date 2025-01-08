import { Address, getAddress, isAddress, zeroAddress } from 'viem'
import { chains } from './chains'
import type { ChainId, PrefixedAddress } from './types'

export const formatPrefixedAddress = (
  chainId: ChainId | undefined,
  address: Address
) => {
  const chain = chains.find((chain) => chain.chainId === chainId)

  if (chainId && !chain) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  const prefix = chain ? chain.shortName : 'eoa'
  return `${prefix}:${getAddress(address)}` as PrefixedAddress
}

export const splitPrefixedAddress = (
  prefixedAddress: PrefixedAddress | Address
): [ChainId | undefined, Address] => {
  validatePrefixedAddress(prefixedAddress)

  if (prefixedAddress.length == zeroAddress.length) {
    return [undefined, getAddress(prefixedAddress)]
  } else {
    const [prefix, address] = prefixedAddress.split(':')
    const chain = chains.find(({ shortName }) => shortName === prefix)

    return [chain?.chainId, getAddress(address)] as const
  }
}

export const parsePrefixedAddress = (
  prefixedAddress: PrefixedAddress | Address
): Address => {
  const [, address] = splitPrefixedAddress(prefixedAddress)
  return address
}

export const validatePrefixedAddress = (
  prefixedAddress: PrefixedAddress | Address
) => {
  if (prefixedAddress.length == zeroAddress.length) {
    if (!isAddress(prefixedAddress)) {
      throw new Error(`Not an Address: ${prefixedAddress}`)
    }
  } else {
    if (prefixedAddress.indexOf(':') == -1) {
      throw new Error(`Unsupported PrefixedAddress format: ${prefixedAddress}`)
    }

    const [prefix, address] = prefixedAddress.split(':')

    if (
      prefix &&
      prefix != 'eoa' &&
      chains.every((chain) => chain.shortName != prefix)
    ) {
      throw new Error(`Unsupported chain shortName: ${prefix}`)
    }

    if (!isAddress(address)) {
      throw new Error(`Not an Address: ${address}`)
    }
  }
}
