import { Address, createPublicClient, http } from 'viem'

import { Eip1193Provider } from '@safe-global/protocol-kit'

import { chains, defaultRpc } from '../chains'
import { formatPrefixedAddress } from '../addresses'

import { ChainId, PrefixedAddress } from '../types'
import { SafeTransactionProperties } from './types'

export interface Options {
  providers?: {
    [chainId in ChainId]?: string | Eip1193Provider
  }
  safeTransactionProperties?: {
    [safe: PrefixedAddress]: SafeTransactionProperties
  }
}

export function getEip1193Provider({
  chainId,
  options,
}: {
  chainId: ChainId
  options?: Options
}): Eip1193Provider {
  const chain = chainId && chains.find((chain) => chain.chainId === chainId)
  if (!chain) {
    throw new Error(`Unsupported chainId: ${chainId}`)
  }

  const passedIn = Boolean(
    options && options.providers && options.providers[chainId]
  )

  let urlOrProvider
  if (passedIn) {
    urlOrProvider = options!.providers![chainId]!
  } else {
    urlOrProvider = defaultRpc[chainId]!
  }

  if (typeof urlOrProvider == 'string') {
    return createPublicClient({
      transport: http(urlOrProvider),
    }) as Eip1193Provider
  } else {
    return urlOrProvider
  }
}

export function nonceConfig({
  chainId,
  safe,
  options,
}: {
  chainId: ChainId
  safe: Address
  options?: Options
}): 'enqueue' | 'override' | number {
  const key1 = formatPrefixedAddress(chainId, safe)
  const key2 = key1.toLocaleLowerCase() as PrefixedAddress

  const properties =
    options &&
    options.safeTransactionProperties &&
    (options.safeTransactionProperties[key1] ||
      options.safeTransactionProperties[key2])

  if (typeof properties?.nonce == 'undefined') {
    return 'enqueue'
  }

  return properties.nonce
}
