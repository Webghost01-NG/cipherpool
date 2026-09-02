// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, CoprocessorConfig} from "@fhevm/solidity/lib/FHE.sol";
import {MockACL} from "../mocks/MockACL.sol";
import {MockFHEVMExecutor} from "../mocks/MockFHEVMExecutor.sol";
import {MockKMSVerifier} from "../mocks/MockKMSVerifier.sol";

/**
 * @title FHEVMMockHarness
 * @notice Utility to initialize the FHEVM mock coprocessor harness for local testing.
 */
contract FHEVMMockHarness {
    MockACL public mockACL;
    MockFHEVMExecutor public mockExecutor;
    MockKMSVerifier public mockKMSVerifier;

    function setUpMockFHEVM() internal returns (MockACL, MockFHEVMExecutor, MockKMSVerifier) {
        mockACL = new MockACL();
        mockExecutor = new MockFHEVMExecutor();
        mockKMSVerifier = new MockKMSVerifier();

        CoprocessorConfig memory config = CoprocessorConfig({
            ACLAddress: address(mockACL),
            CoprocessorAddress: address(mockExecutor),
            KMSVerifierAddress: address(mockKMSVerifier)
        });

        FHE.setCoprocessor(config);

        return (mockACL, mockExecutor, mockKMSVerifier);
    }
}
