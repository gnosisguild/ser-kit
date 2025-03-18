import { describe, it, expect, mock } from 'bun:test'

import { checkPermissions, determineRole } from './permissions'
import { MetaTransactionRequest, Route } from '../types'
import { PermissionViolation } from './permissions'
import { RpcRequestError, stringToHex } from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'

describe('determineRole', () => {
  it('returns null if no role allows the transaction', async () => {
    const forbidden: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockRejectedValue(
        new RpcRequestError({
          error: {
            code: 3,
            message: 'execution reverted',
            data: '0xd0a9bf5800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000',
          },
          url: 'mock-provider',
          body: [],
        })
      ),
    } as Eip1193Provider

    const result = await determineRole({
      rolesMod: 'eth:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      member: 'eoa:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      roles: [
        '0x4d414e4147455200000000000000000000000000000000000000000000000000',
      ],
      transaction: forbidden,
      version: 2,
      options: {
        providers: {
          1: mockProvider,
        },
      },
    })

    expect(result).toBeNull()
  })

  it('returns the role if the transaction reverts for some other reason', async () => {
    const tx: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockRejectedValue(
        new RpcRequestError({
          error: {
            code: -32015,
            data: undefined, // no revert reason
            message: 'RPC Request failed.',
          },
          url: 'mock-provider',
          body: [],
        })
      ),
    } as Eip1193Provider

    const result = await determineRole({
      rolesMod: 'eth:0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      member: 'eoa:0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      roles: [
        '0x4d414e4147455200000000000000000000000000000000000000000000000000',
      ],
      transaction: tx,
      version: 2,
      options: {
        providers: {
          1: mockProvider,
        },
      },
    })

    expect(result).toBe(
      '0x4d414e4147455200000000000000000000000000000000000000000000000000'
    )
  })
})

describe('checkPermissions', () => {
  // Gnosis DAO active treasury management route
  const route = {
    avatar: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
    id: 'IbqUCaGG-O33296Vu5k1d',
    initiator: 'eoa:0xd68f1a882f3f9ffddabd4d30c4f8dfca1f9e51ba',
    label: 'Gnosis DAO',
    lastUsed: 1741251401102,
    waypoints: [
      {
        account: {
          address: '0xd68f1a882f3f9ffddabd4d30c4f8dfca1f9e51ba',
          prefixedAddress: 'eoa:0xd68f1a882f3f9ffddabd4d30c4f8dfca1f9e51ba',
          type: 'EOA',
        },
      },
      {
        account: {
          address: '0xf099e0f6604bde0aa860b39f7da75770b34ac804',
          chain: 1,
          prefixedAddress: 'eth:0xf099e0f6604bde0aa860b39f7da75770b34ac804',
          threshold: 2,
          type: 'SAFE',
        },
        connection: {
          from: 'eoa:0xd68f1a882f3f9ffddabd4d30c4f8dfca1f9e51ba',
          type: 'OWNS',
        },
      },
      {
        account: {
          address: '0x27d8bb2e33bc38a9ce93fdd90c80677b8436affb',
          chain: 1,
          multisend: [
            '0x9641d764fc13c8b624c04430c7356c1c7c8102e2',
            '0x38869bf66a61cf6bdb996a6ae40d5853fd43b526',
          ],
          prefixedAddress: 'eth:0x27d8bb2e33bc38a9ce93fdd90c80677b8436affb',
          type: 'ROLES',
          version: 2,
        },
        connection: {
          from: 'eth:0xf099e0f6604bde0aa860b39f7da75770b34ac804',
          roles: [
            '0x4d414e4147455200000000000000000000000000000000000000000000000000',
          ],
          type: 'IS_MEMBER',
        },
      },
      {
        account: {
          address: '0x849d52316331967b6ff1198e5e32a0eb168d039d',
          chain: 1,
          prefixedAddress: 'eth:0x849d52316331967b6ff1198e5e32a0eb168d039d',
          threshold: 3,
          type: 'SAFE',
        },
        connection: {
          from: 'eth:0x27d8bb2e33bc38a9ce93fdd90c80677b8436affb',
          type: 'IS_ENABLED',
        },
      },
    ],
  } as Route

  it('checks permissions for a route with a roles mod', async () => {
    const forbidden: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockRejectedValue(
        new RpcRequestError({
          error: {
            code: 3,
            message: 'execution reverted',
            data: '0xd0a9bf5800000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000',
          },
          url: 'mock-provider',
          body: [],
        })
      ),
    } as Eip1193Provider

    const result = await checkPermissions([forbidden], route, {
      providers: {
        1: mockProvider,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe(PermissionViolation.TargetAddressNotAllowed)
  })

  it('should return success when eth_estimateGas succeeds', async () => {
    const forbidden: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockResolvedValue('0x123123'),
    } as Eip1193Provider

    const result = await checkPermissions([forbidden], route, {
      providers: {
        1: mockProvider,
      },
    })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('returns success if the route has no roles mod', async () => {
    const tx: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const directExecRoute = {
      avatar: 'gno:0x8bbd876d534e6e00e61414f00576627e4466bbde',
      id: 'x36WkNT6d5ugupgXAHvTz',
      initiator: 'eoa:0x325b8ab1bd08fba28332796e6e4e979fc3776ba9',
      waypoints: [
        {
          account: {
            address: '0x325b8ab1bd08fba28332796e6e4e979fc3776ba9',
            prefixedAddress: 'eoa:0x325b8ab1bd08fba28332796e6e4e979fc3776ba9',
            type: 'EOA',
          },
        },
        {
          account: {
            address: '0x8bbd876d534e6e00e61414f00576627e4466bbde',
            chain: 100,
            prefixedAddress: 'gno:0x8bbd876d534e6e00e61414f00576627e4466bbde',
            threshold: 1,
            type: 'SAFE',
          },
          connection: {
            from: 'eoa:0x325b8ab1bd08fba28332796e6e4e979fc3776ba9',
            type: 'OWNS',
          },
        },
      ],
    } as Route

    const result = await checkPermissions([tx], directExecRoute)

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('return true if the transaction reverts for some other reason', async () => {
    const tx: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockRejectedValue(
        new RpcRequestError({
          error: {
            code: -32015,
            data: undefined, // no revert reason
            message: 'RPC Request failed.',
          },
          url: 'mock-provider',
          body: [],
        })
      ),
    } as Eip1193Provider

    const result = await checkPermissions([tx], route, {
      providers: {
        1: mockProvider,
      },
    })

    expect(result.success).toBe(true)
  })

  it('returns success if the module transaction transaction reverts', async () => {
    const allowed: MetaTransactionRequest = {
      to: '0x1234567812345678123456781234567812345678',
      data: '0x12345678',
      value: BigInt(0),
    }

    const mockProvider = {
      request: mock().mockRejectedValue(
        new RpcRequestError({
          error: {
            code: 3,
            message: 'execution reverted',
            data: '0xd27b44a900000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000',
          },
          url: 'mock-provider',
          body: [],
        })
      ),
    } as Eip1193Provider

    const result = await checkPermissions([allowed], route, {
      providers: {
        1: mockProvider,
      },
    })

    expect(result.success).toBe(true)
  })
})
