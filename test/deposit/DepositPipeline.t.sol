// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolEvents} from "../../contracts/interfaces/IPoolEvents.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

contract DepositPipelineTest is Test, FHEVMMockHarness, IPoolErrors, IPoolEvents {
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

        usdc.mint(alice, 100_000);
        usdc.mint(bob, 100_000);

        vm.prank(alice);
        usdc.approve(address(pool), type(uint256).max);

        vm.prank(bob);
        usdc.approve(address(pool), type(uint256).max);
    }

    function test_RevertWhen_InvalidAssetAddress() public {
        vm.expectRevert(InvalidAssetAddress.selector);
        new ConfidentialPool(address(0), DELAY);
    }

    function test_RevertWhen_ZeroDepositAmount() public {
        vm.prank(alice);
        vm.expectRevert(ZeroDepositAmount.selector);
        pool.deposit(0);
    }

    function test_DepositUsesCustodyAmountForEncryptedCredit() public {
        uint64 amount = 25_000;

        vm.prank(alice);
        pool.deposit(amount);

        assertEq(pool.totalDepositsPlain(), amount);
        assertEq(usdc.balanceOf(address(pool)), amount);
        assertEq(pool.getBalanceHandle(alice), bytes32(uint256(amount)));
        assertEq(pool.userDepositNonces(alice), 1);
    }

    function test_AdversaryCannotSupplyIndependentEncryptedAmount() public {
        bytes memory legacyMismatchCall =
            abi.encodeWithSignature("deposit(bytes32,bytes,uint64)", bytes32(uint256(1_000_000)), hex"1234", uint64(1));

        vm.prank(alice);
        (bool succeeded,) = address(pool).call(legacyMismatchCall);

        assertFalse(succeeded);
        assertEq(pool.totalDepositsPlain(), 0);
        assertEq(usdc.balanceOf(address(pool)), 0);
        assertEq(pool.getBalanceHandle(alice), bytes32(0));
    }

    function test_InitialPoolState() public {
        assertEq(pool.custodyAsset(), address(usdc));
        assertEq(pool.cancellationDelay(), DELAY);
        assertEq(pool.totalDepositsPlain(), 0);
        assertEq(pool.getParticipantCount(), 0);
        assertEq(pool.currentDrawId(), 0);
    }
}
