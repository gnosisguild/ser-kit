import { encodeFunctionData, parseAbi } from 'viem'
import { type MetaTransactionData } from '@safe-global/types-kit'

const abi = parseAbi([
  'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  'function executeNextTx(address to, uint256 value, bytes data, uint8 operation)',
])

export const encodeExecTransactionFromModuleData = (
  transaction: MetaTransactionData
): `0x${string}` => {
  return encodeFunctionData({
    abi,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to as `0x${string}`,
      BigInt(transaction.value),
      transaction.data as `0x${string}`,
      transaction.operation || 0,
    ],
  })
}

export const encodeExecuteNextTxData = (
  transaction: MetaTransactionData
): `0x${string}` => {
  return encodeFunctionData({
    abi,
    functionName: 'executeNextTx',
    args: [
      transaction.to as `0x${string}`,
      BigInt(transaction.value),
      transaction.data as `0x${string}`,
      transaction.operation || 0,
    ],
  })
}
