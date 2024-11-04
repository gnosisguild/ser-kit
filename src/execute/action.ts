import { decodeFunctionData, parseAbi } from 'viem'
import { type MetaTransactionData } from '@safe-global/types-kit'

import { ExecuteTransactionAction } from './types'

export function unwrapExecuteTransaction(
  action: ExecuteTransactionAction
): MetaTransactionData {
  const abi = parseAbi([
    'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
  ])

  const {
    args: [to, value, data, operation],
  } = decodeFunctionData({
    abi: abi,
    data: action.transaction.data as any,
  })

  return { to, value: String(value), data, operation }
}
