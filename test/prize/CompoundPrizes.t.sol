// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract CompoundPrizesTest is ConfidentialPoolTestBase {
    address internal alice = address(0xA11CE);

    function setUp() public { setUpPool(); }

    function test_CompoundClearsPrizeCounterWithoutChangingPositionOrAggregate() public {
        _deposit(alice, 10_000);
        _fundReserve(address(0xBEEF), 2_000);
        _requestAndFinalizeDraw(10_000, 2_000);
        bytes32 positionBefore = pool.getBalanceHandle(alice);
        bytes32 aggregateBefore = pool.getTotalAccountedBalanceHandle();

        vm.prank(alice);
        pool.compoundPrizes();

        assertEq(pool.getBalanceHandle(alice), positionBefore);
        assertEq(pool.getTotalAccountedBalanceHandle(), aggregateBefore);
        assertEq(pool.getPrizeHandle(alice), bytes32(0));
    }
}
