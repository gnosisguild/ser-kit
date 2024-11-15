import { decodeFunctionData, parseAbi } from 'viem'

import { MetaTransactionRequest } from '../types'
import { ExecuteTransactionAction } from './types'

const safeAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  'function nonce() view returns (uint256)',
])

export function unwrapExecuteTransaction(
  action: ExecuteTransactionAction
): MetaTransactionRequest {
  const {
    args: [to, value, data, operation],
  } = decodeFunctionData({
    abi: safeAbi,
    data: action.transaction.data as any,
  })

  return {
    to: to! as `0x${string}`,
    value: value!,
    data: data!,
    operation,
  }
}
