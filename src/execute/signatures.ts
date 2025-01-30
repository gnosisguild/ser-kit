import { concat, pad, zeroHash } from 'viem'

import { Address } from '../types'

export const createPreApprovedSignature = (approver: Address) => {
  /**
   * Pre-validated signatures with signature type equal to 1.
   *
   * **Constant Part Format**:
   *
   * ```
   * {32-bytes hash validator}{32-bytes ignored}{1-byte signature type}
   * ```
   *
   * **Components**:
   *
   * - **Hash validator**: This is the padded address of the account that has
   *   pre-validated the hash in question. The Safe tracks all pre-validated
   *   hashes using a mapping of addresses to another mapping of `bytes32`
   *   hashes to `boolean` values. This setup allows marking a hash as validated
   *   by a specific address (the hash validator). To add a hash to this mapping,
   *   use the `approveHash` function.
   *
   *   Additionally, if the validator is the transaction sender, the `approveHash`
   *   function is not necessary for adding an entry, as illustrated in the Team
   *   Edition tests.
   *
   * - **Signature type**: The type of the signature, which in this context is 1.
   */

  return concat([pad(approver), zeroHash, '0x01'])
}
