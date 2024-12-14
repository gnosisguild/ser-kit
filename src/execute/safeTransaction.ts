import {
  Address,
  createPublicClient,
  encodeFunctionData,
  getAddress,
  http,
  parseAbi,
  zeroAddress,
} from 'viem'
import { OperationType } from '@safe-global/types-kit'
import { Eip1193Provider } from '@safe-global/protocol-kit'

import { formatPrefixedAddress } from '../addresses'

import { chains, defaultRpc } from '../chains'

import {
  ChainId,
  MetaTransactionRequest,
  PrefixedAddress,
  SafeTransactionRequest,
} from '../types'
import { SafeTransactionProperties } from './types'

interface Options {
  providers?: {
    [chainId in ChainId]?: string | Eip1193Provider
  }
  safeTransactionProperties?: {
    [safe: PrefixedAddress]: SafeTransactionProperties
  }
}

export async function prepareSafeTransaction({
  chainId,
  safe,
  transaction,
  options,
}: {
  chainId: ChainId
  safe: Address
  transaction: MetaTransactionRequest
  options?: Options
}): Promise<SafeTransactionRequest> {
  const provider = getEip1193Provider({ chainId, options })
  const defaults =
    options?.safeTransactionProperties?.[formatPrefixedAddress(chainId, safe)]

  const avatarAbi = parseAbi(['function nonce() view returns (uint256)'])

  const nonce = BigInt(
    (await provider.request({
      method: 'eth_call',
      params: [
        {
          to: safe,
          data: encodeFunctionData({
            abi: avatarAbi,
            functionName: 'nonce',
            args: [],
          }),
        },
        'latest',
      ],
    })) as string
  )

  return {
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
    operation: transaction.operation ?? OperationType.Call,
    safeTxGas: BigInt(defaults?.safeTxGas || 0),
    baseGas: BigInt(defaults?.baseGas || 0),
    gasPrice: BigInt(defaults?.gasPrice || 0),
    gasToken: getAddress(defaults?.gasToken || zeroAddress) as `0x${string}`,
    refundReceiver: getAddress(
      defaults?.refundReceiver || zeroAddress
    ) as `0x${string}`,
    nonce: Number(defaults?.nonce || nonce),
  }
}

function getEip1193Provider({
  chainId,
  options,
}: {
  chainId: ChainId
  options?: Options
}): Eip1193Provider {
  const chain = chainId && chains.find((chain) => chain.chainId === chainId)
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
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
