// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {FHE, CoprocessorConfig} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialPool} from "../contracts/ConfidentialPool.sol";

/**
 * @title DeploySepolia
 * @notice Sepolia deployment script with strict Zama and official cUSDC address verification.
 */
contract DeploySepolia is Script {
    // Canonical Sepolia Addresses for Zama fhEVM Protocol
    address public constant SEPOLIA_ACL = 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D;
    address public constant SEPOLIA_COPROCESSOR = 0x92C920834Ec8941d2C77D188936E1f7A6f49c127;
    address public constant SEPOLIA_KMS_VERIFIER = 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A;

    // Official Zama ERC-7984 confidential USDC mock on Ethereum Sepolia.
    address public constant SEPOLIA_CUSDC = 0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639;
    uint64 public constant CANCELLATION_DELAY = 1 days;

    function run() external returns (address poolAddress) {
        console.log("=== CipherPool Sepolia Deployment ===");
        console.log("Deployer Address:", msg.sender);
        console.log("Chain ID:", block.chainid);

        // 1. Verify ZamaConfig addresses on Sepolia
        if (block.chainid == 11155111) {
            CoprocessorConfig memory zamaCfg = ZamaConfig.getCoprocessorConfig();
            require(zamaCfg.ACLAddress == SEPOLIA_ACL, "ACL address mismatch with ZamaConfig");
            require(zamaCfg.CoprocessorAddress == SEPOLIA_COPROCESSOR, "Coprocessor address mismatch with ZamaConfig");
            require(zamaCfg.KMSVerifierAddress == SEPOLIA_KMS_VERIFIER, "KMSVerifier address mismatch with ZamaConfig");
            require(SEPOLIA_CUSDC.code.length > 0, "official cUSDC deployment is missing");
            console.log("ZamaConfig addresses successfully verified against Sepolia canonicals.");
        } else {
            console.log("Non-Sepolia chain detected. Skipping strict Sepolia address check.");
        }

        vm.startBroadcast();

        // 2. Deploy ConfidentialPool
        ConfidentialPool pool = new ConfidentialPool(SEPOLIA_CUSDC, CANCELLATION_DELAY);
        poolAddress = address(pool);
        console.log("ConfidentialPool deployed at:", poolAddress);

        vm.stopBroadcast();

        console.log("Deployment completed successfully.");
    }
}
