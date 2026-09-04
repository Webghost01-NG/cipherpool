// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract MockKMSVerifier {
    bytes32 private constant DECRYPTION_RESULT_TYPEHASH =
        keccak256("PublicDecryptVerification(bytes32[] ctHandles,bytes decryptedResult,bytes extraData)");
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    address[] public signers;
    uint256 public threshold = 1;
    address public signerAddress;

    constructor() {
        signerAddress = 0xe05fcC23807536bEe418f142D19fa0d21BB0cfF7;
        signers.push(signerAddress);
    }

    function setSigner(address _signer) external {
        signerAddress = _signer;
        signers = new address[](1);
        signers[0] = _signer;
    }

    function eip712Domain()
        external
        view
        returns (
            bytes1 fields,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            bytes32 salt,
            uint256[] memory extensions
        )
    {
        return (
            bytes1(0x0f),
            "KMSVerifier",
            "1",
            block.chainid,
            address(this),
            bytes32(0),
            new uint256[](0)
        );
    }

    function getContextSignersAndThresholdFromExtraData(
        bytes calldata
    ) external view returns (address[] memory, uint256) {
        return (signers, threshold);
    }

    function verifyDecryptionEIP712KMSSignatures(
        bytes32[] memory handles,
        bytes memory decryptedResult,
        bytes memory decryptionProof
    ) external view returns (bool) {
        if (decryptionProof.length < 66 || uint8(decryptionProof[0]) != 1) return false;

        bytes memory signature = new bytes(65);
        for (uint256 i = 0; i < 65; i++) signature[i] = decryptionProof[i + 1];

        uint256 extraDataLength = decryptionProof.length - 66;
        bytes memory extraData = new bytes(extraDataLength);
        for (uint256 i = 0; i < extraDataLength; i++) extraData[i] = decryptionProof[i + 66];

        bytes32 domainHash = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes("KMSVerifier")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(
                DECRYPTION_RESULT_TYPEHASH,
                keccak256(abi.encodePacked(handles)),
                keccak256(decryptedResult),
                keccak256(extraData)
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainHash, structHash));

        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(digest, signature);
        return error == ECDSA.RecoverError.NoError && recovered == signerAddress;
    }

    function verifyDecryptionEIP712KMSSignatures(
        bytes32,
        bytes memory,
        bytes memory,
        bytes memory
    ) external pure returns (bool) {
        return true;
    }

    function getKMSSigners() external view returns (address[] memory, uint256) {
        return (signers, threshold);
    }

    fallback() external {
        // Fallback allows mock verification
    }
}
