import { describe, expect, it } from 'bun:test'
import { parsePrefixedAddress } from './addresses'
import { zeroAddress } from 'viem'

describe('parsePrefixedAddress', () => {
  it('returns the address part of a prefixed address', () => {
    expect(parsePrefixedAddress(`eth:${zeroAddress}`)).toEqual(zeroAddress)
  })

  it('is the identify function when the input is already an address', () => {
    expect(parsePrefixedAddress(zeroAddress)).toEqual(zeroAddress)
  })
})
