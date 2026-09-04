// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {IPoolErrors} from "../../contracts/interfaces/IPoolErrors.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract DepositPipelineTest is ConfidentialPoolTestBase, IPoolErrors {
    address internal alice = address(0xA11CE);

    function setUp() public { setUpPool(); }

    function test_RevertWhen_InvalidAssetAddress() public {
        vm.expectRevert(InvalidAssetAddress.selector);
        new ConfidentialPool(address(0), DELAY, DRAW_INTERVAL, DRAW_PRIZE);
    }

    function test_RevertWhen_InvalidCancellationDelay() public {
        vm.expectRevert(InvalidCancellationDelay.selector);
        new ConfidentialPool(address(token), 0, DRAW_INTERVAL, DRAW_PRIZE);
    }

    function test_RevertWhen_DrawIntervalCannotGuaranteeRecoveryWindow() public {
        uint64 unsafeInterval = (DELAY * 2) - 1;
        vm.expectRevert(abi.encodeWithSelector(
            InvalidDrawInterval.selector,
            uint256(unsafeInterval),
            uint256(DELAY) * 2
        ));
        new ConfidentialPool(address(token), DELAY, unsafeInterval, DRAW_PRIZE);
    }

    function test_RevertWhen_FixedPrizeIsZero() public {
        vm.expectRevert(ZeroPrizeAmount.selector);
        new ConfidentialPool(address(token), DELAY, DRAW_INTERVAL, 0);
    }

    function test_DepositCreditsOnlyTokenReturnedEncryptedAmount() public {
        _depositWithoutActivation(alice, 25_000);
        assertEq(pool.userDepositNonces(alice), 1);
        assertEq(pool.getParticipantCount(), 0);
        assertFalse(pool.isParticipant(alice));
        assertTrue(pool.getPendingParticipantActivation(alice).active);
        assertTrue(pool.getBalanceHandle(alice) != bytes32(0));
        assertEq(pool.getTotalEligibleBalanceHandle(), bytes32(0));

        _finalizeParticipantActivation(alice, true);
        assertEq(pool.getParticipantCount(), 1);
        assertTrue(pool.isParticipant(alice));
        assertTrue(pool.getTotalEligibleBalanceHandle() != bytes32(0));
    }

    function test_LegacyPlaintextDepositEntryPointDoesNotExist() public {
        vm.prank(alice);
        (bool succeeded,) = address(pool).call(abi.encodeWithSignature("deposit(uint64)", uint64(10_000)));
        assertFalse(succeeded);
        assertEq(pool.userDepositNonces(alice), 0);
    }

    function test_InvalidCallbackActionCannotCreateCredit() public {
        externalEuint64 encryptedAmount = _externalAmount(1_000);
        vm.prank(alice);
        token.confidentialTransferAndCall(address(pool), encryptedAmount, "", abi.encode(bytes32("INVALID")));
        assertEq(pool.userDepositNonces(alice), 0);
        assertEq(pool.getParticipantCount(), 0);
    }
}
