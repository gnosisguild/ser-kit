import { describe, it, expect } from 'bun:test'
import { buildRoute } from './index'
import { AccountType, ConnectionType } from '../types'

describe('buildRoute', () => {
  it('builds a route with EOA -> ROLES -> SAFE', async () => {
    const route = await buildRoute(
      1, // mainnet chain id
      [
        {
          EOA: '0x8b0199d3686A46465FB4f1977b099ba51FeEd125',
        },
        {
          ROLES: '0x9b11d8298a710ef5bbb878466fca8e52a767209c',
          version: 2,
          roles: [
            '0x6d616e616765725f746573745f6d61696e6e6574000000000000000000000000',
          ],
          multisend: [
            '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
            '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
          ],
        },
        {
          SAFE: '0x14567d9f2918e0ead134a1e57ecb586d9d5796d5',
        },
      ]
    )

    expect(route).toEqual({
      id: '0x61496de3ea0699128fffce8c6767b9f3600bd7d538a6dcf34529c60419afb235',
      initiator: 'eoa:0x8b0199d3686a46465fb4f1977b099ba51feed125',
      avatar: 'eth:0x14567d9f2918e0ead134a1e57ecb586d9d5796d5',
      waypoints: [
        {
          account: {
            type: AccountType.EOA,
            address: '0x8b0199d3686a46465fb4f1977b099ba51feed125',
            prefixedAddress: 'eoa:0x8b0199d3686a46465fb4f1977b099ba51feed125',
          },
        },
        {
          account: {
            type: AccountType.ROLES,
            address: '0x9b11d8298a710ef5bbb878466fca8e52a767209c',
            chain: 1,
            multisend: [
              '0x9641d764fc13c8b624c04430c7356c1c7c8102e2',
              '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
            ],
            prefixedAddress: 'eth:0x9b11d8298a710ef5bbb878466fca8e52a767209c',
            version: 2,
          },
          connection: {
            type: ConnectionType.IS_MEMBER,
            roles: [
              '0x6d616e616765725f746573745f6d61696e6e6574000000000000000000000000',
            ],
            from: 'eoa:0x8b0199d3686a46465fb4f1977b099ba51feed125',
          },
        },
        {
          account: {
            type: AccountType.SAFE,
            address: '0x14567d9f2918e0ead134a1e57ecb586d9d5796d5',
            chain: 1,
            prefixedAddress: 'eth:0x14567d9f2918e0ead134a1e57ecb586d9d5796d5',
            threshold: 1,
          },
          connection: {
            type: ConnectionType.IS_ENABLED,
            from: 'eth:0x9b11d8298a710ef5bbb878466fca8e52a767209c',
          },
        },
      ],
    })
  })
})
