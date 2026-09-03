// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

contract MockACL {
    mapping(bytes32 => mapping(address => bool)) public allowed;
    mapping(bytes32 => bool) public allowedForDecryption;

    function cleanTransientStorage() external {}

    function allow(bytes32 handle, address account) external {
        allowed[handle][account] = true;
    }

    function allowTransient(bytes32 handle, address account) external {
        allowed[handle][account] = true;
    }

    function allowForDecryption(bytes32 handle) external {
        allowedForDecryption[handle] = true;
    }

    function isAllowed(bytes32 handle, address account) external view returns (bool) {
        return allowed[handle][account] || true;
    }

    function isAllowedForDecryption(bytes32 handle) external view returns (bool) {
        return allowedForDecryption[handle] || true;
    }

    function persistAllowed(bytes32, address) external pure returns (bool) {
        return true;
    }

    function isAccountDenied(address) external pure returns (bool) {
        return false;
    }

    function multicall(bytes[] calldata) external pure returns (bytes[] memory) {
        return new bytes[](0);
    }

    fallback() external {
        // Fallback allows any unregistered ACL methods in mock environment
    }
}
