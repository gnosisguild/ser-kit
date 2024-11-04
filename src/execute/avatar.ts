import {
  decodeFunctionData,
  encodeFunctionData,
  Hash,
  Hex,
  parseAbi,
} from 'viem'
import {
  OperationType,
  SafeTransactionData,
  type MetaTransactionData,
} from '@safe-global/types-kit'

import { parsePrefixedAddress } from '../addresses'
import { PrefixedAddress } from '../types'

export const avatarAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  'function nonce() view returns (uint256)',
])

export const encodeApproveHashData = (hashToApprove: Hash): Hex => {
  return encodeFunctionData({
    abi: avatarAbi,
    functionName: 'approveHash',
    args: [hashToApprove],
  })
}

export const encodeExecTransaction = (
  safe: PrefixedAddress,
  transaction: SafeTransactionData,
  signature: Hex
) => {
  return {
    to: parsePrefixedAddress(safe)[1],
    data: encodeFunctionData({
      abi: avatarAbi,
      functionName: 'execTransaction',
      args: [
        transaction.to,
        BigInt(transaction.value),
        transaction.data as Hex,
        transaction.operation,
        BigInt(transaction.safeTxGas),
        BigInt(transaction.baseGas),
        BigInt(transaction.gasPrice),
        transaction.gasToken,
        transaction.refundReceiver,
        signature,
      ],
    }),
  }
}

export const encodeExecTransactionFromModuleData = (
  transaction: MetaTransactionData
): Hex => {
  return encodeFunctionData({
    abi: avatarAbi,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to,
      BigInt(transaction.value),
      transaction.data as Hex,
      transaction.operation || OperationType.Call,
    ],
  })
}
