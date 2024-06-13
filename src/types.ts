import { chains } from './chains'

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

interface Eoa {
  type: AccountType.EOA
  address: `0x${string}`
  prefixedAddress: PrefixedAddress
}

interface Safe {
  type: AccountType.SAFE
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chainId: ChainId
  threshold: number
}

interface Roles {
  type: AccountType.ROLES
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chainId: ChainId
  defaultRole: Map<`0x${string}`, string>
  multisend: `0x${string}`[]
}

interface Delay {
  type: AccountType.DELAY
  address: `0x${string}`
  prefixedAddress: PrefixedAddress

  chainId: ChainId
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
}

interface IsEnabledConnection {
  type: ConnectionType.IS_ENABLED
}

interface IsMemberConnection {
  type: ConnectionType.IS_MEMBER
  roles: string[]
}

export type Connection =
  | OwnsConnection
  | IsEnabledConnection
  | IsMemberConnection

/** An execution route starts with the signing EOA or initiating smart contract account. */
interface StartingPoint {
  /** The account that is used as the signer or initiator of the transaction */
  account: Account
}

/** An execution route flows along an arbitrary number of contract waypoints ending at the controlled avatar */
export interface Waypoint {
  /** A description of the account or module at this waypoint */
  account: Contract
  /** A description of how the previous waypoint is connected to this contract */
  connection: Connection
}

export type Route = [StartingPoint, ...Waypoint[]]
