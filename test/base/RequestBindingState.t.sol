// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {RequestBindingState} from "../../contracts/base/RequestBindingState.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {IPoolEvents} from "../../contracts/interfaces/IPoolEvents.sol";

contract HarnessRequestBindingState is RequestBindingState {
    constructor(uint64 delay) RequestBindingState(delay) {}

    function createRequest(
        address user,
        euint64 handle,
        uint64 amount
    ) external returns (bytes32) {
        return _createWithdrawalRequest(user, handle, amount);
    }

    function deleteRequest(address user) external returns (bytes32) {
        return _deleteWithdrawalRequest(user);
    }
}

contract RequestBindingStateTest is Test, IPoolErrors, IPoolEvents {
    HarnessRequestBindingState public harness;
    address public alice = address(0xA11CE);
    address public bob = address(0xB0B);
    uint64 public constant DELAY = 1 days;

    function setUp() public {
        harness = new HarnessRequestBindingState(DELAY);
    }

    function test_CreateWithdrawalRequest_Success() public {
        euint64 mockHandle = euint64.wrap(bytes32(uint256(0x12345)));
        uint64 amount = 1000;

        vm.expectEmit(true, true, true, true);
        bytes32 expectedHash = keccak256(
            abi.encode(
                block.chainid,
                address(harness),
                alice,
                uint256(0),
                amount,
                uint64(block.timestamp),
                FHE.toBytes32(mockHandle)
            )
        );
        emit WithdrawalRequested(alice, 0, expectedHash, amount, FHE.toBytes32(mockHandle));

        bytes32 rHash = harness.createRequest(alice, mockHandle, amount);
        assertEq(rHash, expectedHash);

        IPoolTypes.WithdrawalRequest memory req = harness.getPendingWithdrawal(alice);
        assertTrue(req.active);
        assertEq(req.requestedAmount, amount);
        assertEq(req.timestamp, block.timestamp);
        assertEq(FHE.toBytes32(req.handle), FHE.toBytes32(mockHandle));
        assertEq(req.requestHash, expectedHash);
        assertEq(harness.getUserWithdrawalNonce(alice), 1);
    }

    function test_RevertWhen_ActiveWithdrawalExists() public {
        euint64 mockHandle = euint64.wrap(bytes32(uint256(0x12345)));
        harness.createRequest(alice, mockHandle, 500);

        vm.expectRevert(abi.encodeWithSelector(ActiveWithdrawalExists.selector, alice));
        harness.createRequest(alice, mockHandle, 500);
    }

    function test_DeleteWithdrawalRequest_ZeroesStorage() public {
        euint64 mockHandle = euint64.wrap(bytes32(uint256(0x12345)));
        bytes32 createdHash = harness.createRequest(alice, mockHandle, 500);

        bytes32 consumedHash = harness.deleteRequest(alice);
        assertEq(consumedHash, createdHash);

        IPoolTypes.WithdrawalRequest memory req = harness.getPendingWithdrawal(alice);
        assertFalse(req.active);
        assertEq(req.requestedAmount, 0);
        assertEq(req.timestamp, 0);
        assertEq(FHE.toBytes32(req.handle), bytes32(0));
        assertEq(req.requestHash, bytes32(0));
    }

    function test_MonotonicNonceIncrement() public {
        euint64 h1 = euint64.wrap(bytes32(uint256(0x111)));
        euint64 h2 = euint64.wrap(bytes32(uint256(0x222)));

        bytes32 hash1 = harness.createRequest(alice, h1, 100);
        assertEq(harness.getUserWithdrawalNonce(alice), 1);

        harness.deleteRequest(alice);

        bytes32 hash2 = harness.createRequest(alice, h2, 100);
        assertEq(harness.getUserWithdrawalNonce(alice), 2);

        assertTrue(hash1 != hash2);
    }
}
