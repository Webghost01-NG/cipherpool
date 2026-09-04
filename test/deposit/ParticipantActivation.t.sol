// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract ParticipantActivationTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);
    address internal keeper = address(0xB0B);

    function setUp() public {
        setUpPool();
    }

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

    function test_FullWithdrawalReclaimsParticipantSlotAfterKMSProof() public {
        _deposit(alice, 10_000);
        _withdraw(alice, 10_000);

        assertTrue(pool.getPendingParticipantDeactivation(alice).active);
        _finalizeParticipantDeactivation(alice, true);

        assertFalse(pool.isParticipant(alice));
        assertEq(pool.getParticipantCount(), 0);
        assertFalse(pool.getPendingParticipantDeactivation(alice).active);
    }

    function test_PartialWithdrawalCannotRemoveParticipant() public {
        _deposit(alice, 10_000);
        _withdraw(alice, 1_000);

        _finalizeParticipantDeactivation(alice, false);

        assertTrue(pool.isParticipant(alice));
        assertEq(pool.getParticipantCount(), 1);
        assertFalse(pool.getPendingParticipantDeactivation(alice).active);
    }

    function test_ModifiedDeactivationCleartextCannotRemoveParticipant() public {
        _deposit(alice, 10_000);
        _withdraw(alice, 1_000);

        ebool zeroBalanceHandle = pool.getPendingParticipantDeactivation(alice).zeroBalanceHandle;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(zeroBalanceHandle);
        bytes memory proofForNonZeroBalance = generateMockKMSProof(handles, abi.encode(false));

        vm.expectRevert();
        pool.finalizeParticipantDeactivation(alice, true, proofForNonZeroBalance);

        assertTrue(pool.isParticipant(alice));
        assertEq(pool.getParticipantCount(), 1);
        assertTrue(pool.getPendingParticipantDeactivation(alice).active);
    }

    function test_DepositInvalidatesStaleDeactivationProof() public {
        _deposit(alice, 10_000);
        _withdraw(alice, 10_000);
        ebool zeroBalanceHandle = pool.getPendingParticipantDeactivation(alice).zeroBalanceHandle;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(zeroBalanceHandle);
        bytes memory staleProof = generateMockKMSProof(handles, abi.encode(true));

        _deposit(alice, 1_000);

        assertFalse(pool.getPendingParticipantDeactivation(alice).active);
        vm.expectRevert(abi.encodeWithSelector(NoActiveParticipantDeactivation.selector, alice));
        pool.finalizeParticipantDeactivation(alice, true, staleProof);
        assertTrue(pool.isParticipant(alice));
    }

    function test_CapacityRejectsThirteenthActiveParticipant() public {
        uint256 maximum = pool.MAX_PARTICIPANTS();
        for (uint256 i = 0; i < maximum - 1; i++) {
            _deposit(vm.addr(0x1000 + i), 1_000);
        }
        address overflowUser = address(0xFFFF);
        _depositWithoutActivation(overflowUser, 1_000);
        ebool eligibilityHandle = pool.getPendingParticipantActivation(overflowUser).eligibilityHandle;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(eligibilityHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(true));

        _deposit(vm.addr(0x1000 + maximum), 1_000);
        vm.expectRevert(abi.encodeWithSelector(ParticipantCapacityReached.selector, maximum));
        pool.finalizeParticipantActivation(overflowUser, true, proof);

        assertEq(pool.getParticipantCount(), maximum);
        assertFalse(pool.isParticipant(overflowUser));
        assertTrue(pool.getPendingParticipantActivation(overflowUser).active);
    }

    function test_DepositCallbackRejectsNewPositionAtCapacity() public {
        uint256 maximum = pool.MAX_PARTICIPANTS();
        for (uint256 i = 0; i < maximum; i++) {
            _deposit(vm.addr(0x1000 + i), 1_000);
        }
        address overflowUser = address(0xFFFF);

        _depositWithoutActivation(overflowUser, 1_000);

        assertEq(pool.userDepositNonces(overflowUser), 0);
        assertFalse(pool.getPendingParticipantActivation(overflowUser).active);
        assertFalse(pool.isParticipant(overflowUser));
    }

    function test_DeactivationReopensCapacityWithoutCorruptingMovedIndex() public {
        uint256 maximum = pool.MAX_PARTICIPANTS();
        address first = vm.addr(0x1000);
        for (uint256 i = 0; i < maximum; i++) {
            _deposit(vm.addr(0x1000 + i), 1_000);
        }
        _withdraw(first, 1_000);
        _finalizeParticipantDeactivation(first, true);

        address replacement = address(0xFFFF);
        _deposit(replacement, 1_000);

        assertEq(pool.getParticipantCount(), maximum);
        assertFalse(pool.isParticipant(first));
        assertTrue(pool.isParticipant(replacement));

        address moved = vm.addr(0x1000 + maximum - 1);
        _withdraw(moved, 1_000);
        _finalizeParticipantDeactivation(moved, true);
        assertFalse(pool.isParticipant(moved));
        assertEq(pool.getParticipantCount(), maximum - 1);
    }

    function test_UserCanRefreshDeactivationAfterDrawInvalidatesProof() public {
        _deposit(alice, 10_000);
        _deposit(keeper, 10_000);
        _withdraw(alice, 10_000);
        bytes32 staleRequestHash = pool.getPendingParticipantDeactivation(alice).requestHash;
        _fundReserve(keeper, DRAW_PRIZE);
        _requestAndFinalizeDraw(10_000, DRAW_PRIZE);
        assertFalse(pool.getPendingParticipantDeactivation(alice).active);

        vm.prank(alice);
        pool.requestParticipantDeactivation();

        assertTrue(pool.getPendingParticipantDeactivation(alice).active);
        assertTrue(pool.getPendingParticipantDeactivation(alice).requestHash != staleRequestHash);
    }

    function testFuzz_ActiveSetNeverExceedsDocumentedCapacity(uint8 requestedRaw) public {
        uint256 maximum = pool.MAX_PARTICIPANTS();
        uint256 requested = bound(uint256(requestedRaw), 1, maximum + 4);

        for (uint256 i = 0; i < requested; i++) {
            address user = vm.addr(0x2000 + i);
            _depositWithoutActivation(user, 1_000);
            if (i < maximum) {
                ebool eligibilityHandle = pool.getPendingParticipantActivation(user).eligibilityHandle;
                bytes32[] memory handles = new bytes32[](1);
                handles[0] = FHE.toBytes32(eligibilityHandle);
                bytes memory proof = generateMockKMSProof(handles, abi.encode(true));
                pool.finalizeParticipantActivation(user, true, proof);
            } else {
                assertFalse(pool.getPendingParticipantActivation(user).active);
                assertFalse(pool.isParticipant(user));
            }
            assertLe(pool.getParticipantCount(), maximum);
        }
    }
}
