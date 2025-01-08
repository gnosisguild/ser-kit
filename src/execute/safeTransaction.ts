import {
  Address,
  encodeFunctionData,
  getAddress,
  parseAbi,
  zeroAddress,
} from 'viem'
import { OperationType } from '@safe-global/types-kit'

import { formatPrefixedAddress } from '../addresses'
import { getEip1193Provider, Options } from './options'

import {
  ChainId,
  MetaTransactionRequest,
  PrefixedAddress,
  SafeTransactionRequest,
} from '../types'

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

  const key1 = formatPrefixedAddress(chainId, safe)
  const key2 = key1.toLowerCase() as PrefixedAddress

  const defaults =
    options?.safeTransactionProperties?.[key1] ||
    options?.safeTransactionProperties?.[key2]

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
