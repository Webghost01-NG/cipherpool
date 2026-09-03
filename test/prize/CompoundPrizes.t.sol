// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

contract CompoundPrizesTest is Test, FHEVMMockHarness, IPoolTypes {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    uint64 public constant DELAY = 1 days;

    function setUp() public {
        setUpMockFHEVM();
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
        initContractCoprocessor(address(pool));

        _fundAndApprove(alice, 100_000);
        _fundAndApprove(bob, 100_000);
    }

    function test_CompoundThenWithdrawConsumesAggregateLiabilitiesWithoutUnderflow() public {
        _deposit(alice, 10_000);
        usdc.mint(address(pool), 2_000);
        pool.draw(2_000);

        assertEq(pool.totalDepositsPlain(), 10_000);
        assertEq(pool.reservedPrizesPlain(), 2_000);
        assertEq(pool.totalAccountedBalancePlain(), 12_000);

        vm.prank(alice);
        pool.compoundPrizes();

        assertEq(pool.totalDepositsPlain(), 10_000);
        assertEq(pool.reservedPrizesPlain(), 2_000);
        assertEq(pool.totalAccountedBalancePlain(), 12_000);

        vm.prank(alice);
        pool.requestWithdrawal(12_000);
        WithdrawalRequest memory request = pool.getPendingWithdrawal(alice);
        bytes memory proof = generateMockKMSProof(FHE.toBytes32(request.handle), 12_000);

        vm.prank(alice);
        pool.finalizeWithdrawal(12_000, proof);

        assertEq(pool.totalDepositsPlain(), 0);
        assertEq(pool.reservedPrizesPlain(), 0);
        assertEq(pool.totalAccountedBalancePlain(), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(usdc.balanceOf(alice), 102_000);
    }

    function test_MultiUserWithdrawalPreservesAggregateSolvencyAndPrivacy() public {
        _deposit(alice, 10_000);
        _deposit(bob, 10_000);
        usdc.mint(address(pool), 3_000);
        pool.draw(3_000);

        vm.prank(bob);
        pool.requestWithdrawal(10_000);
        WithdrawalRequest memory request = pool.getPendingWithdrawal(bob);
        bytes memory proof = generateMockKMSProof(FHE.toBytes32(request.handle), 10_000);

        vm.prank(bob);
        pool.finalizeWithdrawal(10_000, proof);

        assertEq(pool.reservedPrizesPlain(), 0);
        assertEq(pool.totalDepositsPlain(), 13_000);
        assertEq(pool.totalAccountedBalancePlain(), 13_000);
        assertEq(usdc.balanceOf(address(pool)), 13_000);
    }

    function _fundAndApprove(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.prank(user);
        usdc.approve(address(pool), type(uint256).max);
    }

    function _deposit(address user, uint64 amount) internal {
        vm.prank(user);
        pool.deposit(amount);
    }
}
