import { concat, pad, toHex } from 'viem'

// https://github.com/safe-global/safe-smart-account/blob/8f80a8372d193be121dcdb52e869a258824e5c0f/contracts/common/SignatureDecoder.sol#L21
export const encodeApprovedHashSignature = (approver: `0x${string}`) => {
  const v = pad(toHex(1), { size: 8 }) // left-pad to 38 bytes
  const r = pad(approver) // left-pad to 32 bytes
  const s = pad('0x00') // left-pad to 32 bytes
  return concat([r, s, v])
}
