import { describe, expect, it } from 'bun:test'
import { parsePrefixedAddress, splitPrefixedAddress } from './addresses'
import { zeroAddress } from 'viem'
import { PrefixedAddress } from './types'

describe('splitPrefixedAddress', () => {
  it('correctly splits a prefixed address with a chain shortName', () => {
    expect(splitPrefixedAddress(`eth:${zeroAddress}`)).toEqual([1, zeroAddress])
  })

  it('correctly splits a prefixed address with eoa', () => {
    expect(splitPrefixedAddress(`eoa:${zeroAddress}`)).toEqual([
      undefined,
      zeroAddress,
    ])
  })

  it('throws error when prefix chain shortName is unknown', () => {
    expect(() =>
      splitPrefixedAddress(`abc:${zeroAddress}` as PrefixedAddress)
    ).toThrow()
  })

  it('correctly splits a simple address', () => {
    expect(splitPrefixedAddress(zeroAddress)).toEqual([undefined, zeroAddress])
  })
})

describe('parsePrefixedAddress', () => {
  it('returns the address part of a prefixed address', () => {
    expect(parsePrefixedAddress(`eth:${zeroAddress}`)).toEqual(zeroAddress)
  })

  it('is the identify function when the input is already an address', () => {
    expect(parsePrefixedAddress(zeroAddress)).toEqual(zeroAddress)
  })
})
