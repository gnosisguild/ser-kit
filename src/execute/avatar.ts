import {
  OperationType,
  type MetaTransactionData,
} from '@safe-global/safe-core-sdk-types'
import { decodeFunctionData, encodeFunctionData } from 'viem'

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

export const decodeExecTransactionFromModuleData = (
  data: string
): MetaTransactionData => {
  const { functionName, args } = decodeFunctionData({
    abi: AVATAR_ABI,
    data: data as `0x${string}`,
  })

  if (functionName !== 'execTransactionFromModule') {
    throw new Error('Unexpected function name: ' + functionName)
  }
  if (!args) {
    throw new Error('No arguments found')
  }

  return {
    to: args[0] as `0x${string}`,
    value: String(args[1]),
    data: args[2] as `0x${string}`,
    operation:
      BigInt(args[3] as any) === 1n
        ? OperationType.DelegateCall
        : OperationType.Call,
  }
}
