import assert from 'assert'
import {
  Address,
  Chain,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  hashTypedData,
  isAddress,
} from 'viem'
import { type Eip1193Provider } from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'

import { chains, defaultRpc } from '../chains'
import { typedDataForSafeTransaction } from '../eip712'

import encodeExecTransaction from '../encode/execTransaction'

import {
  ExecutionActionType,
  type ExecutionPlan,
  type ExecutionState,
} from './types'
import type { ChainId } from '../types'

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

        state.push(await walletClient.sendTransaction(action.transaction))
        break
      }
      case ExecutionActionType.SIGN_TYPED_DATA: {
        const { chain, from, typedData } = action
        const walletClient = getWalletClient({ chain, account: from, provider })
        const signature = await walletClient.signTypedData(typedData)
        state.push(signature as `0x${string}`)
        break
      }
      case ExecutionActionType.SAFE_TRANSACTION: {
        const [relayer] = (await provider.request({
          // message can be relayed by any account, request one
          method: 'eth_accounts',
        })) as string[]

        const walletClient = getWalletClient({
          chain: action.chain,
          account: relayer,
          provider,
        })

        const previousOutput = state[i - 1]

        const signature = action.signature || previousOutput
        if (!signature) {
          throw new Error(
            'Signature is required for running a Safe transaction'
          )
        }

        const transaction = {
          to: action.safe,
          data: encodeExecTransaction({
            safeTransaction: action.safeTransaction,
            signature,
          }),
          value: 0n,
        }

        state.push(await walletClient.sendTransaction(transaction))
        break
      }
      case ExecutionActionType.PROPOSE_TRANSACTION: {
        const [relayer] = (await provider.request({
          method: 'eth_accounts',
        })) as string[]

        assert(isAddress(relayer))

        const { chain, safe, safeTransaction, proposer } = action
        const previousOutput = state[i - 1]

        let signature = action.signature || previousOutput
        if (!signature) {
          throw new Error(
            'Signature is required for proposing the Safe transaction'
          )
        }

        const safeTxHash = hashTypedData(
          typedDataForSafeTransaction({
            chainId: chain,
            safeAddress: safe,
            safeTransaction,
          })
        )

        const apiKit = initApiKit(chain)
        await apiKit.proposeTransaction({
          safeAddress: getAddress(safe),
          safeTransactionData: {
            ...safeTransaction,
            // The Safe tx service requires checksummed addresses
            to: getAddress(safeTransaction.to) as `0x${string}`,
            // The Safe tx service requires decimal values
            value: safeTransaction.value.toString(10),
            safeTxGas: String(safeTransaction.safeTxGas),
            baseGas: String(safeTransaction.baseGas),
            gasPrice: String(safeTransaction.gasPrice),
          },
          safeTxHash,
          senderAddress: getAddress(proposer),
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

// TODO: remove this once https://github.com/safe-global/safe-core-sdk/issues/514 is closed
const initApiKit = (chainId: ChainId) => {
  // @ts-expect-error SafeApiKit is only available as a CJS module. That doesn't play super nice with us being ESM.
  if (SafeApiKit.default) {
    // @ts-expect-error See above
    return new SafeApiKit.default({ chainId: BigInt(chainId) })
  }

  return new SafeApiKit({ chainId: BigInt(chainId) })
}

const _getWalletClient = ({
  chain,
  account,
  provider,
}: {
  chain: ChainId
  account: Address
  provider: Eip1193Provider
}) => {
  return createWalletClient({
    account,
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
  account: Address
  provider: Eip1193Provider
  chain: ChainId
}) => ReturnType<typeof _getWalletClient>
