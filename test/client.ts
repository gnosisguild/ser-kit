import { createTestClient, http, publicActions, walletActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

export const anvilUrl = `http://127.0.0.1:${process.env.ANVIL_PORT}/`

export const testClient = createTestClient({
  chain: mainnet,
  mode: 'anvil',
  transport: http(anvilUrl),
})
  .extend(publicActions)
  .extend(walletActions)

export const deployer = privateKeyToAccount(
  '0x0000000000000000000000000000000000000000000000000000000000badfed'
)
