import { createWalletClient, custom, defineChain } from 'viem'
import {
  buildSignatureBytes,
  EthSafeSignature,
  type Eip1193Provider,
} from '@safe-global/protocol-kit'

import {
  ExecutionActionType,
  type ExecutionPlan,
  type ExecutionState,
} from './types'
import { parsePrefixedAddress } from '../addresses'
import type { ChainId, PrefixedAddress } from '../types'
import { chains, defaultRpc } from '../chains'
import { initProtocolKit } from './safe'
import EthSafeTransaction from '@safe-global/protocol-kit/dist/src/utils/transactions/SafeTransaction'
import SafeApiKit from '@safe-global/api-kit'

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
        const walletClient = getWalletClient({ account: from, provider })
        state.push(await walletClient.signMessage({ message }))
        break
      }
      case ExecutionActionType.SIGN_TYPED_DATA: {
        const { from, data } = action
        const walletClient = getWalletClient({ account: from, provider })
        state.push(await walletClient.signTypedData(data))
        break
      }
      case ExecutionActionType.PROPOSE_SAFE_TRANSACTION: {
        const { safe, safeTransaction, signature, from } = action
        const previousOutput = state[i - 1]

        const [chainId, safeAddress] = parsePrefixedAddress(safe)
        if (!chainId)
          throw new Error(
            `Invalid prefixed address for a Safe account: ${safe}`
          )

        const [ownerChainId, ownerAddress] = parsePrefixedAddress(from)
        const isContractSignature = ownerChainId !== undefined

        if (!signature || !previousOutput) {
          throw new Error(
            'Signature is required for proposing the Safe transaction'
          )
        }

        const ownerSignature =
          signature ||
          new EthSafeSignature(
            ownerAddress,
            previousOutput,
            isContractSignature
          )

        const protocolKit = await initProtocolKit(safe)
        const signedSafeTransaction = new EthSafeTransaction(safeTransaction)
        signedSafeTransaction.addSignature(ownerSignature)
        const safeTxHash = await protocolKit.getTransactionHash(
          signedSafeTransaction
        )

        const apiKit = new SafeApiKit({ chainId: BigInt(chainId) })
        await apiKit.proposeTransaction({
          safeAddress,
          safeTransactionData: signedSafeTransaction.data,
          safeTxHash,
          senderAddress: ownerAddress,
          senderSignature: buildSignatureBytes([ownerSignature]),
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
