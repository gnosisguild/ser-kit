import { createWalletClient, custom, defineChain, getAddress } from 'viem'
import {
  buildSignatureBytes,
  EthSafeSignature,
  SigningMethod,
  type Eip1193Provider,
} from '@safe-global/protocol-kit'
import EthSafeTransaction from '@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction'
import SafeApiKit from '@safe-global/api-kit'

import {
  ExecutionActionType,
  type ExecutionPlan,
  type ExecutionState,
} from './types'
import { parsePrefixedAddress } from '../addresses'
import type { ChainId, PrefixedAddress } from '../types'
import { chains, defaultRpc } from '../chains'
import { initProtocolKit } from './safe'
import { adjustVInSignature } from '@safe-global/protocol-kit/dist/src/utils'

/**
 * Executes the given plan, continuing from the given state. Mutates the state array to track execution progress.
 *
 * Throws if the execution of any action fails, for example due to the user rejecting a wallet request.
 * The mutated state array can then be used to resume execution from the last successful action.
 */
export const execute = async (
  plan: ExecutionPlan,
  state: ExecutionState = [],
  provider: Eip1193Provider
) => {
  for (let i = state.length; i < plan.length; i++) {
    const action = plan[i]

    switch (action.type) {
      case ExecutionActionType.EXECUTE_TRANSACTION: {
        const { from, chain } = action
        const walletClient = getWalletClient({ account: from, chain, provider })

        state.push(
          await walletClient.sendTransaction({
            to: action.transaction.to as `0x${string}`,
            value: BigInt(action.transaction.value),
            data: action.transaction.data as `0x${string}`,
          })
        )
        break
      }
      case ExecutionActionType.SIGN_MESSAGE: {
        const { from, message } = action
        const [, signerAddress] = parsePrefixedAddress(from)
        const walletClient = getWalletClient({ account: from, provider })
        const signature = await walletClient.signMessage({ message })
        state.push(
          adjustVInSignature(
            SigningMethod.ETH_SIGN,
            signature,
            message,
            signerAddress
          ) as `0x${string}`
        )
        break
      }
      case ExecutionActionType.SIGN_TYPED_DATA: {
        const { from, data } = action
        const walletClient = getWalletClient({ account: from, provider })
        const signature = await walletClient.signTypedData(data)
        state.push(
          adjustVInSignature(
            SigningMethod.ETH_SIGN_TYPED_DATA,
            signature
          ) as `0x${string}`
        )
        break
      }
      case ExecutionActionType.PROPOSE_SAFE_TRANSACTION: {
        const { safe, safeTransaction: safeTransactionData, from } = action
        const previousOutput = state[i - 1]

        const [chainId, safeAddress] = parsePrefixedAddress(safe)
        if (!chainId)
          throw new Error(
            `Invalid prefixed address for a Safe account: ${safe}`
          )

        const [ownerChainId, ownerAddress] = parsePrefixedAddress(from)
        const isContractSignature = ownerChainId !== undefined

        if (action.signature && previousOutput) {
          console.warn(
            '`PROPOSE_SAFE_TRANSACTION` action already has a signature, ignoring previous action output'
          )
        }
        let signature = action.signature || previousOutput
        if (!signature) {
          throw new Error(
            'Signature is required for proposing the Safe transaction'
          )
        }

        const protocolKit = await initProtocolKit(safe)
        const safeTransaction = new EthSafeTransaction(safeTransactionData)
        const safeTxHash = await protocolKit.getTransactionHash(safeTransaction)

        const safeSignature = new EthSafeSignature(
          ownerAddress,
          previousOutput,
          isContractSignature
        )
        safeTransaction.addSignature(safeSignature)

        const apiKit = new SafeApiKit({ chainId: BigInt(chainId) })
        await apiKit.proposeTransaction({
          safeAddress,
          safeTransactionData: {
            ...safeTransaction.data,
            // The Safe tx service requires checksummed addresses
            to: getAddress(safeTransaction.data.to),
            // The Safe tx service requires decimal values
            value: BigInt(safeTransaction.data.value).toString(10),
          },
          safeTxHash,
          senderAddress: ownerAddress,
          senderSignature: safeSignature.data,
        })

        state.push(safeTxHash as `0x${string}`)
        break
      }
    }
  }
}

const getWalletClient = ({
  account,
  chain,
  provider,
}: {
  account: PrefixedAddress
  provider: Eip1193Provider
  chain?: ChainId
}) => {
  const [chainId, address] = parsePrefixedAddress(account)
  if (chain && chainId && chainId !== chain) {
    throw new Error(`Chain mismatch: Needs account on ${chain}, got ${chainId}`)
  }

  return createWalletClient({
    account: address,
    transport: custom(provider),
    chain: chain
      ? defineChain({
          id: chain,
          name: chains.find((c) => c.chainId === chain)?.shortName || 'unknown',
          nativeCurrency: { name: '', symbol: '', decimals: 18 },
          rpcUrls: { default: { http: [defaultRpc[chain]] } },
        })
      : undefined,
  })
}
