import { encodeFunctionData, Hex, parseAbi } from 'viem'
import { SafeTransactionRequest } from '../types'

const abi = parseAbi([
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
])

export default function encodeExecTransaction({
  safeTransaction,
  signature,
}: {
  safeTransaction: SafeTransactionRequest
  signature: Hex | null
}): Hex {
  return encodeFunctionData({
    abi,
    functionName: 'execTransaction',
    args: [
      safeTransaction.to,
      BigInt(safeTransaction.value),
      safeTransaction.data,
      safeTransaction.operation,
      BigInt(safeTransaction.safeTxGas),
      BigInt(safeTransaction.baseGas),
      BigInt(safeTransaction.gasPrice),
      safeTransaction.gasToken,
      safeTransaction.refundReceiver,
      signature || '0x',
    ],
  })
}
