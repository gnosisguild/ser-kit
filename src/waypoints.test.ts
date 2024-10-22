import { describe, it, expect } from 'bun:test'
import { Address, getAddress, toHex } from 'viem'

import { canSignOffChain } from './waypoints'
import { AccountType, ConnectionType, Route, Waypoint } from './types'
import { deploySafe } from '../test/avatar'

const makeAddress = (number: number): Address =>
  getAddress(toHex(number, { size: 20 }))

describe('waypoints', () => {
  describe('canSignOffChain', () => {
    it('returns true for waypoints solely via ownership', async () => {
      const waypoints = [
        {
          account: {
            type: AccountType.SAFE,
            prefixedAddress: 'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
            address: '0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
            chain: 42161,
            threshold: 3,
          },
        },
        {
          account: {
            type: AccountType.ROLES,
            prefixedAddress: 'arb1:0xd8c71be42ae496286b8b75929f9cec967ade7455',
            address: '0xd8c71be42ae496286b8b75929f9cec967ade7455',
            chain: 42161,
            version: 2,
            multisend: ['0xa238cbeb142c10ef7ad8442c6d1f9e89e07e7761'],
          },
          connection: {
            type: ConnectionType.IS_MEMBER,
            from: 'arb1:0x83e3ca8ddebbd81c3bcdc3aa9e3afcd2bfb7c360',
            roles: [
              '0x6172630000000000000000000000000000000000000000000000000000000000',
            ],
          },
        },
        {
          account: {
            type: AccountType.SAFE,
            prefixedAddress: 'arb1:0x0eb5b03c0303f2f47cd81d7be4275af8ed347576',
            address: '0x0eb5b03c0303f2f47cd81d7be4275af8ed347576',
            chain: 42161,
            threshold: 5,
          },
          connection: {
            type: ConnectionType.IS_ENABLED,
            from: 'arb1:0xd8c71be42ae496286b8b75929f9cec967ade7455',
          },
        },
      ] as Route['waypoints']

      expect(canSignOffChain(waypoints)).toEqual(false)
    })

    it('returns false for waypoints through a mod', async () => {
      const eoa = makeAddress(3)
      const safe = await deploySafe({
        owners: [eoa],
        threshold: 1,
        creationNonce: 0,
      })

      const waypoints = [
        {
          account: {
            type: AccountType.EOA,
            prefixedAddress: `eth:${eoa}`,
            address: eoa,
          },
        },
        {
          account: {
            type: AccountType.SAFE,
            prefixedAddress: `eth:${safe}`,
            address: safe,
            chain: 1,
            threshold: 1,
          },
          connection: {
            type: ConnectionType.OWNS,
            from: `eth:${eoa}`,
          },
        },
      ] as Route['waypoints']

      expect(canSignOffChain(waypoints)).toBe(true)
    })
  })
})
