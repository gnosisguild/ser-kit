import { createPublicClient, http } from 'viem'

import { Eip1193Provider } from '@safe-global/protocol-kit'

import { chains, defaultRpc } from '../chains'

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
