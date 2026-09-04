// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @notice Minimal OpenZeppelin ERC-7984 interface used by Veylott.
 * @dev The pool integrates the official deployed token; it does not implement or fork token accounting.
 */
interface IERC7984 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function confidentialBalanceOf(address account) external view returns (euint64);

    function confidentialTransfer(address to, euint64 amount) external returns (euint64 transferred);

    function confidentialTransferAndCall(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        bytes calldata data
    ) external returns (euint64 transferred);
}
