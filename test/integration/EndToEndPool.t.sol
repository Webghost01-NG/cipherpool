// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract EndToEndPoolTest is ConfidentialPoolTestBase {
    uint256 internal constant USER_COUNT = 10;
    address[USER_COUNT] internal users;

    function setUp() public {
        setUpPool();
        for (uint256 i = 0; i < USER_COUNT; i++) users[i] = address(uint160(0x1000 + i));
    }

    function test_EndToEnd_EncryptedDepositsDrawAndWithdrawals() public {
        for (uint256 i = 0; i < USER_COUNT; i++) {
            _deposit(users[i], 10_000);
            assertTrue(pool.isParticipant(users[i]));
        }
        assertEq(pool.getParticipantCount(), USER_COUNT);

        _fundReserve(address(0xBEEF), 4_000);
        _requestAndFinalizeDraw(100_000, 4_000);
        _requestAndFinalizeDraw(100_500, 3_500);
        _requestAndFinalizeDraw(101_000, 3_000);
        assertEq(pool.currentDrawId(), 3);
        assertEq(pool.lastVerifiedTotalAccountedBalance(), 101_500);
        assertEq(pool.lastVerifiedPrizeReserve(), 2_500);

        _withdraw(users[0], 4_000);
        _withdraw(users[1], 10_000);
        assertEq(pool.userWithdrawalNonces(users[0]), 1);
        assertEq(pool.userWithdrawalNonces(users[1]), 1);
    }
}
