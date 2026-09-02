// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

contract MockFHEVMExecutor {
    uint256 private _nonce;

    function verify(bytes32 inputHandle, bytes memory, uint8) external returns (bytes32) {
        return inputHandle;
    }

    function fheAdd(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("add", lhs, rhs, ++_nonce));
    }

    function fheSub(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("sub", lhs, rhs, ++_nonce));
    }

    function fheMul(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("mul", lhs, rhs, ++_nonce));
    }

    function fheDiv(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("div", lhs, rhs, ++_nonce));
    }

    function fheRem(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("rem", lhs, rhs, ++_nonce));
    }

    function fheGe(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("ge", lhs, rhs, ++_nonce));
    }

    function fheGt(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("gt", lhs, rhs, ++_nonce));
    }

    function fheLt(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("lt", lhs, rhs, ++_nonce));
    }

    function fheLe(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("le", lhs, rhs, ++_nonce));
    }

    function fheEq(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("eq", lhs, rhs, ++_nonce));
    }

    function fheNe(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("ne", lhs, rhs, ++_nonce));
    }

    function fheBitAnd(bytes32 lhs, bytes32 rhs, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("and", lhs, rhs, ++_nonce));
    }

    function fheSelect(bytes32 control, bytes32 ifTrue, bytes32 ifFalse) external returns (bytes32) {
        return keccak256(abi.encodePacked("select", control, ifTrue, ifFalse, ++_nonce));
    }

    function fheRand(bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("rand", ++_nonce));
    }

    function fheRandBounded(bytes32 upperBound, bytes1) external returns (bytes32) {
        return keccak256(abi.encodePacked("randBounded", upperBound, ++_nonce));
    }

    function cast(bytes32 handle, bytes1) external returns (bytes32) {
        return handle;
    }

    function trivialEncrypt(uint256 val, bytes1) external returns (bytes32) {
        return bytes32(val);
    }

    function getInputVerifierAddress() external view returns (address) {
        return address(this);
    }

    fallback() external {
        // Fallback returns deterministic mock handles
        assembly {
            mstore(0x00, 0x01)
            return(0x00, 0x20)
        }
    }
}
