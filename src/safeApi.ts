import SafeApiKit from '@safe-global/api-kit'
import { ChainId } from './types'
import { safeTransactionServiceUrls } from './chains'

export const initApiKit = (chainId: ChainId): SafeApiKit => {
  return new SafeApiKit({
    chainId: BigInt(chainId),
    txServiceUrl:
      chainId in safeTransactionServiceUrls
        ? safeTransactionServiceUrls[
            chainId as keyof typeof safeTransactionServiceUrls
          ]
        : undefined,
  })
}
