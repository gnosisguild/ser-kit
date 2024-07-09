import { type MetaTransactionData } from '@safe-global/safe-core-sdk-types'
import { encodeFunctionData } from 'viem'

const AVATAR_ABI = [
  {
    type: 'function',
    name: 'execTransactionFromModule',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'address',
        name: 'to',
      },
      {
        type: 'uint256',
        name: 'value',
      },
      {
        type: 'bytes',
        name: 'data',
      },
      {
        type: 'uint8',
        name: 'operation',
      },
    ],
    outputs: [],
  },
]

export const encodeExecTransactionFromModuleData = (
  transaction: MetaTransactionData
): `0x${string}` => {
  return encodeFunctionData({
    abi: AVATAR_ABI,
    functionName: 'execTransactionFromModule',
    args: [
      transaction.to,
      BigInt(transaction.value),
      transaction.data,
      transaction.operation,
    ],
  })
}
