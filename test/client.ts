import {
  Account,
  createTestClient,
  hashMessage,
  http,
  parseEther,
  PrivateKeyAccount,
  publicActions,
  walletActions,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { mainnet } from 'viem/chains'

export const anvilUrl = `http://127.0.0.1:${process.env.ANVIL_PORT}/`

export const deployer = privateKeyToAccount(
  '0x0000000000000000000000000000000000000000000000000000000000badfed'
)

export const testClientWithAccount = (account: PrivateKeyAccount) =>
  createTestClient({
    account,
    chain: mainnet,
    mode: 'anvil',
    transport: http(anvilUrl),
  })
    .extend(publicActions)
    .extend(walletActions)

export const testClient = createTestClient({
  chain: mainnet,
  mode: 'anvil',
  transport: http(anvilUrl),
})
  .extend(publicActions)
  .extend(walletActions)

export const randomHash = () => hashMessage(String(Math.random()))

export async function fund(params: (string | [string, bigint])[]) {
  for (const entry of params) {
    let account, amount
    if (typeof entry == 'string') {
      account = entry
      amount = parseEther('1')
    } else {
      ;[account, amount] = entry
    }

    await testClient.sendTransaction({
      account: deployer,
      to: account,
      value: amount,
    })
  }
}
