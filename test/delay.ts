import {
  Address,
  encodeFunctionData,
  parseAbi,
  PrivateKeyAccount,
  zeroAddress,
} from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'
import { deployProxy } from '@gnosis-guild/zodiac-core'

import { safeAbi } from './avatar'
import { randomHash, testClient } from './client'
import { createPreApprovedSignature } from '../src/execute/signatures'

export async function setupDelayMod({
  owner,
  avatar,
  module,
  cooldown,
}: {
  owner: PrivateKeyAccount
  avatar: Address
  module: Address
  cooldown: bigint | number
}) {
  const delay = await deployDelayMod({
    owner: owner.address,
    target: avatar,
    avatar,
    cooldown,
    expiration: 0,
  })

  await testClient.sendTransaction({
    account: owner,
    to: delay,
    data: encodeFunctionData({
      abi: delayAbi,
      functionName: 'enableModule',
      args: [module],
    }),
  })

  const enableModuleData = encodeFunctionData({
    abi: delayAbi,
    functionName: 'enableModule',
    args: [delay],
  })

  await testClient.sendTransaction({
    account: owner,
    to: avatar,
    data: encodeFunctionData({
      abi: safeAbi,
      functionName: 'execTransaction',
      args: [
        avatar,
        0n,
        enableModuleData,
        0,
        0n,
        0n,
        0n,
        zeroAddress,
        zeroAddress,
        createPreApprovedSignature(owner.address),
      ],
    }),
  })

  return delay
}

async function deployDelayMod({
  owner,
  target,
  avatar,
  cooldown,
  expiration,
}: {
  owner: Address
  target: Address
  avatar: Address
  cooldown: bigint | number
  expiration: bigint | number
}): Promise<Address> {
  const { address } = await deployProxy({
    // delay mastercopy
    mastercopy: '0xd54895B1121A2eE3f37b502F507631FA1331BED6',
    setupArgs: {
      types: ['address', 'address', 'address', 'uint256', 'uint256'],
      values: [owner, target, avatar, cooldown, expiration],
    },
    saltNonce: BigInt(randomHash()),
    provider: testClient as Eip1193Provider,
  })

  return address
}

const delayAbi = parseAbi(['function enableModule(address module)'])
