import { chains } from './chains'

export type ChainId = (typeof chains)[number]['chainId']
export type ChainShortName = (typeof chains)[number]['shortName']

export type PrefixedAddress = `${ChainShortName}:0x${string}`

export interface ExecutionPath {
  nodes: ExecutionNode[]
  edges: ExecutionEdge[]
}

enum ExecutionNodeType {
  EOA = 'EOA',
  SAFE = 'SAFE',
  ROLES = 'ROLES',
  DELAY = 'DELAY',
}

interface EoaExecutionNode {
  type: ExecutionNodeType.EOA
  address: `0x${string}`
}

interface SafeExecutionNode {
  type: ExecutionNodeType.SAFE
  address: `0x${string}`

  prefixedAddress: PrefixedAddress
  chainId: ChainId
  threshold: number
}

interface RolesExecutionNode {
  type: ExecutionNodeType.ROLES
  address: `0x${string}`

  prefixedAddress: PrefixedAddress
  chainId: ChainId
  defaultRole: Map<`0x${string}`, string>
  multisend: `0x${string}`[]
}

interface DelayExecutionNode {
  type: ExecutionNodeType.DELAY
  address: `0x${string}`

  prefixedAddress: PrefixedAddress
  chainId: ChainId
}

export type ExecutionNode =
  | EoaExecutionNode
  | SafeExecutionNode
  | RolesExecutionNode
  | DelayExecutionNode

enum ExecutionEdgeType {
  /** The source node is an owner of the destination safe */
  OWNS = 'OWNS',
  /** The source node is enabled as a module of the destination node */
  IS_ENABLED = 'IS_ENABLED',
  /** The source node is a role member of the destination Roles node */
  IS_MEMBER = 'IS_MEMBER',
}

interface OwnsExecutionEdge {
  type: ExecutionEdgeType.OWNS
}

interface IsEnabledExecutionEdge {
  type: ExecutionEdgeType.IS_ENABLED
}

interface IsMemberExecutionEdge {
  type: ExecutionEdgeType.IS_MEMBER
}

export type ExecutionEdge =
  | OwnsExecutionEdge
  | IsEnabledExecutionEdge
  | IsMemberExecutionEdge
