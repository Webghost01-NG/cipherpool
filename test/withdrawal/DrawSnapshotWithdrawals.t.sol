// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";

contract SnapshotPoolHarness is ConfidentialPool {
    constructor(address asset) ConfidentialPool(asset, 1 days, 7 days, 500) {}

    function weight(address user) external view returns (bytes32) {
        return FHE.toBytes32(_drawWeights[user]);
    }
}

contract DrawSnapshotWithdrawalsTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);
    address internal bob = address(0xB0B);
    SnapshotPoolHarness internal snapshotPool;

    function setUp() public {
        setUpPool();
        snapshotPool = new SnapshotPoolHarness(address(token));
        pool = snapshotPool;
        initContractCoprocessor(address(pool));
        _deposit(alice, 10_000);
        _deposit(bob, 20_000);
        _fundReserve(address(this), 2_000);
    }

    function test_FullExitsDoNotChangeFrozenWeightsAndSettlementUsesThem() public {
        bytes32 aliceWeight = pool.getBalanceHandle(alice);
        bytes32 bobWeight = pool.getBalanceHandle(bob);
        pool.requestDraw(DRAW_PRIZE);
        bytes memory proof = _drawReadinessProof(true);
        bytes32 frozenTotal = FHE.toBytes32(pool.getPendingDraw().totalHandle);
        _withdraw(alice, 10_000);
        _withdraw(bob, 20_000);
        assertEq(snapshotPool.weight(alice), aliceWeight);
        assertEq(snapshotPool.weight(bob), bobWeight);
        assertEq(FHE.toBytes32(pool.getPendingDraw().totalHandle), frozenTotal);
        assertTrue(pool.getBalanceHandle(alice) != aliceWeight);
        // The executor must receive the original weight when building the winner interval.
        // This checks ciphertext routing; the local executor does not decrypt arithmetic.
        vm.expectCall(address(mockExecutor), abi.encodeWithSignature(
            "fheAdd(bytes32,bytes32,bytes1)", bytes32(0), aliceWeight, bytes1(0)
        ));
        pool.finalizeDraw(true, proof);
        assertEq(pool.currentDrawId(), 1);
        assertEq(snapshotPool.weight(alice), bytes32(0));
        assertEq(snapshotPool.weight(bob), bytes32(0));
        assertFalse(pool.getPendingParticipantDeactivation(alice).active);
    }

    function test_PauseAndMissingKmsProofDoNotPreventExit() public {
        pool.requestDraw(DRAW_PRIZE);
        pool.pause();
        _withdraw(alice, 10_000);
        _withdraw(bob, 20_000);
        assertEq(pool.userWithdrawalNonces(alice), 1);
        assertEq(pool.userWithdrawalNonces(bob), 1);
        assertTrue(pool.getPendingDraw().active);
    }

    function test_ParticipantRemovalStaysLockedSoSnapshotMembershipCannotChange() public {
        pool.requestDraw(DRAW_PRIZE);
        _withdraw(alice, 10_000);
        bytes32 requestHash = pool.getPendingDraw().requestHash;
        vm.expectRevert(abi.encodeWithSelector(BalanceUpdatesLocked.selector, requestHash));
        pool.finalizeParticipantDeactivation(alice, true, "");
        assertEq(pool.getParticipantCount(), 2);
    }

    function test_CancelThenNextDrawReplacesOldWeights() public {
        pool.requestDraw(DRAW_PRIZE);
        _withdraw(alice, 4_000);
        vm.warp(block.timestamp + DELAY + 1);
        pool.cancelDraw();
        vm.warp(pool.nextDrawRequestTimestamp());
        pool.requestDraw(DRAW_PRIZE);
        assertEq(snapshotPool.weight(alice), pool.getBalanceHandle(alice));
        assertEq(snapshotPool.weight(bob), pool.getBalanceHandle(bob));
    }
}
