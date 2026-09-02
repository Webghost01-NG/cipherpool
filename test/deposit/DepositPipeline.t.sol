// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {externalEuint64} from "@fhevm/solidity/lib/FHE.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolEvents} from "../../contracts/interfaces/IPoolEvents.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract DepositPipelineTest is Test, IPoolErrors, IPoolEvents {
    ConfidentialPool public pool;
    MockERC20 public usdc;

    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    uint64 public constant DELAY = 1 days;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);

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
        externalEuint64 mockInputHandle = externalEuint64.wrap(bytes32(uint256(0x111)));
        bytes memory mockProof = hex"1234";

        vm.prank(alice);
        vm.expectRevert(ZeroDepositAmount.selector);
        pool.deposit(mockInputHandle, mockProof, 0);
    }

    function test_InitialPoolState() public {
        assertEq(pool.custodyAsset(), address(usdc));
        assertEq(pool.cancellationDelay(), DELAY);
        assertEq(pool.totalDepositsPlain(), 0);
        assertEq(pool.getParticipantCount(), 0);
        assertEq(pool.currentDrawId(), 0);
    }
}
