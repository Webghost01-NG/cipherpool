// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract AccessControlTest is Test {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    address public owner = address(this);
    address public stranger = address(0xCAFE);
    uint64 public constant DELAY = 1 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
    }

    function test_OwnerCanPauseAndUnpause() public {
        assertFalse(pool.paused());

        pool.pause();
        assertTrue(pool.paused());

        pool.unpause();
        assertFalse(pool.paused());
    }

    function test_RevertWhen_NonOwnerCallsPause() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        pool.pause();
    }

    function test_RevertWhen_NonOwnerCallsUnpause() public {
        pool.pause();

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        pool.unpause();
    }

    function test_RevertWhen_DepositWhilePaused() public {
        pool.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        pool.deposit(100);
    }

    function test_RevertWhen_RequestWithdrawalWhilePaused() public {
        pool.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        pool.requestWithdrawal(100);
    }

    function test_RevertWhen_DrawWhilePaused() public {
        pool.pause();

        vm.expectRevert(Pausable.EnforcedPause.selector);
        pool.draw(1_000);
    }
}
