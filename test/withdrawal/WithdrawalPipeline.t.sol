// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract WithdrawalPipelineTest is Test, IPoolErrors {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    address public alice = address(0xA11CE);
    uint64 public constant DELAY = 1 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);

        usdc.mint(alice, 100_000);
        vm.prank(alice);
        usdc.approve(address(pool), type(uint256).max);
    }

    function test_RevertWhen_RequestZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(ZeroDepositAmount.selector);
        pool.requestWithdrawal(0);
    }

    function test_RevertWhen_FinalizeWithoutActiveRequest() public {
        bytes memory mockProof = hex"deadbeef";

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NoActiveWithdrawalRequest.selector, alice));
        pool.finalizeWithdrawal(100, mockProof);
    }

    function test_RevertWhen_CancelWithoutActiveRequest() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(NoActiveWithdrawalRequest.selector, alice));
        pool.cancelWithdrawal();
    }
}
