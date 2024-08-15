export const chains = [
  { chainId: 1, shortName: 'eth' },
  { chainId: 10, shortName: 'oeth' },
  { chainId: 100, shortName: 'gno' },
  { chainId: 11155111, shortName: 'sep' },
  { chainId: 137, shortName: 'matic' },
  { chainId: 42161, shortName: 'arb1' },
  { chainId: 43114, shortName: 'avax' },
  { chainId: 8453, shortName: 'base' },
] as const

export const defaultRpc = {
  [1]: 'https://airlock.gnosisguild.org/api/v1/1/rpc',
  [10]: 'https://airlock.gnosisguild.org/api/v1/10/rpc',
  [100]: 'https://airlock.gnosisguild.org/api/v1/100/rpc',
  [137]: 'https://airlock.gnosisguild.org/api/v1/137/rpc',
  [8453]: 'https://airlock.gnosisguild.org/api/v1/8453/rpc',
  [42161]: 'https://airlock.gnosisguild.org/api/v1/42161/rpc',
  [43114]: 'https://airlock.gnosisguild.org/api/v1/43114/rpc',
  [11155111]: 'https://airlock.gnosisguild.org/api/v1/11155111/rpc',
} as const
