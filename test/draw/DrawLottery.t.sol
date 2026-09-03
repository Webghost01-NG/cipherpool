// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract DrawLotteryTest is Test, IPoolErrors {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    uint64 public constant DELAY = 1 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
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
}
