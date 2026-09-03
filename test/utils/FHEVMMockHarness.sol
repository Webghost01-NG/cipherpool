// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {FHE, CoprocessorConfig} from "@fhevm/solidity/lib/FHE.sol";
import {MockACL} from "../mocks/MockACL.sol";
import {MockFHEVMExecutor} from "../mocks/MockFHEVMExecutor.sol";
import {MockKMSVerifier} from "../mocks/MockKMSVerifier.sol";

/**
 * @title FHEVMMockHarness
 * @notice Utility to initialize the FHEVM mock coprocessor harness for local testing.
 */
contract FHEVMMockHarness is Test {
    MockACL public mockACL;
    MockFHEVMExecutor public mockExecutor;
    MockKMSVerifier public mockKMSVerifier;

    uint256 public constant KMS_SIGNER_KEY = 0xA11CE;
    address public kmsSigner;

    bytes32 internal constant COPROCESSOR_CONFIG_LOCATION =
        0x9e7b61f58c47dc699ac88507c4f5bb9f121c03808c5676a8078fe583e4649700;

    bytes32 private constant DECRYPTION_RESULT_TYPEHASH =
        keccak256("PublicDecryptVerification(bytes32[] ctHandles,bytes decryptedResult,bytes extraData)");

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function setUpMockFHEVM() internal returns (MockACL, MockFHEVMExecutor, MockKMSVerifier) {
        mockACL = new MockACL();
        mockExecutor = new MockFHEVMExecutor();
        mockKMSVerifier = new MockKMSVerifier();

        kmsSigner = vm.addr(KMS_SIGNER_KEY);
        mockKMSVerifier.setSigner(kmsSigner);

        CoprocessorConfig memory config = CoprocessorConfig({
            ACLAddress: address(mockACL),
            CoprocessorAddress: address(mockExecutor),
            KMSVerifierAddress: address(mockKMSVerifier)
        });

        FHE.setCoprocessor(config);

        return (mockACL, mockExecutor, mockKMSVerifier);
    }

    function initContractCoprocessor(address targetContract) internal {
        vm.store(targetContract, COPROCESSOR_CONFIG_LOCATION, bytes32(uint256(uint160(address(mockACL)))));
        vm.store(targetContract, bytes32(uint256(COPROCESSOR_CONFIG_LOCATION) + 1), bytes32(uint256(uint160(address(mockExecutor)))));
        vm.store(targetContract, bytes32(uint256(COPROCESSOR_CONFIG_LOCATION) + 2), bytes32(uint256(uint160(address(mockKMSVerifier)))));
    }

    function generateMockKMSProof(
        bytes32 handle,
        uint64 cleartextAmount
    ) internal returns (bytes memory) {
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = handle;
        bytes memory abiEncodedCleartexts = abi.encode(cleartextAmount);
        bytes memory extraData = "";

        bytes32 domainHash = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("KMSVerifier")),
                keccak256(bytes("1")),
                block.chainid,
                address(mockKMSVerifier)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                DECRYPTION_RESULT_TYPEHASH,
                keccak256(abi.encodePacked(handles)),
                keccak256(abiEncodedCleartexts),
                keccak256(abi.encodePacked(extraData))
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainHash, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(KMS_SIGNER_KEY, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // decryptionProof = numSigners (1 byte) + signature (65 bytes) + extraData
        return abi.encodePacked(uint8(1), signature, extraData);
    }
}
