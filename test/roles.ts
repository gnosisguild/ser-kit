import {
  Address,
  encodeFunctionData,
  parseAbi,
  PrivateKeyAccount,
  zeroAddress,
} from 'viem'
import { Eip1193Provider } from '@safe-global/protocol-kit'
import {
  deployMastercopy,
  deployProxy,
  readMastercopies,
} from '@gnosis-guild/zodiac-core'

import { randomHash, testClient } from './client'
import { safeAbi } from './avatar'
import { createPreApprovedSignature } from '../src/execute/signatures'
import { OperationType } from '@safe-global/types-kit'

export async function deployRolesMastercopies() {
  const filePath = `${__dirname}/roles.mastercopies.json`
  for (const mastercopy of readMastercopies({
    mastercopyArtifactsFile: filePath,
  })) {
    const {
      contractName,
      contractVersion,
      factory,
      bytecode,
      constructorArgs,
      salt,
    } = mastercopy

    const { address, noop } = await deployMastercopy({
      factory,
      bytecode,
      constructorArgs,
      salt,
      provider: testClient as any,
      onStart: () => {
        console.log(
          `⏳ ${contractName}@${contractVersion}: Deployment starting...`
        )
      },
    })
    if (noop) {
      console.log(
        `🔄 ${contractName}@${contractVersion}: Already deployed at ${address}`
      )
    } else {
      console.log(
        `🚀 ${contractName}@${contractVersion}: Successfully deployed at ${address}`
      )
    }
  }
}

/*
 * Deploys and enables a roles mod on avatar, that is allowed to call and/or
 * send anything living in destination address
 */
export async function setupRolesMod({
  owner,
  avatar,
  member,
  destination,
}: {
  owner: PrivateKeyAccount
  avatar: Address
  member: Address
  destination: Address
}) {
  const roleId = randomHash()
  const roles = await deployRolesMod({
    owner: owner.address,
    target: avatar,
    avatar,
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

  const enableModuleData = encodeFunctionData({
    abi: safeAbi,
    functionName: 'enableModule',
    args: [roles],
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
      values: [owner, target, avatar],
    },
    saltNonce: BigInt(randomHash()),
    provider: testClient as Eip1193Provider,
  })

  return address
}

const rolesAbi = parseAbi([
  'function allowTarget(bytes32 roleKey, address targetAddress, uint8 options)',
  'function assignRoles(address module, bytes32[] roleKeys, bool[] memberOf)',
  'function enableModule(address module)',
  'function execTransactionWithRole(address to, uint256 value, bytes data, uint8 operation, bytes32 roleKey, bool shouldRevert) returns (bool success)',
])
