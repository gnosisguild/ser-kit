export const chains = [
  { chainId: 1, shortName: 'eth' },
  { chainId: 10, shortName: 'oeth' },
  { chainId: 100, shortName: 'gno' },
  { chainId: 11155111, shortName: 'sep' },
  { chainId: 137, shortName: 'matic' },
  { chainId: 42161, shortName: 'arb1' },
  { chainId: 43114, shortName: 'avax' },
  { chainId: 8453, shortName: 'base' },
  { chainId: 42220, shortName: 'celo' },
  { chainId: 146, shortName: 'sonic' },
  { chainId: 80094, shortName: 'berachain' },
  { chainId: 130, shortName: 'unichain' },
  { chainId: 480, shortName: 'wc' },
  { chainId: 60808, shortName: 'bob' },
  { chainId: 5000, shortName: 'mantle' },
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
  [42220]: 'https://airlock.gnosisguild.org/api/v1/42220/rpc',
  [80094]: 'https://airlock.gnosisguild.org/api/v1/80094/rpc',
  [146]: 'https://airlock.gnosisguild.org/api/v1/146/rpc',
  [130]: 'https://mainnet.unichain.org',
  [480]: 'https://worldchain-mainnet.g.alchemy.com/public',
  [60808]: 'https://rpc.gobob.xyz',
  [5000]: 'https://1rpc.io/mantle',
} as const

// Safe SDK sometimes is not up-to-date with transaction service urls. In that case we have to supply them manually.
export const safeTransactionServiceUrls = {
  [146]: 'https://safe-transaction-sonic.safe.global/api',
  [80094]: 'https://safe-transaction-berachain.safe.global/api',
  [60808]: 'https://transaction.safe.gobob.xyz/api',
} as const
