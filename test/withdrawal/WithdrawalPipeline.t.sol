// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolEvents} from "../../contracts/interfaces/IPoolEvents.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract WithdrawalPipelineTest is ConfidentialPoolTestBase, IPoolErrors, IPoolEvents {
    address internal alice = address(0xA11CE);

    function setUp() public { setUpPool(); }

    function test_RevertWhen_UserHasNoPosition() public {
        externalEuint64 encryptedAmount = _externalAmount(100);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NoBalancePosition.selector, alice));
        pool.withdraw(encryptedAmount, "");
    }

    function test_WithdrawalUsesEncryptedInputAndIncrementsNonce() public {
        _deposit(alice, 10_000);
        bytes32 beforeHandle = pool.getBalanceHandle(alice);
        _withdraw(alice, 4_000);
        assertEq(pool.userWithdrawalNonces(alice), 1);
        assertTrue(pool.getBalanceHandle(alice) != beforeHandle);
    }

    function test_SilentZeroTokenTransferCannotReportNonzeroSettlement() public {
        _deposit(alice, 10_000);
        token.setForceZeroOutgoingTransfer(true);
        externalEuint64 encryptedAmount = _externalAmount(4_000);
        vm.expectEmit(true, true, true, false);
        emit Withdrawn(alice, 0, bytes32(0));
        vm.prank(alice);
        pool.withdraw(encryptedAmount, "");
    }

    function test_LegacyPlaintextWithdrawalEntryPointDoesNotExist() public {
        _deposit(alice, 10_000);
        vm.prank(alice);
        (bool succeeded,) = address(pool).call(abi.encodeWithSignature("requestWithdrawal(uint64)", uint64(1_000)));
        assertFalse(succeeded);
    }
}
