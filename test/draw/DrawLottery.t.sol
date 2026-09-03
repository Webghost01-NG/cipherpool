// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

contract DrawLotteryTest is Test, FHEVMMockHarness, IPoolErrors {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    uint64 public constant DELAY = 1 days;
    address public alice = address(0xA11CE);

    function setUp() public {
        setUpMockFHEVM();
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
        initContractCoprocessor(address(pool));

        usdc.mint(alice, 100_000);
        vm.prank(alice);
        usdc.approve(address(pool), type(uint256).max);
    }

    function test_RevertWhen_ZeroPrizeAmount() public {
        vm.expectRevert(ZeroPrizeAmount.selector);
        pool.draw(0);
    }

    function test_RevertWhen_EmptyPool() public {
        vm.expectRevert(EmptyPool.selector);
        pool.draw(1_000);
    }

    function test_RevertWhen_NonOwnerCallsDraw() public {
        address nonOwner = address(0x9999);
        vm.prank(nonOwner);
        vm.expectRevert();
        pool.draw(1_000);
    }

    function test_RevertWhen_DrawWouldConsumePrincipal() public {
        _depositPrincipal(10_000);

        vm.expectRevert(abi.encodeWithSelector(InsufficientPrizeYield.selector, uint256(1), uint256(0)));
        pool.draw(1);
    }

    function test_DrawReservesAvailableYield() public {
        _depositPrincipal(10_000);
        usdc.mint(address(pool), 2_500);

        pool.draw(2_500);

        assertEq(pool.reservedPrizesPlain(), 2_500);
        assertEq(pool.totalAccountedBalancePlain(), 12_500);
        assertEq(pool.availableYieldPlain(), 0);
        assertEq(pool.currentDrawId(), 1);
    }

    function test_RepeatedDrawCannotAllocateSameYield() public {
        _depositPrincipal(10_000);
        usdc.mint(address(pool), 3_000);

        pool.draw(2_000);

        assertEq(pool.reservedPrizesPlain(), 2_000);
        assertEq(pool.availableYieldPlain(), 1_000);

        vm.expectRevert(abi.encodeWithSelector(InsufficientPrizeYield.selector, uint256(1_001), uint256(1_000)));
        pool.draw(1_001);

        assertEq(pool.reservedPrizesPlain(), 2_000);
        assertEq(pool.currentDrawId(), 1);

        pool.draw(1_000);
        assertEq(pool.reservedPrizesPlain(), 3_000);
        assertEq(pool.totalAccountedBalancePlain(), 13_000);
        assertEq(pool.availableYieldPlain(), 0);
        assertEq(pool.currentDrawId(), 2);
    }

    function test_RevertWhen_PrizeWouldExceedEncryptedAccountingDomain() public {
        usdc.mint(alice, type(uint64).max);
        _depositPrincipal(type(uint64).max);
        usdc.mint(address(pool), 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                AccountingCapacityExceeded.selector,
                uint256(type(uint64).max) + 1,
                uint256(type(uint64).max)
            )
        );
        pool.draw(1);
    }

    function _depositPrincipal(uint64 amount) internal {
        vm.prank(alice);
        pool.deposit(amount);
    }
}
