// SPDX-License-Identifier: MIT
pragma solidity >=0.8.24;

import {ebool, euint64} from "@fhevm/solidity/lib/FHE.sol";

/** @notice Receiver callback used by ERC-7984 confidential transfers. */
interface IERC7984Receiver {
    function onConfidentialTransferReceived(
        address operator,
        address from,
        euint64 amount,
        bytes calldata data
    ) external returns (ebool);
}
