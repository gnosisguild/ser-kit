import { decodeFunctionData, encodeFunctionData, Hex, parseAbi } from 'viem'
import { type MetaTransactionData } from '@safe-global/types-kit'

import { parsePrefixedAddress } from '../addresses'
import { ExecuteTransactionAction, SafeTransactionAction } from './types'

const safeAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  'function nonce() view returns (uint256)',
])

export function unwrapExecuteTransaction(
  action: ExecuteTransactionAction
): MetaTransactionData {
  const {
    args: [to, value, data, operation],
  } = decodeFunctionData({
    abi: safeAbi,
    data: action.transaction.data as any,
  })

  return { to: to!, value: String(value), data: data!, operation }
}

export const encodeSafeTransaction = (action: SafeTransactionAction) => {
  return {
    to: parsePrefixedAddress(action.safe),
    data: encodeFunctionData({
      abi: safeAbi,
      functionName: 'execTransaction',
      args: [
        action.safeTransaction.to,
        BigInt(action.safeTransaction.value),
        action.safeTransaction.data as Hex,
        action.safeTransaction.operation,
        BigInt(action.safeTransaction.safeTxGas),
        BigInt(action.safeTransaction.baseGas),
        BigInt(action.safeTransaction.gasPrice),
        action.safeTransaction.gasToken,
        action.safeTransaction.refundReceiver,
        action.signature || '0x',
      ],
    }),
  }
}
