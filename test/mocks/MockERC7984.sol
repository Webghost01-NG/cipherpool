// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC7984} from "../../contracts/interfaces/IERC7984.sol";
import {IERC7984Receiver} from "../../contracts/interfaces/IERC7984Receiver.sol";

contract MockERC7984 is IERC7984 {
    bool public forceZeroIncomingTransfer;
    bool public forceZeroOutgoingTransfer;
    mapping(address => euint64) internal _balances;

    function name() external pure returns (string memory) { return "Confidential USDC Mock"; }
    function symbol() external pure returns (string memory) { return "cUSDCMock"; }
    function decimals() external pure returns (uint8) { return 6; }
    function confidentialBalanceOf(address account) external view returns (euint64) { return _balances[account]; }

    function setForceZeroOutgoingTransfer(bool enabled) external {
        forceZeroOutgoingTransfer = enabled;
    }

    function setForceZeroIncomingTransfer(bool enabled) external {
        forceZeroIncomingTransfer = enabled;
    }

    function confidentialTransfer(address, euint64 amount) external returns (euint64 transferred) {
        transferred = forceZeroOutgoingTransfer ? FHE.asEuint64(0) : amount;
        FHE.allowTransient(transferred, msg.sender);
    }

    function confidentialTransferAndCall(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        bytes calldata data
    ) external returns (euint64 transferred) {
        transferred = forceZeroIncomingTransfer
            ? FHE.asEuint64(0)
            : FHE.fromExternal(encryptedAmount, inputProof);
        IERC7984Receiver(to).onConfidentialTransferReceived(msg.sender, msg.sender, transferred, data);
        FHE.allowTransient(transferred, msg.sender);
    }
}
