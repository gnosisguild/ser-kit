import { invariant } from '@epic-web/invariant'
import { encodeFunctionData, getAddress, parseAbi, zeroAddress } from 'viem'
import SafeApiKit from '@safe-global/api-kit'
import { OperationType } from '@safe-global/types-kit'

import { prefixAddress } from '../addresses'
import { getEip1193Provider, nonceConfig, Options } from './options'

import {
  Address,
  ChainId,
  MetaTransactionRequest,
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
  const defaults =
    options?.safeTransactionProperties?.[prefixAddress(chainId, safe)]

  return {
    to: transaction.to,
    value: transaction.value,
    data: transaction.data,
    operation: transaction.operation ?? OperationType.Call,
    safeTxGas: BigInt(defaults?.safeTxGas || 0),
    baseGas: BigInt(defaults?.baseGas || 0),
    gasPrice: BigInt(defaults?.gasPrice || 0),
    gasToken: getAddress(defaults?.gasToken || zeroAddress) as Address,
    refundReceiver: getAddress(
      defaults?.refundReceiver || zeroAddress
    ).toLowerCase() as Address,
    nonce: await nonce({ chainId, safe, options }),
  }
}

async function nonce({
  chainId,
  safe,
  options,
}: {
  chainId: ChainId
  safe: Address
  options?: Options
}): Promise<number> {
  const config = nonceConfig({ chainId, safe, options })
  if (config == 'enqueue') {
    return fetchQueueNonce({ chainId, safe })
  }

  if (config == 'override') {
    return fetchOnChainNonce({ chainId, safe, options })
  }
  const nonce = config
  invariant(
    typeof nonce == 'number',
    `Expected nonce to have type "number" but got "${typeof nonce}"`
  )
  return nonce
}

async function fetchOnChainNonce({
  chainId,
  safe,
  options,
}: {
  chainId: ChainId
  safe: Address
  options?: Options
}): Promise<number> {
  const provider = getEip1193Provider({ chainId, options })
  const avatarAbi = parseAbi(['function nonce() view returns (uint256)'])

  const nonce = Number(
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

  return nonce
}

async function fetchQueueNonce({
  chainId,
  safe,
}: {
  chainId: ChainId
  safe: Address
}): Promise<number> {
  const apiKit = initApiKit(chainId)

  const nonce = await apiKit.getNextNonce(getAddress(safe))

  return nonce
}

// TODO: remove this once https://github.com/safe-global/safe-core-sdk/issues/514 is closed
const initApiKit = (chainId: ChainId): SafeApiKit => {
  // @ts-expect-error SafeApiKit is only available as a CJS module. That doesn't play super nice with us being ESM.
  if (SafeApiKit.default) {
    // @ts-expect-error See above
    return new SafeApiKit.default({ chainId: BigInt(chainId) })
  }

  return new SafeApiKit({ chainId: BigInt(chainId) })
}
