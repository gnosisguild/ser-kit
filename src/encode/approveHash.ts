import { encodeFunctionData, Hash, parseAbi, Hex } from 'viem'

export const avatarAbi = parseAbi([
  'function approveHash(bytes32 hashToApprove)',
])

export default function encodeApproveHash(hashToApprove: Hash): Hex {
  return encodeFunctionData({
    abi: avatarAbi,
    functionName: 'approveHash',
    args: [hashToApprove],
  })
}
