// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract SponsorReserveTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal saver = address(0xA11CE);
    address internal sponsor = address(0xBEEF);

    function setUp() public {
        setUpPool();
    }

    function test_SponsorFundingDoesNotCreateSaverPrincipalOrDrawWeight() public {
        _fundReserve(sponsor, 2_000);

        assertEq(pool.getParticipantCount(), 0);
        assertEq(pool.userDepositNonces(sponsor), 0);
        assertEq(pool.getTotalEligibleBalanceHandle(), bytes32(0));
        assertTrue(pool.getPrizeReserveHandle() != bytes32(0));
    }

    function test_SubsequentSponsorFundingAccumulatesEncryptedReserve() public {
        _fundReserve(sponsor, 600);
        bytes32 firstReserveHandle = pool.getPrizeReserveHandle();

        _fundReserve(sponsor, 400);

        assertTrue(pool.getPrizeReserveHandle() != firstReserveHandle);
        _deposit(saver, 10_000);
        pool.requestDraw(DRAW_PRIZE);
        pool.finalizeDraw(true, _drawReadinessProof(true));
        assertTrue(pool.lastDrawReady());
    }

    function test_ZeroTokenTransferCannotCreateSpendableReserve() public {
        _deposit(saver, 10_000);
        token.setForceZeroIncomingTransfer(true);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(DRAW_PRIZE);
        pool.finalizeDraw(false, _drawReadinessProof(false));

        assertFalse(pool.getPendingDraw().active);
        assertEq(pool.currentDrawId(), 0);
        assertFalse(pool.lastDrawReady());
    }

    function test_PausedPoolRejectsSponsorFundingWithoutChangingReserve() public {
        pool.pause();
        _fundReserve(sponsor, 1_000);

        assertEq(pool.getPrizeReserveHandle(), bytes32(0));
    }

    function test_ActiveDrawRejectsReserveMutation() public {
        _deposit(saver, 10_000);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(500);
        bytes32 reserveBefore = pool.getPrizeReserveHandle();

        _fundReserve(sponsor, 500);

        assertEq(pool.getPrizeReserveHandle(), reserveBefore);
    }

    function test_FinalizedPrizeCannotBeReused() public {
        _deposit(saver, 10_000);
        _fundReserve(sponsor, 1_000);
        _requestAndFinalizeDraw(10_000, 1_000);
        vm.warp(pool.nextDrawRequestTimestamp());
        pool.requestDraw(DRAW_PRIZE);
        pool.finalizeDraw(true, _drawReadinessProof(true));
        assertEq(pool.currentDrawId(), 2);
        assertTrue(pool.lastDrawReady());

        vm.warp(pool.nextDrawRequestTimestamp());
        pool.requestDraw(DRAW_PRIZE);
        pool.finalizeDraw(false, _drawReadinessProof(false));

        assertEq(pool.currentDrawId(), 2);
        assertFalse(pool.lastDrawReady());
        assertFalse(pool.getPendingDraw().active);
    }
}
