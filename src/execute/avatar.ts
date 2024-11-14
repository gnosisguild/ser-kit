import { encodeFunctionData, Hash, Hex, parseAbi } from 'viem'
import { OperationType } from '@safe-global/types-kit'
import { MetaTransactionRequest } from './types'

export const avatarAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
  'function approvedHashes(address, bytes32) view returns (uint256)',
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

export const encodeExecTransactionFromModuleData = (
  transaction: MetaTransactionRequest
): Hex => {
  return encodeFunctionData({
    abi: avatarAbi,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to,
      BigInt(transaction.value),
      transaction.data,
      transaction.operation || OperationType.Call,
    ],
  })
}
