import { encodeFunctionData, Hex } from 'viem'
import { MetaTransactionRequest } from '../types'

const ROLES_V1_ABI = [
  {
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
      {
        name: 'operation',
        type: 'uint8',
      },
      {
        name: 'role',
        type: 'uint16',
      },
      {
        name: 'shouldRevert',
        type: 'bool',
      },
    ],
    name: 'execTransactionWithRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

const ROLES_V2_ABI = [
  {
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
      {
        name: 'operation',
        type: 'uint8',
      },
      {
        name: 'roleKey',
        type: 'bytes32',
      },
      {
        name: 'shouldRevert',
        type: 'bool',
      },
    ],
    name: 'execTransactionWithRole',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export default function encodeExecTransactionWithRole({
  transaction,
  role,
  version,
}: {
  transaction: MetaTransactionRequest
  role: any
  version: 1 | 2
}): Hex {
  return version === 1
    ? encodeFunctionData({
        abi: ROLES_V1_ABI,
        functionName: 'execTransactionWithRole',
        args: [
          transaction.to,
          BigInt(transaction.value),
          transaction.data,
          transaction.operation || 0,
          Number(BigInt(role)),
          true,
        ],
      })
    : encodeFunctionData({
        abi: ROLES_V2_ABI,
        functionName: 'execTransactionWithRole',
        args: [
          transaction.to,
          BigInt(transaction.value),
          transaction.data,
          transaction.operation || 0,
          role,
          true,
        ],
      })
}
