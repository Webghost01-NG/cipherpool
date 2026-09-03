// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FHE, externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolEvents} from "../../contracts/interfaces/IPoolEvents.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

/**
 * @title EndToEndPoolTest
 * @notice Integration test simulating 10 concurrent users depositing, multiple draws,
 *         and full 2-step withdrawal lifecycle (Issue #17).
 */
contract EndToEndPoolTest is Test, FHEVMMockHarness, IPoolErrors, IPoolEvents, IPoolTypes {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    uint64 public constant DELAY = 1 days;
    uint256 public constant USER_COUNT = 10;
    address[USER_COUNT] public users;
    uint64 public constant DEPOSIT_AMOUNT = 10_000;

    function setUp() public {
        setUpMockFHEVM();

        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
        initContractCoprocessor(address(pool));

        for (uint256 i = 0; i < USER_COUNT; i++) {
            users[i] = address(uint160(0x1000 + i));
            usdc.mint(users[i], 1_000_000);
            vm.prank(users[i]);
            usdc.approve(address(pool), type(uint256).max);
        }
    }

    function test_EndToEnd_MultiUser_Deposit_Draw_Withdrawal() public {
        // Step 1: 10 concurrent users deposit
        for (uint256 i = 0; i < USER_COUNT; i++) {
            address user = users[i];
            externalEuint64 mockInputHandle = externalEuint64.wrap(bytes32(uint256(0x2000 + i)));
            bytes memory mockProof = abi.encodePacked("zkProof", i);

            vm.prank(user);
            pool.deposit(mockInputHandle, mockProof, DEPOSIT_AMOUNT);

            assertEq(pool.userDepositNonces(user), 1);
            assertTrue(pool.isParticipant(user));
        }

        assertEq(pool.getParticipantCount(), USER_COUNT);
        assertEq(pool.totalDepositsPlain(), uint64(USER_COUNT) * DEPOSIT_AMOUNT);
        assertEq(usdc.balanceOf(address(pool)), uint256(USER_COUNT) * DEPOSIT_AMOUNT);

        // Step 2: Multiple lottery rounds (3 draws)
        uint64 prize1 = 1_000;
        uint64 prize2 = 2_500;
        uint64 prize3 = 500;

        pool.draw(prize1);
        assertEq(pool.currentDrawId(), 1);

        pool.draw(prize2);
        assertEq(pool.currentDrawId(), 2);

        pool.draw(prize3);
        assertEq(pool.currentDrawId(), 3);

        // Verify each participant has valid balance and prize handles in state
        for (uint256 i = 0; i < USER_COUNT; i++) {
            bytes32 bHandle = pool.getBalanceHandle(users[i]);
            bytes32 pHandle = pool.getPrizeHandle(users[i]);
            assertTrue(bHandle != bytes32(0));
            assertTrue(pHandle != bytes32(0));
        }

        // Step 3: Concurrent 2-step withdrawal lifecycle for User 0 and User 1
        address user0 = users[0];
        address user1 = users[1];
        uint64 withdrawAmount0 = 4_000;
        uint64 withdrawAmount1 = DEPOSIT_AMOUNT; // Full balance

        // Step 3a: User 0 and User 1 request withdrawals
        vm.prank(user0);
        pool.requestWithdrawal(withdrawAmount0);

        vm.prank(user1);
        pool.requestWithdrawal(withdrawAmount1);

        WithdrawalRequest memory req0 = pool.getPendingWithdrawal(user0);
        assertTrue(req0.active);
        assertEq(req0.requestedAmount, withdrawAmount0);
        assertEq(pool.getUserWithdrawalNonce(user0), 1);

        WithdrawalRequest memory req1 = pool.getPendingWithdrawal(user1);
        assertTrue(req1.active);
        assertEq(req1.requestedAmount, withdrawAmount1);
        assertEq(pool.getUserWithdrawalNonce(user1), 1);

        // Storage isolation verification: User 0's request did not overwrite User 1's
        assertTrue(req0.requestHash != req1.requestHash);
        assertTrue(FHE.toBytes32(req0.handle) != FHE.toBytes32(req1.handle));

        // Step 3b: Prevent double-request while active
        vm.prank(user0);
        vm.expectRevert(abi.encodeWithSelector(ActiveWithdrawalExists.selector, user0));
        pool.requestWithdrawal(1_000);

        // Step 3c: Finalize withdrawal for User 0 with mock KMS proof
        bytes memory mockProof0 = generateMockKMSProof(FHE.toBytes32(req0.handle), withdrawAmount0);
        uint256 user0PreBal = usdc.balanceOf(user0);

        vm.prank(user0);
        pool.finalizeWithdrawal(withdrawAmount0, mockProof0);

        // Verify User 0 settlement
        WithdrawalRequest memory req0After = pool.getPendingWithdrawal(user0);
        assertFalse(req0After.active);
        assertEq(usdc.balanceOf(user0), user0PreBal + withdrawAmount0);

        // Step 3d: User 1 cancels after delay (Escape Valve)
        // Ensure before delay it reverts
        vm.prank(user1);
        vm.expectRevert();
        pool.cancelWithdrawal();

        // Warp time past cancellation delay
        vm.warp(block.timestamp + DELAY + 1);

        vm.prank(user1);
        pool.cancelWithdrawal();

        WithdrawalRequest memory req1After = pool.getPendingWithdrawal(user1);
        assertFalse(req1After.active);

        // User 1 can immediately submit a new request
        vm.prank(user1);
        pool.requestWithdrawal(withdrawAmount1);
        WithdrawalRequest memory req1New = pool.getPendingWithdrawal(user1);
        assertTrue(req1New.active);
        assertEq(pool.getUserWithdrawalNonce(user1), 2);

        // Finalize User 1 new request with newly signed KMS proof
        bytes memory mockProof1 = generateMockKMSProof(FHE.toBytes32(req1New.handle), withdrawAmount1);
        uint256 user1PreBal = usdc.balanceOf(user1);
        vm.prank(user1);
        pool.finalizeWithdrawal(withdrawAmount1, mockProof1);

        assertEq(usdc.balanceOf(user1), user1PreBal + withdrawAmount1);

        // Verify pool custody consistency
        uint64 remainingExpected = (uint64(USER_COUNT) * DEPOSIT_AMOUNT) - withdrawAmount0 - withdrawAmount1;
        assertEq(pool.totalDepositsPlain(), remainingExpected);
        assertEq(usdc.balanceOf(address(pool)), remainingExpected);
    }
}
