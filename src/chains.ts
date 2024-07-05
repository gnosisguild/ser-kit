export const chains = [
  { chainId: 1, shortName: 'eth' },
  // { chainId: 10, shortName: 'oeth' },
  { chainId: 100, shortName: 'gno' },
  { chainId: 11155111, shortName: 'sep' },
  { chainId: 137, shortName: 'matic' },
  { chainId: 42161, shortName: 'arb1' },
  { chainId: 43114, shortName: 'avax' },
  { chainId: 8453, shortName: 'base' },
] as const

export const defaultRpc = {
  [1]: 'https://mainnet.gateway.tenderly.co',
  [10]: 'https://optimism.gateway.tenderly.co',
  [100]: 'https://rpc.gnosis.gateway.fm',
  [11155111]: 'https://sepolia.gateway.tenderly.co',
  [137]: 'https://polygon.gateway.tenderly.co',
  [42161]: 'https://arbitrum.gateway.tenderly.co',
  [43114]: 'https://rpc.ankr.com/avalanche',
  [8453]: 'https://base.gateway.tenderly.co',
} as const
