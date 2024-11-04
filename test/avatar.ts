import {
  Address,
  encodeFunctionData,
  getAddress,
  Hex,
  parseAbi,
  toHex,
  zeroAddress,
} from 'viem'

import type {
  Eip1193Provider,
  PredictedSafeProps,
} from '@safe-global/protocol-kit'
import Safe from '@safe-global/protocol-kit'
import {
  MetaTransactionData,
  OperationType,
  SafeVersion,
} from '@safe-global/types-kit'
import {
  getCompatibilityFallbackHandlerDeployment,
  getProxyFactoryDeployment,
  getSafeSingletonDeployment,
} from '@safe-global/safe-deployments'
import { deployer, testClient } from './client'
import { encodeExecTransaction } from '../src/execute/avatar'
import { formatPrefixedAddress } from '../src'
import { createPreApprovedSignature } from '../src/execute/signatures'

export async function deploySafe({
  owners,
  threshold,
  creationNonce,
  safeVersion,
}: {
  owners: Address[]
  threshold: number
  creationNonce: number | bigint
  safeVersion?: SafeVersion
}): Promise<Address> {
  const address = await calculateAddress({
    owners,
    threshold,
    creationNonce,
    safeVersion,
    provider: testClient as Eip1193Provider,
  })
  const creationTx = encodeCreation({ owners, threshold, creationNonce })

  await testClient.sendTransaction({
    account: deployer,
    ...creationTx,
  })

  return address
}

export async function enableModule({
  owner,
  safe,
  module,
}: {
  owner: any
  safe: string
  module: string
}) {
  await testClient.sendTransaction({
    account: owner,
    ...encodeExecTransaction(
      formatPrefixedAddress(testClient.chain.id, safe),
      {
        to: safe,
        data: encodeFunctionData({
          abi: safeAbi,
          functionName: 'enableModule',
          args: [module],
        }),
        value: '0',
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        refundReceiver: zeroAddress,
        gasToken: zeroAddress,
        operation: 0,
        nonce: 0,
      },
      createPreApprovedSignature(owner.address)
    ),
  })
}

function encodeCreation({
  owners,
  threshold = 1,
  creationNonce = 0,
  safeVersion = '1.3.0',
}: {
  owners: Address[]
  threshold?: bigint | number
  creationNonce?: bigint | number
  safeVersion?: SafeVersion
}) {
  const factory = getProxyFactoryDeployment({
    version: safeVersion,
  })?.defaultAddress! as Address
  const mastercopy = getSafeSingletonDeployment({
    version: safeVersion,
  })?.defaultAddress! as Address

  return {
    to: factory,
    /*
     * Safe Proxy Creation works by calling proxy factory, and including an
     * embedded setup call (the initializer)
     */
    data: encodeFunctionData({
      abi: safeProxyFactoryAbi,
      functionName: 'createProxyWithNonce',
      args: [
        mastercopy,
        encodeInitializer({
          owners,
          threshold: BigInt(threshold),
          safeVersion,
        }),
        BigInt(creationNonce),
      ],
    }),
  }
}

function encodeInitializer({
  owners,
  threshold,
  safeVersion,
}: {
  owners: Address[]
  threshold: bigint
  safeVersion: SafeVersion
}) {
  const fallbackHandler = getCompatibilityFallbackHandlerDeployment({
    version: safeVersion,
  })?.deployments.canonical?.address! as Address

  return encodeFunctionData({
    abi: safeAbi,
    functionName: 'setup',
    args: [
      // owners
      owners,
      // threshold
      threshold,
      // to - for setupModules
      zeroAddress,
      // data - for setupModules
      '0x',
      // fallbackHandler
      fallbackHandler,
      // paymentToken
      zeroAddress,
      // payment
      0n,
      // paymentReceiver
      zeroAddress,
    ],
  })
}

async function calculateAddress({
  owners,
  threshold,
  creationNonce,
  safeVersion = '1.3.0',
}: {
  owners: Address[]
  threshold: bigint | number
  creationNonce: bigint | number
  safeVersion?: SafeVersion
  provider: Eip1193Provider
}) {
  const predictedSafe: PredictedSafeProps = {
    safeAccountConfig: { owners, threshold: Number(threshold) },
    safeDeploymentConfig: {
      saltNonce: toHex(creationNonce),
      safeVersion,
    },
  }

  const safe = await Safe.init({
    predictedSafe,
    provider: testClient as Eip1193Provider,
  })

  return getAddress(await safe.getAddress())
}

export const safeAbi = parseAbi([
  'function enableModule(address module)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)',
])

const safeProxyFactoryAbi = parseAbi([
  'function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)',
])
