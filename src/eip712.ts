import { Hex, zeroAddress } from 'viem'
import { OperationType } from '@safe-global/types-kit'

import { Address } from './types'

export function typedDataForSafeTransaction({
  chainId,
  safeAddress,
  safeTransaction: { to, value, data, operation, nonce },
}: {
  chainId: number
  safeAddress: Address
  safeTransaction: {
    to: Address | string
    data: Hex | string
    value: string | number | bigint
    operation: OperationType
    nonce: string | number | bigint
  }
}) {
  const domain = { verifyingContract: safeAddress, chainId }
  const primaryType = 'SafeTx' as const
  const types = {
    SafeTx: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'uint256', name: 'nonce' },
    ],
  }
  const message = {
    to: to as Address,
    value: BigInt(value),
    data: data as Hex,
    operation,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: zeroAddress,
    refundReceiver: zeroAddress,
    nonce: BigInt(nonce),
  }

  return { domain, primaryType, types, message }
}
