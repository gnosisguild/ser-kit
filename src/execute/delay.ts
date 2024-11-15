import { encodeFunctionData, parseAbi } from 'viem'
import { MetaTransactionRequest } from '../types'
import { OperationType } from '@safe-global/types-kit'

const abi = parseAbi([
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  'function executeNextTx(address to, uint256 value, bytes data, uint8 operation)',
])

export const encodeExecTransactionFromModuleData = (
  transaction: MetaTransactionRequest
): `0x${string}` => {
  return encodeFunctionData({
    abi,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to,
      BigInt(transaction.value || 0),
      transaction.data,
      transaction.operation || OperationType.Call,
    ],
  })
}

export const encodeExecuteNextTxData = (
  transaction: MetaTransactionRequest
): `0x${string}` => {
  return encodeFunctionData({
    abi,
    functionName: 'executeNextTx',
    args: [
      transaction.to,
      transaction.value,
      transaction.data,
      transaction.operation || OperationType.Call,
    ],
  })
}
