import { encodeFunctionData, parseAbi, PrivateKeyAccount } from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'
import { deployProxy } from '@gnosis-guild/zodiac-core'

import { randomHash, testClient } from './client'
import { Address } from '../src'

export async function deployDelayMod({
  owner,
  target,
  avatar,
  cooldown,
  expiration = 0,
}: {
  owner: Address
  target?: Address
  avatar: Address
  cooldown: bigint | number
  expiration?: bigint | number
}): Promise<Address> {
  target = target || avatar
  const { address } = await deployProxy({
    // delay mastercopy
    mastercopy: '0xd54895B1121A2eE3f37b502F507631FA1331BED6',
    setupArgs: {
      types: ['address', 'address', 'address', 'uint256', 'uint256'],
      values: [owner, avatar, target, cooldown, expiration],
    },
    saltNonce: BigInt(randomHash()),
    provider: testClient as Eip1193Provider,
  })

  return address.toLowerCase() as Address
}

export async function enableModule({
  owner,
  module,
  moduleToEnable,
}: {
  owner: PrivateKeyAccount
  module: Address
  moduleToEnable: Address
}) {
  return testClient.sendTransaction({
    account: owner,
    to: module,
    data: encodeFunctionData({
      abi: delayAbi,
      functionName: 'enableModule',
      args: [moduleToEnable],
    }),
  })
}

const delayAbi = parseAbi(['function enableModule(address module)'])
