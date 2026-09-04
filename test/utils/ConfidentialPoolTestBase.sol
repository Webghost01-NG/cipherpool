// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {MockERC7984} from "../mocks/MockERC7984.sol";
import {FHEVMMockHarness} from "./FHEVMMockHarness.sol";

abstract contract ConfidentialPoolTestBase is FHEVMMockHarness {
    ConfidentialPool internal pool;
    MockERC7984 internal token;
    uint64 internal constant DELAY = 1 days;
    uint64 internal constant DRAW_INTERVAL = 7 days;
    uint64 internal constant DRAW_PRIZE = 500;

    function setUpPool() internal {
        setUpMockFHEVM();
        token = new MockERC7984();
        pool = new ConfidentialPool(address(token), DELAY, DRAW_INTERVAL, DRAW_PRIZE);
        initContractCoprocessor(address(token));
        initContractCoprocessor(address(pool));
    }

    function _externalAmount(uint64 amount) internal returns (externalEuint64) {
        return externalEuint64.wrap(FHE.toBytes32(_encryptedAmount(amount)));
    }

    function _encryptedAmount(uint64 amount) internal returns (euint64) {
        return FHE.asEuint64(amount);
    }

    function _deposit(address user, uint64 amount) internal {
        _depositWithoutActivation(user, amount);
        if (amount > 0 && !pool.isParticipant(user)) _finalizeParticipantActivation(user, true);
    }

    function _depositWithoutActivation(address user, uint64 amount) internal {
        externalEuint64 encryptedAmount = _externalAmount(amount);
        bytes memory action = abi.encode(pool.DEPOSIT_ACTION());
        vm.prank(user);
        token.confidentialTransferAndCall(address(pool), encryptedAmount, "", action);
    }

    function _finalizeParticipantActivation(address user, bool eligible) internal {
        ebool eligibilityHandle = pool.getPendingParticipantActivation(user).eligibilityHandle;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(eligibilityHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(eligible));
        pool.finalizeParticipantActivation(user, eligible, proof);
    }

    function _finalizeParticipantDeactivation(address user, bool zeroBalance) internal {
        ebool zeroBalanceHandle = pool.getPendingParticipantDeactivation(user).zeroBalanceHandle;
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(zeroBalanceHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(zeroBalance));
        pool.finalizeParticipantDeactivation(user, zeroBalance, proof);
    }

    function _fundReserve(address source, uint64 amount) internal {
        externalEuint64 encryptedAmount = _externalAmount(amount);
        bytes memory action = abi.encode(pool.PRIZE_RESERVE_ACTION());
        vm.prank(source);
        token.confidentialTransferAndCall(address(pool), encryptedAmount, "", action);
    }

    function _withdraw(address user, uint64 amount) internal {
        externalEuint64 encryptedAmount = _externalAmount(amount);
        vm.prank(user);
        pool.withdraw(encryptedAmount, "");
    }

    function _requestAndFinalizeDraw(uint64 total, uint64 reserve) internal {
        uint64 eligibleTimestamp = pool.nextDrawRequestTimestamp();
        if (block.timestamp < eligibleTimestamp) vm.warp(eligibleTimestamp);
        pool.requestDraw(DRAW_PRIZE);
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(pool.getPendingDraw().totalHandle);
        handles[1] = FHE.toBytes32(pool.getPendingDraw().reserveHandle);
        bytes memory proof = generateMockKMSProof(handles, abi.encode(total, reserve));
        pool.finalizeDraw(total, reserve, proof);
    }
}
