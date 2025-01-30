import { encodeFunctionData, getAddress, parseAbi, PrivateKeyAccount } from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'
import { deployProxy } from '@gnosis-guild/zodiac-core'

import { randomHash, testClient } from './client'
import { Address } from '../src'

/*
 * Deploys and enables a roles mod on avatar, that is allowed to call and/or
 * send anything living in destination address
 */
export async function setupRolesMod({
  owner,
  avatar,
  target,
  member,
  destination,
}: {
  owner: PrivateKeyAccount
  avatar: Address
  target?: Address
  member: Address
  destination: Address
}) {
  const roleId = randomHash()
  const roles = await deployRolesMod({
    owner: getAddress(owner.address).toLowerCase() as Address,
    avatar: avatar,
    target: target || avatar,
  })

  await testClient.sendTransaction({
    account: owner,
    to: roles,
    data: encodeFunctionData({
      abi: rolesAbi,
      functionName: 'enableModule',
      args: [member],
    }),
  })

  await testClient.sendTransaction({
    account: owner,
    to: roles,
    data: encodeFunctionData({
      abi: rolesAbi,
      functionName: 'assignRoles',
      args: [member, [roleId], [true]],
    }),
  })

  await testClient.sendTransaction({
    account: owner,
    to: roles,
    data: encodeFunctionData({
      abi: rolesAbi,
      functionName: 'allowTarget',
      args: [roleId, destination, 3],
    }),
  })

  return { roles, roleId }
}

async function deployRolesMod({
  owner,
  target,
  avatar,
}: {
  owner: Address
  target: Address
  avatar: Address
}): Promise<Address> {
  const { address } = await deployProxy({
    // roles v2.1.0 mastercopy
    mastercopy: '0x9646fDAD06d3e24444381f44362a3B0eB343D337',
    setupArgs: {
      types: ['address', 'address', 'address'],
      values: [owner, avatar, target],
    },
    saltNonce: BigInt(randomHash()),
    provider: testClient as Eip1193Provider,
  })

  return address.toLowerCase() as Address
}

const rolesAbi = parseAbi([
  'function allowTarget(bytes32 roleKey, address targetAddress, uint8 options)',
  'function assignRoles(address module, bytes32[] roleKeys, bool[] memberOf)',
  'function enableModule(address module)',
  'function execTransactionWithRole(address to, uint256 value, bytes data, uint8 operation, bytes32 roleKey, bool shouldRevert) returns (bool success)',
])
