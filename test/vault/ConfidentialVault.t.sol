// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ConfidentialVault} from "../../contracts/ConfidentialVault.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract ConfidentialVaultTest is Test, IPoolErrors {
    ConfidentialVault public vault;
    MockERC20 public token;

    address public pool = address(0xBEEF);
    address public stranger = address(0xCAFE);

    function setUp() public {
        token = new MockERC20("USD Coin", "USDC");
        vault = new ConfidentialVault(address(token), pool);

        token.mint(pool, 1_000_000);
        vm.prank(pool);
        token.approve(address(vault), type(uint256).max);
    }

    function test_RevertWhen_InvalidConstructorArgs() public {
        vm.expectRevert(InvalidAssetAddress.selector);
        new ConfidentialVault(address(0), pool);

        vm.expectRevert(InvalidAssetAddress.selector);
        new ConfidentialVault(address(token), address(0));
    }

    function test_DepositToStrategy_Success() public {
        vm.prank(pool);
        vault.depositToStrategy(100_000);

        assertEq(vault.principalDeposited(), 100_000);
        assertEq(vault.totalManagedAssets(), 100_000);
        assertEq(token.balanceOf(address(vault)), 100_000);
    }

    function test_RevertWhen_UnauthorizedDeposit() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(UnauthorizedCaller.selector, stranger));
        vault.depositToStrategy(500);
    }

    function test_WithdrawFromStrategy_Success() public {
        vm.prank(pool);
        vault.depositToStrategy(100_000);

        uint256 poolBalBefore = token.balanceOf(pool);

        vm.prank(pool);
        vault.withdrawFromStrategy(40_000);

        assertEq(vault.principalDeposited(), 60_000);
        assertEq(token.balanceOf(pool), poolBalBefore + 40_000);
    }

    function test_RevertWhen_WithdrawExceedsPrincipal() public {
        vm.prank(pool);
        vault.depositToStrategy(50_000);

        vm.prank(pool);
        vm.expectRevert(abi.encodeWithSelector(InsufficientCustodyBalance.selector, 60_000, 50_000));
        vault.withdrawFromStrategy(60_000);
    }

    function test_HarvestYield_TransfersExcess() public {
        vm.prank(pool);
        vault.depositToStrategy(100_000);

        // Simulate external yield generation (e.g. Aave interest)
        token.mint(address(vault), 5_000);
        assertEq(vault.totalManagedAssets(), 105_000);

        uint256 poolBalBefore = token.balanceOf(pool);

        uint256 harvested = vault.harvestYield();
        assertEq(harvested, 5_000);
        assertEq(token.balanceOf(pool), poolBalBefore + 5_000);
        assertEq(vault.principalDeposited(), 100_000);
        assertEq(vault.totalManagedAssets(), 100_000);
    }
}
