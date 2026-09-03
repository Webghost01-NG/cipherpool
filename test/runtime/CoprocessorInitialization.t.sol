// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoprocessorConfig} from "@fhevm/solidity/lib/Impl.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract CoprocessorInitializationTest is Test {
    bytes32 internal constant COPROCESSOR_CONFIG_LOCATION =
        0x9e7b61f58c47dc699ac88507c4f5bb9f121c03808c5676a8078fe583e4649700;

    function test_ConstructorInitializesSepoliaCoprocessorConfiguration() public {
        vm.chainId(11155111);
        MockERC20 custodyAsset = new MockERC20("USD Coin", "USDC");
        ConfidentialPool pool = new ConfidentialPool(address(custodyAsset), 1 days);
        CoprocessorConfig memory expected = ZamaConfig.getEthereumCoprocessorConfig();

        assertEq(
            address(uint160(uint256(vm.load(address(pool), COPROCESSOR_CONFIG_LOCATION)))),
            expected.ACLAddress,
            "ACL configuration was not initialized"
        );
        assertEq(
            address(uint160(uint256(vm.load(address(pool), bytes32(uint256(COPROCESSOR_CONFIG_LOCATION) + 1))))),
            expected.CoprocessorAddress,
            "executor configuration was not initialized"
        );
        assertEq(
            address(uint160(uint256(vm.load(address(pool), bytes32(uint256(COPROCESSOR_CONFIG_LOCATION) + 2))))),
            expected.KMSVerifierAddress,
            "KMS verifier configuration was not initialized"
        );
    }
}
