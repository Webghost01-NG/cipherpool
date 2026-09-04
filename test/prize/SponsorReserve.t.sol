// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract SponsorReserveTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal saver = address(0xA11CE);
    address internal sponsor = address(0xBEEF);

    function setUp() public { setUpPool(); }

    function test_SponsorFundingDoesNotCreateSaverPrincipalOrDrawWeight() public {
        _fundReserve(sponsor, 2_000);

        assertEq(pool.getParticipantCount(), 0);
        assertEq(pool.userDepositNonces(sponsor), 0);
        assertEq(pool.getTotalAccountedBalanceHandle(), bytes32(0));
        assertTrue(pool.getPrizeReserveHandle() != bytes32(0));
    }

    function test_ZeroTokenTransferCannotCreateSpendableReserve() public {
        _deposit(saver, 10_000);
        token.setForceZeroIncomingTransfer(true);
        _fundReserve(sponsor, 1_000);
        pool.requestDraw(1);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_000), uint64(0)));

        vm.expectRevert(abi.encodeWithSelector(InsufficientPrizeYield.selector, uint256(1), uint256(0)));
        pool.finalizeDraw(10_000, 0, proof);
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
        _requestAndFinalizeDraw(750, 10_000, 1_000);
        pool.requestDraw(500);

        IPoolTypes.DrawRequest memory request = pool.getPendingDraw();
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(uint64(10_750), uint64(250)));

        vm.expectRevert(abi.encodeWithSelector(InsufficientPrizeYield.selector, uint256(500), uint256(250)));
        pool.finalizeDraw(10_750, 250, proof);
    }
}
