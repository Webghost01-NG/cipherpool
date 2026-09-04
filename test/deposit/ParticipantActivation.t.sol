// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract ParticipantActivationTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);
    address internal keeper = address(0xB0B);

    function setUp() public { setUpPool(); }

    function test_ZeroTransferCannotConsumeParticipantCapacity() public {
        token.setForceZeroIncomingTransfer(true);
        _depositWithoutActivation(alice, 10_000);

        assertEq(pool.getParticipantCount(), 0);
        assertFalse(pool.isParticipant(alice));
        assertTrue(pool.getPendingParticipantActivation(alice).active);

        _finalizeParticipantActivation(alice, false);

        assertEq(pool.getParticipantCount(), 0);
        assertFalse(pool.isParticipant(alice));
        assertFalse(pool.getPendingParticipantActivation(alice).active);
        assertEq(pool.getTotalEligibleBalanceHandle(), bytes32(0));
    }

    function test_PermissionlessKMSProofActivatesPositivePosition() public {
        _depositWithoutActivation(alice, 10_000);
        bytes32 requestHash = pool.getPendingParticipantActivation(alice).requestHash;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(pool.getPendingParticipantActivation(alice).eligibilityHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(true));

        vm.prank(keeper);
        pool.finalizeParticipantActivation(alice, true, proof);

        assertTrue(pool.isParticipant(alice));
        assertEq(pool.getParticipantCount(), 1);
        assertFalse(pool.getPendingParticipantActivation(alice).active);
        assertTrue(pool.getTotalEligibleBalanceHandle() != bytes32(0));
        assertTrue(requestHash != bytes32(0));
    }

    function test_RepeatedCallbackRotatesHandleAndRejectsStaleProof() public {
        _depositWithoutActivation(alice, 1_000);
        bytes32 firstHash = pool.getPendingParticipantActivation(alice).requestHash;
        bytes32[] memory firstHandles = new bytes32[](1);
        firstHandles[0] = FHE.toBytes32(pool.getPendingParticipantActivation(alice).eligibilityHandle);
        bytes memory staleProof = generateMockKMSProof(firstHandles, abi.encode(true));

        _depositWithoutActivation(alice, 2_000);
        bytes32 secondHash = pool.getPendingParticipantActivation(alice).requestHash;
        assertTrue(firstHash != secondHash);

        vm.expectRevert();
        pool.finalizeParticipantActivation(alice, true, staleProof);
        assertTrue(pool.getPendingParticipantActivation(alice).active);

        _finalizeParticipantActivation(alice, true);
        assertEq(pool.getParticipantCount(), 1);
    }

    function test_ActivationCannotBeReplayed() public {
        _deposit(alice, 10_000);

        vm.expectRevert(abi.encodeWithSelector(ParticipantAlreadyActive.selector, alice));
        pool.finalizeParticipantActivation(alice, true, "");
        assertEq(pool.getParticipantCount(), 1);
    }

    function test_UnverifiedPositionCannotOpenDraw() public {
        _depositWithoutActivation(alice, 10_000);
        _fundReserve(keeper, DRAW_PRIZE);

        vm.expectRevert(EmptyPool.selector);
        pool.requestDraw(DRAW_PRIZE);
    }

    function test_WithdrawalRotatesPendingEligibilitySnapshot() public {
        _depositWithoutActivation(alice, 10_000);
        bytes32 beforeWithdrawal = pool.getPendingParticipantActivation(alice).requestHash;

        _withdraw(alice, 10_000);

        bytes32 afterWithdrawal = pool.getPendingParticipantActivation(alice).requestHash;
        assertTrue(beforeWithdrawal != afterWithdrawal);
        _finalizeParticipantActivation(alice, false);
        assertFalse(pool.isParticipant(alice));
    }
}
