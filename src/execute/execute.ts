import assert from 'assert'
import {
  Address,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  hashTypedData,
  isAddress,
} from 'viem'
import { type Eip1193Provider } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'

import {
  formatPrefixedAddress,
  parsePrefixedAddress,
  splitPrefixedAddress,
} from '../addresses'
import { chains, defaultRpc } from '../chains'
import { typedDataForSafeTransaction } from '../eip712'

import {
  ExecutionActionType,
  type ExecutionPlan,
  type ExecutionState,
} from './types'
import type { ChainId, PrefixedAddress } from '../types'
import { encodeSafeTransaction } from './action'

/**
 * Executes the given plan, continuing from the given state. Mutates the state array to track execution progress.
 *
 * Throws if the execution of any action fails, for example due to the user rejecting a wallet request.
 * The mutated state array can then be used to resume execution from the last successful action.
 */
export const execute = async (
  plan: ExecutionPlan,
  state: ExecutionState = [],
  provider: Eip1193Provider,
  {
    origin,
    getWalletClient = _getWalletClient,
  }: {
    origin?: string
    getWalletClient?: GetWalletClientFn
  } = {}
) => {
  for (let i = state.length; i < plan.length; i++) {
    const action = plan[i]

    switch (action.type) {
      case ExecutionActionType.EXECUTE_TRANSACTION: {
        const { from, chain } = action
        const walletClient = getWalletClient({
          chain,
          account: from,
          provider,
        })

        state.push(
          await walletClient.sendTransaction({
            to: action.transaction.to as `0x${string}`,
            value: BigInt(action.transaction.value),
            data: action.transaction.data as `0x${string}`,
          })
        )
        break
      }
      case ExecutionActionType.SIGN_TYPED_DATA: {
        const { from, data, chain } = action
        const walletClient = getWalletClient({ chain, account: from, provider })
        const signature = await walletClient.signTypedData(data)
        state.push(signature as `0x${string}`)
        break
      }
      case ExecutionActionType.SAFE_TRANSACTION: {
        const [relayer] = (await provider.request({
          // message can be relayed by any account, request one
          method: 'eth_accounts',
        })) as string[]
        const [chain] = splitPrefixedAddress(action.safe)
        const walletClient = getWalletClient({
          chain: chain!,
          account: formatPrefixedAddress(chain, relayer),
          provider,
        })

        const previousOutput = state[i - 1]

        let signature = action.signature || previousOutput
        if (!signature) {
          throw new Error(
            'Signature is required for running a Safe transaction'
          )
        }

        const transaction = await encodeSafeTransaction({
          ...action,
          signature,
        })

        state.push(await walletClient.sendTransaction(transaction))
        break
      }
      case ExecutionActionType.PROPOSE_TRANSACTION: {
        const [relayer] = (await provider.request({
          method: 'eth_accounts',
        })) as string[]

        assert(isAddress(relayer))

        const { safe, safeTransaction, proposer } = action
        const previousOutput = state[i - 1]

        const [chainId, safeAddress] = splitPrefixedAddress(safe)
        if (!chainId)
          throw new Error(
            `Invalid prefixed address for a Safe account: ${safe}`
          )

        let signature = action.signature || previousOutput
        if (!signature) {
          throw new Error(
            'Signature is required for proposing the Safe transaction'
          )
        }

        const safeTxHash = hashTypedData(
          typedDataForSafeTransaction({ chainId, safeAddress, safeTransaction })
        )

        const apiKit = new SafeApiKit({ chainId: BigInt(chainId) })
        await apiKit.proposeTransaction({
          safeAddress,
          safeTransactionData: {
            ...safeTransaction,
            // The Safe tx service requires checksummed addresses
            to: getAddress(safeTransaction.to),
            // The Safe tx service requires decimal values
            value: BigInt(safeTransaction.value).toString(10),
          },
          safeTxHash,
          senderAddress: parsePrefixedAddress(proposer),
          senderSignature: signature,
          origin,
        })

        state.push(safeTxHash as `0x${string}`)
        break
      }
      default: {
        throw new Error('Not yet implemented or required')
      }
    }
  }
}

const _getWalletClient = ({
  account,
  chain,
  provider,
}: {
  account: PrefixedAddress
  provider: Eip1193Provider
  chain: ChainId
}) => {
  const [_chain, address] = splitPrefixedAddress(account)
  assert(chain == _chain)

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

type GetWalletClientFn = (options: {
  account: PrefixedAddress
  provider: Eip1193Provider
  chain: ChainId
}) => ReturnType<typeof _getWalletClient>
