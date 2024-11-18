import { encodeFunctionData, Hex, parseAbi } from 'viem'
import { OperationType } from '@safe-global/types-kit'
import { MetaTransactionRequest } from '../types'

export const abi = parseAbi([
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
])

export default function encodeExecTransactionFromModule(
  transaction: MetaTransactionRequest
): Hex {
  return encodeFunctionData({
    abi: abi,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to,
      BigInt(transaction.value),
      transaction.data,
      transaction.operation || OperationType.Call,
    ],
  })
}
