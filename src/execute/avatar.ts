import { encodeFunctionData, Hash, Hex, parseAbi } from 'viem'
import { type MetaTransactionData } from '@safe-global/types-kit'

const avatarAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
])

export const encodeApproveHashData = (hashToApprove: Hash): Hex => {
  return encodeFunctionData({
    abi: avatarAbi,
    functionName: 'approveHash',
    args: [hashToApprove],
  })
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
      transaction.operation!,
    ],
  })
}
