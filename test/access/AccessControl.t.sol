// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";

contract AccessControlTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal stranger = address(0xCAFE);

    function setUp() public { setUpPool(); }

    function test_OwnerCanPauseAndUnpause() public {
        pool.pause();
        assertTrue(pool.paused());
        pool.unpause();
        assertFalse(pool.paused());
    }

    function test_RevertWhen_NonOwnerCallsPause() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        pool.pause();
    }

    function test_WithdrawalRemainsAvailableWhilePaused() public {
        _deposit(stranger, 100);
        pool.pause();
        externalEuint64 encryptedAmount = _externalAmount(10);
        vm.prank(stranger);
        pool.withdraw(encryptedAmount, "");
        assertEq(pool.userWithdrawalNonces(stranger), 1);
    }

    function test_RevertWhen_UntrustedTokenCallsReceiver() public {
        euint64 encryptedAmount = _encryptedAmount(1);
        bytes memory action = abi.encode(pool.DEPOSIT_ACTION());
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedTokenCallback.selector, stranger));
        pool.onConfidentialTransferReceived(stranger, stranger, encryptedAmount, action);
    }
}
