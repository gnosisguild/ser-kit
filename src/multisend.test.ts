import { expect, describe, it } from 'bun:test'
import { OperationType } from './types'
import { encodeMultiSend } from './multisend'

describe('multisend', () => {
  describe('encodeMultiSend', () => {
    it('should correctly encode a multisend batch', () => {
      const txs = [
        {
          to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          data: '0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000de0b6b3a7640000',
          value: 0n,
        },
        {
          to: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
          data: '0xa9059cbb0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc0000000000000000000000000000000000000000000000001bc16d674ec80000',
          value: 0n,
        },
      ] as const

      expect(encodeMultiSend(txs)).toEqual({
        to: '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
        data: '0x8d80ff0a00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000132009fe46736679d2d9a65f0992f2272de9f3c7fa6e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000de0b6b3a7640000009fe46736679d2d9a65f0992f2272de9f3c7fa6e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc0000000000000000000000000000000000000000000000001bc16d674ec800000000000000000000000000000000',
        value: 0n,
        operation: OperationType.DelegateCall,
      })
    })
  })
})