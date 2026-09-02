// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FHE, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

contract FHEVMMockHarnessTest is Test, FHEVMMockHarness {
    function setUp() public {
        setUpMockFHEVM();
    }

    function test_MockHarness_Initialization() public {
        assertTrue(address(mockACL) != address(0));
        assertTrue(address(mockExecutor) != address(0));
        assertTrue(address(mockKMSVerifier) != address(0));
    }

    function test_MockHarness_HomomorphicOperations() public {
        euint64 a = FHE.asEuint64(100);
        euint64 b = FHE.asEuint64(50);

        euint64 sum = FHE.add(a, b);
        assertTrue(FHE.toBytes32(sum) != bytes32(0));

        euint64 diff = FHE.sub(a, b);
        assertTrue(FHE.toBytes32(diff) != bytes32(0));

        ebool isGe = FHE.ge(a, b);
        assertTrue(ebool.unwrap(isGe) != bytes32(0));

        euint64 selected = FHE.select(isGe, a, b);
        assertTrue(FHE.toBytes32(selected) != bytes32(0));
    }
}
