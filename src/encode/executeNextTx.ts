import { encodeFunctionData, Hex, parseAbi } from 'viem'
import { OperationType } from '@safe-global/types-kit'

import { MetaTransactionRequest } from '../types'

const abi = parseAbi([
  'function executeNextTx(address to, uint256 value, bytes data, uint8 operation)',
])

export default function encodeExecuteNextTxData(
  transaction: MetaTransactionRequest
): Hex {
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
