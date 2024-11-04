import type { TypedDataDomain } from 'viem'
import type {
  MetaTransactionData,
  SafeTransactionData,
} from '@safe-global/types-kit'
import type { SafeTransactionOptionalProps } from '@safe-global/protocol-kit'

import type { ChainId, PrefixedAddress } from '../types'

export enum ExecutionActionType {
  EXECUTE_TRANSACTION = 'EXECUTE_TRANSACTION',
  SAFE_TRANSACTION = 'SAFE_TRANSACTION',
  PROPOSE_TRANSACTION = 'PROPOSE_TRANSACTION',
  SIGN_MESSAGE = 'SIGN_MESSAGE',
  SIGN_TYPED_DATA = 'SIGN_TYPED_DATA',
}

/** Represents a transaction to be sent from the specified account */
export interface ExecuteTransactionAction {
  type: ExecutionActionType.EXECUTE_TRANSACTION
  transaction: MetaTransactionData
  from: PrefixedAddress
  chain: ChainId
}

/** Represents a signature to be produced for the given message by the specified account */
export interface SignMessageAction {
  type: ExecutionActionType.SIGN_MESSAGE
  message: string
  from: PrefixedAddress
}

interface TypedDataField {
  name: string
  type: string
}

export interface EIP712TypedData {
  domain: TypedDataDomain
  types: Record<string, TypedDataField[]>
  message: Record<string, unknown>
  primaryType: string
}

/** Represents a signature to be produced for the given typed data object by the specified account */
export interface SignTypedDataAction {
  type: ExecutionActionType.SIGN_TYPED_DATA
  data: EIP712TypedData
  from: PrefixedAddress
}

/** Represents an action for the given Safe transaction to be proposed for execution to the Safe Transaction Service */
export interface ProposeTransactionAction {
  type: ExecutionActionType.PROPOSE_TRANSACTION
  safe: PrefixedAddress
  safeTransaction: SafeTransactionData
  /** If set to null, the previous action's output will be inserted as signature */
  signature: `0x${string}` | null
}

export interface SafeTransactionAction {
  type: ExecutionActionType.SAFE_TRANSACTION
  safe: PrefixedAddress
  safeTransaction: SafeTransactionData

  /** If set to null, the previous action's output will be inserted as signature */
  signature: `0x${string}` | null
}

export type ExecutionAction =
  | ExecuteTransactionAction
  | SafeTransactionAction
  | ProposeTransactionAction
  | SignMessageAction
  | SignTypedDataAction

/**
 * An execution plan describes the actions that need to happen to get a given transaction executed through a given route.
 * It's produced in the `planExecution` function.
 * Execution of the plan happens sequentially and the output of the output of each action is passed as input to the next.
 * (That way produced owner signatures can be included when relaying Safe transactions.)
 **/
export type ExecutionPlan = [ExecutionAction, ...ExecutionAction[]]

/**
 * An execution state is a list of transaction hashes, signatures, or Safe transaction hashes that have been produced as part
 * of executing an execution plan. It's used to track the progress of the execution plan.
 * The state entry indexes are correlated to the respective action indexes in the execution plan.
 * An incomplete execution is represented through a state with fewer entries than the plan.
 */
export type ExecutionState = `0x${string}`[]

export interface SafeTransactionProperties
  extends SafeTransactionOptionalProps {
  /**
   * If a Safe transaction is executable, only approve/propose the transaction,
   * but don't execute it. Anyone will be able to trigger execution.
   **/
  proposeOnly?: boolean
  /**
   * In case the Safe signature can be submitted off-chain, still approve it
   * on-chain
   **/
  onchainSignature?: boolean
}
