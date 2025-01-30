import { concat, encodeFunctionData, encodePacked, hexToBytes } from 'viem'
import { OperationType } from '@safe-global/types-kit'

import { Address, MetaTransactionRequest } from '../types'

export const encodeMultiSend = (
  transactions: readonly MetaTransactionRequest[],
  preferredAddresses: Address[] = []
): MetaTransactionRequest => {
  if (transactions.length === 0) {
    throw new Error('No transactions to encode')
  }

  if (transactions.length === 1) {
    return transactions[0]
  }

  return {
    to: multiSendAddress(transactions, preferredAddresses),
    value: 0n,
    data: encodeMultiSendData(transactions),
    operation: OperationType.DelegateCall,
  }
}

const MULTI_SEND_ABI = [
  {
    type: 'function',
    name: 'multiSend',
    constant: false,
    payable: false,
    inputs: [
      {
        type: 'bytes',
        name: 'transactions',
      },
    ],
    outputs: [],
  },
] as const

const encodeMultiSendData = (
  transactions: readonly MetaTransactionRequest[]
): `0x${string}` => {
  const packedTransactions = transactions.map((tx) =>
    encodePacked(
      ['uint8', 'address', 'uint256', 'uint256', 'bytes'],
      [
        tx.operation || OperationType.Call,
        tx.to as `0x${string}`,
        BigInt(tx.value),
        BigInt(hexToBytes(tx.data as `0x${string}`).length),
        tx.data as `0x${string}`,
      ]
    )
  )

  return encodeFunctionData({
    abi: MULTI_SEND_ABI,
    functionName: 'multiSend',
    args: [concat(packedTransactions)],
  })
}

const MULTI_SEND_141: Address = '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526'
const MULTI_SEND_CALLONLY_141: Address =
  '0x9641d764fc13c8b624c04430c7356c1c7c8102e2'

const KNOWN_MULTI_SEND_ADDRESSES: Address[] = [
  MULTI_SEND_141,
  '0xa238cbeb142c10ef7ad8442c6d1f9e89e07e7761', // MultiSend 1.3.0
  '0x998739bfdaadde7c933b942a68053933098f9eda', // MultiSend 1.3.0 alternative
  '0x8d29be29923b68abfdd21e541b9374737b49cdad', // MultiSend 1.1.1
]
const KNOWN_MULTI_SEND_CALL_ONLY_ADDRESSES: Address[] = [
  MULTI_SEND_CALLONLY_141,
  '0x40a2accbd92bca938b02010e17a5b8929b49130d', // MultiSendCallOnly 1.3.0
  '0xa1dabef33b3b82c7814b6d82a79e50f4ac44102b', // MultiSendCallOnly 1.3.0 alternative
]

const multiSendAddress = (
  transactions: readonly MetaTransactionRequest[],
  preferredAddresses: Address[] = []
): Address => {
  const callOnly = transactions.every(
    (tx) => tx.operation === OperationType.Call
  )

  const preferredAddress: Address | undefined =
    preferredAddresses.find((a) =>
      (callOnly
        ? KNOWN_MULTI_SEND_CALL_ONLY_ADDRESSES
        : KNOWN_MULTI_SEND_ADDRESSES
      ).includes(a)
    ) || preferredAddresses[0]

  if (
    !callOnly &&
    KNOWN_MULTI_SEND_CALL_ONLY_ADDRESSES.includes(preferredAddress)
  ) {
    throw new Error(
      `Cannot use MultiSendCallOnly for a batch with DelegateCall transactions`
    )
  }

  return (
    preferredAddress || (callOnly ? MULTI_SEND_CALLONLY_141 : MULTI_SEND_141)
  )
}
