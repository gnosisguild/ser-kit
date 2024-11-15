import { Hex } from 'viem'
import { chains } from './chains'
import { OperationType } from '@safe-global/types-kit'

export interface TransactionRequest {
  to: Hex
  data: Hex
  value: bigint
}

export interface MetaTransactionRequest extends TransactionRequest {
  operation?: OperationType
}

export interface SafeTransactionRequest extends MetaTransactionRequest {
  operation: OperationType
  safeTxGas: bigint
  baseGas: bigint
  gasPrice: bigint
  gasToken: Hex
  refundReceiver: Hex
  nonce: number
}

export type ChainId = (typeof chains)[number]['chainId']
export type ChainShortName = (typeof chains)[number]['shortName']

export type PrefixedAddress =
  | `${ChainShortName}:0x${string}`
  | `eoa:0x${string}`

export enum AccountType {
  EOA = 'EOA',
  SAFE = 'SAFE',
  ROLES = 'ROLES',
  DELAY = 'DELAY',
}

export interface Eoa {
  type: AccountType.EOA
  address: `0x${string}`
  prefixedAddress: PrefixedAddress
}

export interface Safe {
  type: AccountType.SAFE
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chain: ChainId
  threshold: number
}

export interface Roles {
  type: AccountType.ROLES
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chain: ChainId
  multisend: `0x${string}`[]
  version: 1 | 2
}

export interface Delay {
  type: AccountType.DELAY
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chain: ChainId
}

type Contract = Safe | Roles | Delay

export type Account = Eoa | Contract

export enum ConnectionType {
  /** The source node is an owner of the destination safe */
  OWNS = 'OWNS',
  /** The source node is enabled as a module of the destination node */
  IS_ENABLED = 'IS_ENABLED',
  /** The source node is a role member of the destination Roles node */
  IS_MEMBER = 'IS_MEMBER',
}

interface OwnsConnection {
  type: ConnectionType.OWNS
  from: PrefixedAddress
}

interface IsEnabledConnection {
  type: ConnectionType.IS_ENABLED
  from: PrefixedAddress
}

interface IsMemberConnection {
  type: ConnectionType.IS_MEMBER
  roles: string[]
  defaultRole?: string
  from: PrefixedAddress
}

export type Connection =
  | OwnsConnection
  | IsEnabledConnection
  | IsMemberConnection

/** An execution route starts with the signing EOA or initiating smart contract account. */
export interface StartingPoint {
  /** The account that is used as the signer or initiator of the transaction */
  account: Account
}

/** An execution route flows along an arbitrary number of contract waypoints ending at the controlled avatar */
export interface Waypoint {
  /** A description of the contract account or module at this waypoint */
  account: Contract
  /** A description of how the previous waypoint is connected to this contract */
  connection: Connection
}

/** An execution route describes the flow a transaction can take from `from` (the initiating account) to `to` (the account being controlled) */
export interface Route {
  /** An id that uniquely identifies this route, calculated deterministically based on its waypoints */
  id: string
  /** Address prefixed with "eoa:" or a chain short name identifying the account initiating the transaction */
  initiator: PrefixedAddress
  /** Chain-prefixed address of the account being controlled */
  avatar: PrefixedAddress
  /** An execution route flows along an arbitrary number of contract waypoints, starting at the signing EOA or initiating smart account and ending at the controlled avatar */
  waypoints: [StartingPoint, ...Waypoint[]]
}
