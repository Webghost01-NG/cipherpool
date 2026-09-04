// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {CoprocessorConfig} from "@fhevm/solidity/lib/Impl.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ConfidentialPoolTestBase} from "../utils/ConfidentialPoolTestBase.sol";

contract SepoliaRuntimeChecklistTest is ConfidentialPoolTestBase {
    address internal constant EXPECTED_SEPOLIA_ACL = 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D;
    address internal constant EXPECTED_SEPOLIA_COPROCESSOR = 0x92C920834Ec8941d2C77D188936E1f7A6f49c127;
    address internal constant EXPECTED_SEPOLIA_KMS_VERIFIER = 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A;

    function setUp() public { setUpPool(); }

    function test_ZamaConfigSepoliaRouting() public {
        vm.chainId(11155111);
        CoprocessorConfig memory cfg = ZamaConfig.getCoprocessorConfig();
        assertEq(cfg.ACLAddress, EXPECTED_SEPOLIA_ACL);
        assertEq(cfg.CoprocessorAddress, EXPECTED_SEPOLIA_COPROCESSOR);
        assertEq(cfg.KMSVerifierAddress, EXPECTED_SEPOLIA_KMS_VERIFIER);
        assertEq(ZamaConfig.getConfidentialProtocolId(), 10001);
    }

    function test_InitialStateAndCustodyBinding() public {
        assertEq(pool.custodyAsset(), address(token));
        assertEq(pool.drawCancellationDelay(), DELAY);
        assertEq(pool.currentDrawId(), 0);
        assertEq(pool.getParticipantCount(), 0);
        assertEq(pool.lastVerifiedTotalAccountedBalance(), 0);
        assertEq(pool.lastVerifiedPrizeReserve(), 0);
    }

    function test_ConfidentialActionsAreStableDomainSeparators() public {
        assertEq(pool.DEPOSIT_ACTION(), keccak256("CIPHERPOOL_DEPOSIT_V1"));
        assertEq(pool.PRIZE_RESERVE_ACTION(), keccak256("CIPHERPOOL_PRIZE_RESERVE_V1"));
        assertTrue(pool.DEPOSIT_ACTION() != pool.PRIZE_RESERVE_ACTION());
    }

    function test_CoprocessorMocksAreAnchored() public {
        assertTrue(address(mockACL) != address(0));
        assertTrue(address(mockExecutor) != address(0));
        assertTrue(address(mockKMSVerifier) != address(0));
    }
}
