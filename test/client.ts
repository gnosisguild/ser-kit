import { createTestClient, http, publicActions, walletActions } from 'viem'
import { mainnet } from 'viem/chains'

export const anvilUrl = `http://127.0.0.1:${process.env.ANVIL_PORT}/`

export const testClient = createTestClient({
  chain: mainnet,
  mode: 'anvil',
  transport: http(anvilUrl),
})
  .extend(publicActions)
  .extend(walletActions)
