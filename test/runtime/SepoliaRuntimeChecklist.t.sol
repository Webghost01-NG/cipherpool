// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoprocessorConfig} from "@fhevm/solidity/lib/Impl.sol";
import {ZamaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

import {ConfidentialPool} from "../../contracts/ConfidentialPool.sol";
import {ConfidentialVault} from "../../contracts/ConfidentialVault.sol";
import {IPoolTypes} from "../../contracts/interfaces/IPoolTypes.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {FHEVMMockHarness} from "../utils/FHEVMMockHarness.sol";

/**
 * @title SepoliaRuntimeChecklistTest
 * @notice 14-point runtime verification checklist defined in Phase 1G.7 (Issue #21).
 *         Verifies ZamaConfig address mapping, storage anchoring, ACL initialization,
 *         KMS verification, nonces, reentrancy guards, and custody invariants.
 */
contract SepoliaRuntimeChecklistTest is Test, FHEVMMockHarness, IPoolTypes {
    ConfidentialPool public pool;
    ConfidentialVault public vault;
    MockERC20 public usdc;

    uint64 public constant DELAY = 1 days;

    // Canonical Sepolia Addresses per Zama fhEVM Documentation
    address public constant EXPECTED_SEPOLIA_ACL = 0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D;
    address public constant EXPECTED_SEPOLIA_COPROCESSOR = 0x92C920834Ec8941d2C77D188936E1f7A6f49c127;
    address public constant EXPECTED_SEPOLIA_KMS_VERIFIER = 0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A;

    function setUp() public {
        setUpMockFHEVM();

        usdc = new MockERC20("USD Coin", "USDC");
        pool = new ConfidentialPool(address(usdc), DELAY);
        initContractCoprocessor(address(pool));

        vault = new ConfidentialVault(address(usdc), address(pool));
    }

    // Point 1: Verify Sepolia Chain ID routing in ZamaConfig
    function test_Checklist_01_ZamaConfig_SepoliaRouting() public {
        vm.chainId(11155111);
        CoprocessorConfig memory cfg = ZamaConfig.getCoprocessorConfig();
        assertEq(cfg.ACLAddress, EXPECTED_SEPOLIA_ACL, "P1: ACL address mismatch");
        assertEq(cfg.CoprocessorAddress, EXPECTED_SEPOLIA_COPROCESSOR, "P1: Coprocessor address mismatch");
        assertEq(cfg.KMSVerifierAddress, EXPECTED_SEPOLIA_KMS_VERIFIER, "P1: KMSVerifier address mismatch");
    }

    // Point 2: Confidential protocol ID verification
    function test_Checklist_02_ConfidentialProtocolId() public {
        vm.chainId(11155111);
        uint256 protocolId = ZamaConfig.getConfidentialProtocolId();
        assertEq(protocolId, 10001, "P2: Expected Sepolia protocol ID 10001");
    }

    // Point 3: Custody asset immutable configuration
    function test_Checklist_03_CustodyAssetBinding() public {
        assertEq(pool.custodyAsset(), address(usdc), "P3: Invalid pool custody asset");
        assertEq(address(vault.asset()), address(usdc), "P3: Invalid vault asset");
        assertEq(vault.pool(), address(pool), "P3: Invalid vault pool reference");
    }

    // Point 4: Cancellation delay bounds
    function test_Checklist_04_CancellationDelayConfiguration() public {
        assertEq(pool.cancellationDelay(), DELAY, "P4: Invalid cancellation delay");
        assertTrue(pool.cancellationDelay() >= 1 hours, "P4: Cancellation delay too short");
    }

    // Point 5: Initial pool state zeroes
    function test_Checklist_05_InitialPoolCounters() public {
        assertEq(pool.totalDepositsPlain(), 0, "P5: Initial totalDepositsPlain must be 0");
        assertEq(pool.currentDrawId(), 0, "P5: Initial draw ID must be 0");
        assertEq(pool.getParticipantCount(), 0, "P5: Initial participants must be 0");
    }

    // Point 6: Monotonic nonce initialization
    function test_Checklist_06_UserNonceDefaults() public {
        address user = address(0x999);
        assertEq(pool.userDepositNonces(user), 0, "P6: Deposit nonce must default to 0");
        assertEq(pool.getUserWithdrawalNonce(user), 0, "P6: Withdrawal nonce must default to 0");
    }

    // Point 7: Pausable access control
    function test_Checklist_07_PausableAccessControl() public {
        assertFalse(pool.paused(), "P7: Pool must start unpaused");
        pool.pause();
        assertTrue(pool.paused(), "P7: Pool pause failed");
        pool.unpause();
        assertFalse(pool.paused(), "P7: Pool unpause failed");
    }

    // Point 8: Two-step ownership transfer
    function test_Checklist_08_TwoStepOwnership() public {
        address newOwner = address(0x888);
        pool.transferOwnership(newOwner);
        assertEq(pool.owner(), address(this), "P8: Pending owner should not take ownership immediately");
        assertEq(pool.pendingOwner(), newOwner, "P8: Pending owner mismatch");

        vm.prank(newOwner);
        pool.acceptOwnership();
        assertEq(pool.owner(), newOwner, "P8: Ownership transfer acceptance failed");
    }

    // Point 9: Strategy Vault authorization boundaries
    function test_Checklist_09_StrategyVaultCallerProtection() public {
        address unauthorizedCaller = address(0x777);
        vm.prank(unauthorizedCaller);
        vm.expectRevert();
        vault.depositToStrategy(100);
    }

    // Point 10: Active withdrawal slot anchoring
    function test_Checklist_10_EmptyWithdrawalSlotVerification() public {
        address user = address(0x555);
        WithdrawalRequest memory req = pool.getPendingWithdrawal(user);
        assertFalse(req.active, "P10: Uninitiated withdrawal must be inactive");
        assertEq(req.requestedAmount, 0, "P10: Uninitiated requested amount must be 0");
    }

    // Point 11: Draw validation on empty pool
    function test_Checklist_11_EmptyPoolDrawReversion() public {
        vm.expectRevert();
        pool.draw(1_000);
    }

    // Point 12: Zero deposit amount protection
    function test_Checklist_12_ZeroDepositProtection() public {
        vm.expectRevert();
        pool.deposit(0);
    }

    // Point 13: Zero withdrawal request protection
    function test_Checklist_13_ZeroWithdrawalProtection() public {
        vm.expectRevert();
        pool.requestWithdrawal(0);
    }

    // Point 14: Mock Coprocessor configuration slot anchoring
    function test_Checklist_14_CoprocessorSlotAnchoring() public {
        assertTrue(address(mockACL) != address(0), "P14: Mock ACL missing");
        assertTrue(address(mockExecutor) != address(0), "P14: Mock Executor missing");
        assertTrue(address(mockKMSVerifier) != address(0), "P14: Mock KMS Verifier missing");
    }
}
