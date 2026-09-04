// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract DrawLotteryTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);
    address internal sponsor = address(0xBEEF);
    address internal keeper = address(0xC0FFEE);

    function setUp() public { setUpPool(); }

    function test_RevertWhen_RequestHasZeroPrize() public {
        vm.expectRevert(ZeroPrizeAmount.selector);
        pool.requestDraw(0);
    }

    function test_RevertWhen_RequestHasEmptyPool() public {
        vm.expectRevert(EmptyPool.selector);
        pool.requestDraw(1_000);
    }

    function test_RevertWhen_NonOwnerRequestsDraw() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        pool.requestDraw(1_000);
    }

    function test_RequestAnchorsBothAggregateHandlesAndLocksBalanceChanges() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(1_000);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        assertTrue(request.active);
        assertEq(FHE.toBytes32(request.totalHandle), pool.getTotalAccountedBalanceHandle());
        assertEq(FHE.toBytes32(request.reserveHandle), pool.getPrizeReserveHandle());

        externalEuint64 encryptedAmount = _externalAmount(100);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(BalanceUpdatesLocked.selector, request.requestHash));
        pool.withdraw(encryptedAmount, "");
    }

    function test_FinalizeDrawConsumesReserveAndRecordsVerifiedSnapshot() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        _requestAndFinalizeDraw(1_500, 10_000, 2_000);

        assertEq(pool.currentDrawId(), 1);
        assertEq(pool.lastVerifiedTotalAccountedBalance(), 11_500);
        assertEq(pool.lastVerifiedPrizeReserve(), 500);
        assertTrue(pool.getPrizeHandle(alice) != bytes32(0));
        assertFalse(pool.getPendingDraw().active);
    }

    function test_NonOwnerCanFinalizeProofBoundDraw() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(1_500);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(
            handles,
            abi.encode(uint64(10_000), uint64(2_000))
        );

        vm.prank(keeper);
        pool.finalizeDraw(10_000, 2_000, proof);

        assertEq(pool.currentDrawId(), 1);
        assertEq(pool.lastVerifiedPrizeReserve(), 500);
        assertFalse(pool.getPendingDraw().active);
    }

    function test_FinalizeDrawSupportsNonPowerOfTwoTotalWithoutBoundedRandomness() public {
        _deposit(alice, 8_000_000);
        _fundReserve(sponsor, 1_000_000);

        _requestAndFinalizeDraw(500_000, 8_000_000, 1_000_000);

        assertEq(pool.currentDrawId(), 1);
        assertEq(mockExecutor.randomCalls(), 1);
        assertEq(mockExecutor.boundedRandomCalls(), 0);
    }

    function test_RevertWhen_VerifiedReserveCannotCoverPrize() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 500);
        pool.requestDraw(1_000);
        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(500)));

        vm.expectRevert(abi.encodeWithSelector(InsufficientPrizeYield.selector, uint256(1_000), uint256(500)));
        pool.finalizeDraw(10_000, 500, proof);
    }

    function test_RevertWhen_DrawProofUsesSubstitutedHandle() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(1_000);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory substitutedHandles = new bytes32[](2);
        substitutedHandles[0] = FHE.toBytes32(request.totalHandle);
        substitutedHandles[1] = bytes32(uint256(1));
        bytes memory proof = generateMockKMSProof(
            substitutedHandles,
            abi.encode(uint64(10_000), uint64(2_000))
        );

        vm.startPrank(keeper);
        vm.expectRevert();
        pool.finalizeDraw(10_000, 2_000, proof);
        vm.stopPrank();
        assertTrue(pool.getPendingDraw().active);
    }

    function test_RevertWhen_DrawProofCleartextIsModified() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(1_000);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(
            handles,
            abi.encode(uint64(10_000), uint64(2_000))
        );

        vm.startPrank(keeper);
        vm.expectRevert();
        pool.finalizeDraw(10_001, 2_000, proof);
        vm.stopPrank();
        assertTrue(pool.getPendingDraw().active);
    }

    function test_RevertWhen_ReplayingFinalizedDrawProof() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 2_000);
        pool.requestDraw(1_000);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(
            handles,
            abi.encode(uint64(10_000), uint64(2_000))
        );
        vm.prank(keeper);
        pool.finalizeDraw(10_000, 2_000, proof);

        vm.prank(alice);
        vm.expectRevert(NoActiveDrawRequest.selector);
        pool.finalizeDraw(10_000, 2_000, proof);
    }

    function test_AnyoneCanCancelStaleDrawLock() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(500);
        vm.warp(block.timestamp + DELAY + 1);
        vm.prank(alice);
        pool.cancelDraw();
        assertFalse(pool.getPendingDraw().active);
    }

    function test_RevertWhen_CancellingFreshDrawLock() public {
        _deposit(alice, 10_000);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(500);
        vm.expectRevert(abi.encodeWithSelector(DrawRequestNotStale.selector, uint256(0), uint256(DELAY)));
        pool.cancelDraw();
    }
}
