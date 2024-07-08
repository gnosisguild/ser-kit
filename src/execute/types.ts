import type {
  EIP712TypedData,
  MetaTransactionData,
  SafeSignature,
  SafeTransactionData,
} from '@safe-global/safe-core-sdk-types'
import type { PrefixedAddress } from '../types'
import type { SafeTransactionOptionalProps } from '@safe-global/protocol-kit'

export enum ExecutionActionType {
  EXECUTE_TRANSACTION = 'EXECUTE_TRANSACTION',
  SIGN_MESSAGE = 'SIGN_MESSAGE',
  SIGN_TYPED_DATA = 'SIGN_TYPED_DATA',
  PROPOSE_SAFE_TRANSACTION = 'PROPOSE_SAFE_TRANSACTION',
}

/** Represents a transaction to be sent from the specified account */
export interface ExecuteTransactionAction {
  type: ExecutionActionType.EXECUTE_TRANSACTION
  transaction: MetaTransactionData
  from?: PrefixedAddress
}

/** Represents a signature to be produced for the given message by the specified account */
export interface SignMessageAction {
  type: ExecutionActionType.SIGN_MESSAGE
  message: string
  from?: PrefixedAddress
}

/** Represents a signature to be produced for the given typed data object by the specified account */
export interface SignTypedDataAction {
  type: ExecutionActionType.SIGN_TYPED_DATA
  data: EIP712TypedData
  from?: PrefixedAddress
}

/** Represents an action for the given Safe transaction to be proposed for execution to the Safe Transaction Service */
export interface ProposeSafeTransactionAction {
  type: ExecutionActionType.PROPOSE_SAFE_TRANSACTION
  safeTransaction: SafeTransactionData
  /** If set to null, the previous action's output will be inserted as signature */
  signature: SafeSignature | null
}

export type ExecutionAction =
  | ExecuteTransactionAction
  | SignMessageAction
  | SignTypedDataAction
  | ProposeSafeTransactionAction

/**
 * An execution plan describes the actions that need to happen to get a given transaction executed through a given route.
 * It's produced in the `planExecution` function.
 * Execution of the plan happens sequentially and the output of the output of each action is passed as input to the next.
 * (That way produced owner signatures can be included when relaying Safe transactions.)
 **/
export type ExecutionPlan = [ExecutionAction, ...ExecutionAction[]]

export interface SafeTransactionProperties
  extends SafeTransactionOptionalProps {
  /** If a Safe transaction is executable, only approve/propose the transaction, but don't execute it. Anyone will be able to trigger execution. */
  proposeOnly?: boolean
  /** In case the Safe signature can be submitted off-chain, still approve the signature on-chain */
  onchainSignature?: boolean
}
