import { describe, it, expect } from 'bun:test'
import {
  Address,
  encodeFunctionData,
  getAddress,
  Hash,
  hashMessage,
  hashTypedData,
  Hex,
  parseAbi,
  toHex,
  zeroAddress,
} from 'viem'
import { OperationType } from '@safe-global/types-kit'

import { typedDataForSafeTransaction } from './eip712'

import { deploySafe } from '../test/avatar'
import { testClient } from '../test/client'

const makeAddress = (number: number): Address =>
  getAddress(toHex(number, { size: 20 }))

const safeAbi = parseAbi([
  'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
])

describe('eip712', () => {
  it('correctly produces and hashes SafeTrasactionTypedData', async () => {
    const safe = await deploySafe({
      owners: [makeAddress(3)],
      threshold: 1,
      creationNonce: BigInt(hashMessage(`eip712.spec.ts safe`)),
    })

    const safeTransaction = {
      to: makeAddress(9876),
      value: 0n,
      data: '0x' as Hex,
      operation: OperationType.Call,
      safeTxGas: 0n,
      baseGas: 0n,
      gasPrice: 0n,
      gasToken: zeroAddress,
      refundReceiver: zeroAddress,
      nonce: 123n,
    }

    const typedData = typedDataForSafeTransaction({
      chainId: testClient.chain.id,
      safe,
      safeTransaction,
    })

    const hashFromContract = await testClient.call({
      to: safe,
      data: encodeFunctionData({
        abi: safeAbi,
        functionName: 'getTransactionHash',
        args: [
          safeTransaction.to,
          safeTransaction.value,
          safeTransaction.data,
          safeTransaction.operation,
          safeTransaction.safeTxGas,
          safeTransaction.baseGas,
          safeTransaction.gasPrice,
          safeTransaction.gasToken,
          safeTransaction.refundReceiver,
          safeTransaction.nonce,
        ],
      }),
    })

    const hashCalculated = hashTypedData(typedData)

    expect(hashCalculated).toEqual(hashFromContract.data as Hash)
  })
})
