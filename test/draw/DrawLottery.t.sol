// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract DrawLotteryTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);
    address internal sponsor = address(0xBEEF);
    address internal keeper = address(0xC0FFEE);

    function setUp() public {
        setUpPool();
    }

    function test_RevertWhen_RequestPrizeDiffersFromPolicy() public {
        vm.expectRevert(
            abi.encodeWithSelector(InvalidDrawPrizeAmount.selector, uint256(DRAW_PRIZE - 1), uint256(DRAW_PRIZE))
        );
        pool.requestDraw(DRAW_PRIZE - 1);
    }

    function test_RevertWhen_RequestHasEmptyPool() public {
        vm.expectRevert(EmptyPool.selector);
        pool.requestDraw(DRAW_PRIZE);
    }

    function test_NonOwnerCanRequestPolicyBoundDraw() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        uint64 requestedAt = uint64(block.timestamp);

        vm.prank(keeper);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        assertTrue(request.active);
        assertEq(request.prizeAmount, DRAW_PRIZE);
        assertEq(pool.nextDrawRequestTimestamp(), requestedAt + DRAW_INTERVAL);
    }

    function test_RevertWhen_RequestBeforeNextCadenceWindow() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        _requestAndFinalizeDraw(10_000, 2_000);
        uint64 eligibleAt = pool.nextDrawRequestTimestamp();

        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(DrawRequestTooEarly.selector, block.timestamp, uint256(eligibleAt)));
        pool.requestDraw(DRAW_PRIZE);

        vm.warp(eligibleAt);
        vm.prank(keeper);
        pool.requestDraw(DRAW_PRIZE);
        assertTrue(pool.getPendingDraw().active);
    }

    function test_RequestAnchorsBothAggregateHandlesAndLocksBalanceChanges() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        assertTrue(request.active);
        assertEq(FHE.toBytes32(request.totalHandle), pool.getTotalEligibleBalanceHandle());
        assertEq(FHE.toBytes32(request.reserveHandle), pool.getPrizeReserveHandle());

        externalEuint64 encryptedAmount = _externalAmount(100);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BalanceUpdatesLocked.selector, request.requestHash));
        pool.withdraw(encryptedAmount, "");
    }

    function test_FinalizeDrawConsumesReserveAndRecordsVerifiedSnapshot() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        _requestAndFinalizeDraw(10_000, 2_000);

        assertEq(pool.currentDrawId(), 1);
        assertEq(pool.lastVerifiedTotalEligibleBalance(), 10_500);
        assertEq(pool.lastVerifiedPrizeReserve(), 1_500);
        assertTrue(pool.getPrizeHandle(alice) != bytes32(0));
        assertFalse(pool.getPendingDraw().active);
    }

    function test_NonOwnerCanFinalizeProofBoundDraw() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(2_000)));

        vm.prank(keeper);
        pool.finalizeDraw(10_000, 2_000, proof);

        assertEq(pool.currentDrawId(), 1);
        assertEq(pool.lastVerifiedPrizeReserve(), 1_500);
        assertFalse(pool.getPendingDraw().active);
    }

    function test_FinalizeDrawSupportsNonPowerOfTwoTotalWithoutBoundedRandomness() public {
        _deposit(alice, 8_000_000);
        _fundReserve(sponsor, 1_000_000);

        _requestAndFinalizeDraw(8_000_000, 1_000_000);

        assertEq(pool.currentDrawId(), 1);
        assertEq(mockExecutor.randomCalls(), 1);
        assertEq(mockExecutor.boundedRandomCalls(), 0);
    }

    function test_VerifiedInsufficientReserveSkipsDrawAndReleasesLock() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, DRAW_PRIZE - 1);
        pool.requestDraw(DRAW_PRIZE);
        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(DRAW_PRIZE - 1)));

        vm.prank(keeper);
        pool.finalizeDraw(10_000, DRAW_PRIZE - 1, proof);

        assertFalse(pool.getPendingDraw().active);
        assertEq(pool.currentDrawId(), 0);
        assertEq(pool.lastVerifiedTotalEligibleBalance(), 10_000);
        assertEq(pool.lastVerifiedPrizeReserve(), DRAW_PRIZE - 1);
        assertEq(mockExecutor.randomCalls(), 0);
    }

    function test_RevertWhen_DrawProofUsesSubstitutedHandle() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory substitutedHandles = new bytes32[](2);
        substitutedHandles[0] = FHE.toBytes32(request.totalHandle);
        substitutedHandles[1] = bytes32(uint256(1));
        bytes memory proof = generateMockKMSProof(substitutedHandles, abi.encode(uint64(10_000), uint64(2_000)));

        vm.startPrank(keeper);
        vm.expectRevert();
        pool.finalizeDraw(10_000, 2_000, proof);
        vm.stopPrank();
        assertTrue(pool.getPendingDraw().active);
    }

    function test_RevertWhen_DrawProofCleartextIsModified() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(2_000)));

        vm.startPrank(keeper);
        vm.expectRevert();
        pool.finalizeDraw(10_001, 2_000, proof);
        vm.stopPrank();
        assertTrue(pool.getPendingDraw().active);
    }

    function test_RevertWhen_ReplayingFinalizedDrawProof() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(DRAW_PRIZE);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(2_000)));
        vm.prank(keeper);
        pool.finalizeDraw(10_000, 2_000, proof);

        vm.prank(alice);
        vm.expectRevert(NoActiveDrawRequest.selector);
        pool.finalizeDraw(10_000, 2_000, proof);
    }

    function test_FinalizesAtDocumentedParticipantBound() public {
        uint256 maximum = pool.MAX_PARTICIPANTS();
        assertEq(maximum, 12);
        uint64 balance = 1_000;
        for (uint256 i = 0; i < maximum; i++) {
            _deposit(vm.addr(0x1000 + i), balance);
        }
        _fundReserve(sponsor, DRAW_PRIZE);
        pool.requestDraw(DRAW_PRIZE);
        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        uint64 total = 12 * balance;
        bytes memory proof = generateMockKMSProof(handles, abi.encode(total, DRAW_PRIZE));

        uint256 gasBefore = gasleft();
        pool.finalizeDraw(total, DRAW_PRIZE, proof);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("bounded finalization gas", gasUsed);
        assertLt(gasUsed, 30_000_000);
        assertEq(pool.currentDrawId(), 1);
        assertEq(pool.getParticipantCount(), maximum);
    }

    function test_AnyoneCanCancelStaleDrawLock() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(DRAW_PRIZE);
        vm.warp(block.timestamp + DELAY + 1);
        vm.prank(alice);
        pool.cancelDraw();
        assertFalse(pool.getPendingDraw().active);
    }

    function test_RevertWhen_CancellingFreshDrawLock() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(DRAW_PRIZE);
        vm.expectRevert(abi.encodeWithSelector(DrawRequestNotStale.selector, uint256(0), uint256(DELAY)));
        pool.cancelDraw();
    }

    function test_TimeoutLeavesUnlockedRecoveryWindowBeforeNextRequest() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        uint64 requestedAt = uint64(block.timestamp);
        pool.requestDraw(DRAW_PRIZE);

        vm.warp(requestedAt + DELAY + 1);
        vm.prank(keeper);
        pool.cancelDraw();

        _deposit(alice, 100);
        assertEq(pool.userDepositNonces(alice), 2);

        uint64 eligibleAt = requestedAt + DRAW_INTERVAL;
        vm.prank(keeper);
        vm.expectRevert(abi.encodeWithSelector(DrawRequestTooEarly.selector, block.timestamp, uint256(eligibleAt)));
        pool.requestDraw(DRAW_PRIZE);

        vm.warp(eligibleAt);
        vm.prank(keeper);
        pool.requestDraw(DRAW_PRIZE);
        assertTrue(pool.getPendingDraw().active);
    }
}
