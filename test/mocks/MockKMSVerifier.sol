// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

contract MockKMSVerifier {
    address[] public signers;
    uint256 public threshold = 1;

    constructor() {
        signers.push(msg.sender);
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
