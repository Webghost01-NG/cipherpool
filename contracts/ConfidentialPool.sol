// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, euint128, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {IConfidentialPool} from "./interfaces/IConfidentialPool.sol";
import {IERC7984} from "./interfaces/IERC7984.sol";
import {IERC7984Receiver} from "./interfaces/IERC7984Receiver.sol";

/**
 * @title ConfidentialPool
 * @notice ERC-7984 prize savings pool with encrypted deposits, balances, withdrawals, and prizes.
 * @dev Individual and aggregate amounts never enter plaintext draw calldata. A single readiness
 *      predicate authorizes encrypted-bound winner selection over encrypted cumulative balances.
 */
contract ConfidentialPool is
    IConfidentialPool,
    IERC7984Receiver,
    ReentrancyGuard,
    Ownable2Step,
    Pausable,
    ZamaEthereumConfig
{
    bytes32 public constant DEPOSIT_ACTION = keccak256("VEYLOTT_DEPOSIT_V1");
    bytes32 public constant PRIZE_RESERVE_ACTION = keccak256("VEYLOTT_PRIZE_RESERVE_V1");
    uint256 public constant override MAX_PARTICIPANTS = 12;
    bool public constant withdrawalSnapshotsEnabled = true;

    address public immutable override custodyAsset;
    uint64 internal immutable _drawCancellationDelay;
    uint64 public immutable override drawInterval;
    uint64 public immutable override drawPrizeAmount;

    mapping(address => euint64) internal _balances;
    mapping(address => euint64) internal _prizes;
    mapping(address => bool) internal _positionInitialized;

    euint64 internal _totalAccountedBalance;
    euint64 internal _totalEligibleBalance;
    euint64 internal _prizeReserve;
    bool internal _totalInitialized;
    bool internal _eligibleTotalInitialized;
    bool internal _reserveInitialized;

    address[] public participants;
    mapping(address => bool) public isParticipant;
    mapping(address => uint256) internal _participantIndexPlusOne;
    mapping(address => uint256) public userDepositNonces;
    mapping(address => uint256) public userWithdrawalNonces;
    mapping(address => uint256) public participantActivationNonces;
    mapping(address => uint256) public participantDeactivationNonces;
    mapping(address => ParticipantActivationRequest) internal _pendingParticipantActivations;
    mapping(address => ParticipantDeactivationRequest) internal _pendingParticipantDeactivations;

    DrawRequest internal _pendingDraw;
    // Membership remains locked during a draw; encrypted weights do not change when users exit.
    mapping(address => euint64) internal _drawWeights;
    uint256 public drawRequestNonce;
    uint64 public override nextDrawRequestTimestamp;
    uint256 public override currentDrawId;
    bool public override lastDrawReady;
    uint64 public override lastDrawVerificationTimestamp;

    constructor(
        address confidentialAsset,
        uint64 cancellationDelay,
        uint64 minimumDrawInterval,
        uint64 fixedPrizeAmount
    ) Ownable(msg.sender) {
        if (confidentialAsset == address(0)) revert InvalidAssetAddress();
        if (cancellationDelay == 0) revert InvalidCancellationDelay();
        uint256 minimumSafeInterval = uint256(cancellationDelay) * 2;
        if (minimumDrawInterval < minimumSafeInterval) {
            revert InvalidDrawInterval(minimumDrawInterval, minimumSafeInterval);
        }
        if (fixedPrizeAmount == 0) revert ZeroPrizeAmount();
        custodyAsset = confidentialAsset;
        _drawCancellationDelay = cancellationDelay;
        drawInterval = minimumDrawInterval;
        drawPrizeAmount = fixedPrizeAmount;
        nextDrawRequestTimestamp = uint64(block.timestamp);
    }

    modifier whenBalanceUpdatesUnlocked() {
        if (_pendingDraw.active) revert BalanceUpdatesLocked(_pendingDraw.requestHash);
        _;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Accepts an official ERC-7984 transfer callback and credits its actual encrypted result.
     * @dev Call `confidentialTransferAndCall` on the custody token with DEPOSIT_ACTION or
     *      PRIZE_RESERVE_ACTION encoded as a bytes32 value.
     */
    function onConfidentialTransferReceived(address, address from, euint64 amount, bytes calldata data)
        external
        override
        nonReentrant
        returns (ebool)
    {
        if (msg.sender != custodyAsset) revert UnauthorizedTokenCallback(msg.sender);
        if (paused() || _pendingDraw.active || data.length != 32) return _callbackResult(false);

        bytes32 action = abi.decode(data, (bytes32));
        if (action == DEPOSIT_ACTION) {
            if (!isParticipant[from] && participants.length >= MAX_PARTICIPANTS) {
                return _callbackResult(false);
            }
            _creditDeposit(from, amount);
            return _callbackResult(true);
        }
        if (action == PRIZE_RESERVE_ACTION) {
            _creditPrizeReserve(from, amount);
            return _callbackResult(true);
        }
        return _callbackResult(false);
    }

    /**
     * @notice Withdraws up to an encrypted requested amount to the caller as ERC-7984 tokens.
     * @dev Accounting is reduced by the token's returned actual transfer amount, so a silent
     *      zero transfer cannot erase the user's claim.
     */
    function withdraw(externalEuint64 encryptedAmount, bytes calldata inputProof)
        external
        override
        nonReentrant
    {
        if (!_positionInitialized[msg.sender]) revert NoBalancePosition(msg.sender);

        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 approved = FHE.select(FHE.ge(_balances[msg.sender], requested), requested, FHE.asEuint64(0));
        FHE.allowTransient(approved, custodyAsset);
        euint64 transferred = IERC7984(custodyAsset).confidentialTransfer(msg.sender, approved);

        _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferred);
        euint64 prizeDebit = FHE.select(FHE.le(_prizes[msg.sender], transferred), _prizes[msg.sender], transferred);
        _prizes[msg.sender] = FHE.sub(_prizes[msg.sender], prizeDebit);
        _totalAccountedBalance = FHE.sub(_totalAccountedBalance, transferred);
        if (isParticipant[msg.sender]) {
            _totalEligibleBalance = FHE.sub(_totalEligibleBalance, transferred);
            _totalEligibleBalance = FHE.allowThis(_totalEligibleBalance);
            _requestParticipantDeactivation(msg.sender);
        } else {
            _requestParticipantActivation(msg.sender);
        }

        _allowPosition(msg.sender);
        _totalAccountedBalance = FHE.allowThis(_totalAccountedBalance);
        emit Withdrawn(msg.sender, userWithdrawalNonces[msg.sender]++, FHE.toBytes32(transferred));
    }

    /**
     * @notice Requests a fresh KMS zero-balance check so an unused draw slot can be reclaimed.
     */
    function requestParticipantDeactivation() external override nonReentrant whenBalanceUpdatesUnlocked {
        if (!isParticipant[msg.sender]) revert ParticipantNotActive(msg.sender);
        _requestParticipantDeactivation(msg.sender);
    }

    /**
     * @notice Permissionlessly verifies whether a deposited position is positive before admission.
     * @dev The KMS reveals only the encrypted eligibility predicate. Any balance mutation replaces
     *      the pending handle, so a proof for stale position state cannot activate the participant.
     */
    function finalizeParticipantActivation(address user, bool eligible, bytes calldata decryptionProof)
        external
        override
        nonReentrant
        whenBalanceUpdatesUnlocked
    {
        if (isParticipant[user]) revert ParticipantAlreadyActive(user);
        ParticipantActivationRequest memory request = _pendingParticipantActivations[user];
        if (!request.active) revert NoActiveParticipantActivation(user);

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(request.eligibilityHandle);
        FHE.checkSignatures(handles, abi.encode(eligible), decryptionProof);

        delete _pendingParticipantActivations[user];
        if (eligible) {
            if (participants.length >= MAX_PARTICIPANTS) {
                revert ParticipantCapacityReached(MAX_PARTICIPANTS);
            }
            isParticipant[user] = true;
            participants.push(user);
            _participantIndexPlusOne[user] = participants.length;
            if (!_eligibleTotalInitialized) {
                _eligibleTotalInitialized = true;
                _totalEligibleBalance = _balances[user];
            } else {
                _totalEligibleBalance = FHE.add(_totalEligibleBalance, _balances[user]);
            }
            _totalEligibleBalance = FHE.allowThis(_totalEligibleBalance);
        }
        emit ParticipantActivationFinalized(user, request.requestHash, eligible, participants.length);
    }

    /**
     * @notice Permissionlessly removes a participant after KMS verifies a zero saved position.
     * @dev Any later balance mutation invalidates the pending request before changing its handle.
     *      Swap-and-pop keeps admission O(1) while reclaiming one of the bounded draw slots.
     */
    function finalizeParticipantDeactivation(address user, bool zeroBalance, bytes calldata decryptionProof)
        external
        override
        nonReentrant
        whenBalanceUpdatesUnlocked
    {
        if (!isParticipant[user]) revert ParticipantNotActive(user);
        ParticipantDeactivationRequest memory request = _pendingParticipantDeactivations[user];
        if (!request.active) revert NoActiveParticipantDeactivation(user);

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(request.zeroBalanceHandle);
        FHE.checkSignatures(handles, abi.encode(zeroBalance), decryptionProof);

        delete _pendingParticipantDeactivations[user];
        if (zeroBalance) _removeParticipant(user);
        emit ParticipantDeactivationFinalized(user, request.requestHash, zeroBalance, participants.length);
    }

    /**
     * @notice Permissionlessly anchors aggregate encrypted state for a policy-sized prize draw.
     * @dev The immutable prize and cadence remove caller discretion. The cadence is at least twice
     *      the cancellation delay, guaranteeing an unlocked recovery window after a timeout.
     */
    function requestDraw(uint64 prizeAmount) external override whenNotPaused nonReentrant {
        if (_pendingDraw.active) revert ActiveDrawRequestExists(_pendingDraw.requestHash);
        if (prizeAmount != drawPrizeAmount) {
            revert InvalidDrawPrizeAmount(prizeAmount, drawPrizeAmount);
        }
        uint64 eligibleTimestamp = nextDrawRequestTimestamp;
        if (block.timestamp < eligibleTimestamp) {
            revert DrawRequestTooEarly(block.timestamp, eligibleTimestamp);
        }
        if (!_eligibleTotalInitialized || participants.length == 0) revert EmptyPool();
        if (!_reserveInitialized) revert EmptyPrizeReserve();

        for (uint256 i = 0; i < participants.length; i++) {
            _drawWeights[participants[i]] = _balances[participants[i]];
        }

        ebool hasEligibleWeight = FHE.gt(_totalEligibleBalance, uint64(0));
        ebool reserveSufficient = FHE.ge(_prizeReserve, prizeAmount);
        ebool ready = FHE.and(hasEligibleWeight, reserveSufficient);
        FHE.makePubliclyDecryptable(ready);

        uint256 nonce = drawRequestNonce++;
        uint64 timestamp = uint64(block.timestamp);
        nextDrawRequestTimestamp = timestamp + drawInterval;
        bytes32 totalHandle = FHE.toBytes32(_totalEligibleBalance);
        bytes32 reserveHandle = FHE.toBytes32(_prizeReserve);
        bytes32 readinessHandle = FHE.toBytes32(ready);
        bytes32 requestHash = keccak256(
            abi.encode(
                block.chainid, address(this), nonce, prizeAmount, timestamp, totalHandle, reserveHandle, readinessHandle
            )
        );

        _pendingDraw = DrawRequest({
            totalHandle: _totalEligibleBalance,
            reserveHandle: _prizeReserve,
            readinessHandle: ready,
            prizeAmount: prizeAmount,
            timestamp: timestamp,
            active: true,
            requestHash: requestHash
        });
        emit DrawRequested(nonce, requestHash, prizeAmount, totalHandle, reserveHandle, readinessHandle);
    }

    /**
     * @notice Verifies one draw-readiness bit and executes weighted selection over encrypted balances.
     * @dev Permissionless because the KMS proof is bound to the active request's stored handles and
     *      the request already fixes the prize amount. The caller cannot substitute settlement state.
     */
    function finalizeDraw(bool ready, bytes calldata decryptionProof) external override nonReentrant {
        DrawRequest memory request = _pendingDraw;
        if (!request.active) revert NoActiveDrawRequest();

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(request.readinessHandle);
        FHE.checkSignatures(handles, abi.encode(ready), decryptionProof);

        delete _pendingDraw;
        lastDrawReady = ready;
        lastDrawVerificationTimestamp = uint64(block.timestamp);
        if (!ready) {
            emit DrawSkipped(request.requestHash, request.prizeAmount, block.timestamp);
            return;
        }

        euint64 winningTicket = _sampleWeightedTicket(request.totalHandle);
        euint64 cumulativeEnd = FHE.asEuint64(0);
        euint64 prize = FHE.asEuint64(request.prizeAmount);
        uint256 len = participants.length;

        for (uint256 i = 0; i < len; i++) {
            address participant = participants[i];
            _invalidateParticipantDeactivation(participant);
            euint64 cumulativeStart = cumulativeEnd;
            cumulativeEnd = FHE.add(cumulativeEnd, _drawWeights[participant]);
            _drawWeights[participant] = euint64.wrap(bytes32(0));
            ebool isWinner = FHE.and(FHE.ge(winningTicket, cumulativeStart), FHE.lt(winningTicket, cumulativeEnd));
            euint64 award = FHE.select(isWinner, prize, FHE.asEuint64(0));
            _balances[participant] = FHE.add(_balances[participant], award);
            _prizes[participant] = FHE.add(_prizes[participant], award);
            _allowPosition(participant);
        }

        _prizeReserve = FHE.sub(_prizeReserve, prize);
        _totalAccountedBalance = FHE.add(_totalAccountedBalance, prize);
        _totalEligibleBalance = FHE.add(_totalEligibleBalance, prize);
        _prizeReserve = FHE.allowThis(_prizeReserve);
        _totalAccountedBalance = FHE.allowThis(_totalAccountedBalance);
        _totalEligibleBalance = FHE.allowThis(_totalEligibleBalance);

        currentDrawId++;
        emit DrawExecuted(currentDrawId, request.requestHash, request.prizeAmount, block.timestamp, len);
    }

    /**
     * @notice Releases a draw lock if threshold decryption does not complete in time.
     */
    function cancelDraw() external override nonReentrant {
        DrawRequest memory request = _pendingDraw;
        if (!request.active) revert NoActiveDrawRequest();
        uint256 elapsed = block.timestamp - request.timestamp;
        if (elapsed <= _drawCancellationDelay) {
            revert DrawRequestNotStale(elapsed, _drawCancellationDelay);
        }
        delete _pendingDraw;
        emit DrawCancelled(request.requestHash);
    }

    /**
     * @notice Clears the caller's prize counter after merging it into their saved position.
     */
    function compoundPrizes() external override nonReentrant whenNotPaused {
        if (!_positionInitialized[msg.sender]) revert NoBalancePosition(msg.sender);
        _prizes[msg.sender] = FHE.asEuint64(0);
        _prizes[msg.sender] = FHE.allowThis(_prizes[msg.sender]);
        _prizes[msg.sender] = FHE.allow(_prizes[msg.sender], msg.sender);
    }

    function getPendingDraw() external view override returns (DrawRequest memory) {
        return _pendingDraw;
    }

    function getPendingParticipantActivation(address user)
        external
        view
        override
        returns (ParticipantActivationRequest memory)
    {
        return _pendingParticipantActivations[user];
    }

    function getPendingParticipantDeactivation(address user)
        external
        view
        override
        returns (ParticipantDeactivationRequest memory)
    {
        return _pendingParticipantDeactivations[user];
    }

    function drawCancellationDelay() external view override returns (uint64) {
        return _drawCancellationDelay;
    }

    function getBalanceHandle(address user) external view override returns (bytes32) {
        return FHE.toBytes32(_balances[user]);
    }

    function getPrizeHandle(address user) external view override returns (bytes32) {
        return FHE.toBytes32(_prizes[user]);
    }

    function getTotalEligibleBalanceHandle() external view override returns (bytes32) {
        return FHE.toBytes32(_totalEligibleBalance);
    }

    function getPrizeReserveHandle() external view override returns (bytes32) {
        return FHE.toBytes32(_prizeReserve);
    }

    function getParticipantCount() external view override returns (uint256) {
        return participants.length;
    }

    function _creditDeposit(address user, euint64 amount) internal {
        if (!_positionInitialized[user]) {
            _positionInitialized[user] = true;
            _balances[user] = amount;
            _prizes[user] = FHE.asEuint64(0);
        } else {
            _balances[user] = FHE.add(_balances[user], amount);
        }
        if (isParticipant[user]) {
            _invalidateParticipantDeactivation(user);
            _totalEligibleBalance = FHE.add(_totalEligibleBalance, amount);
            _totalEligibleBalance = FHE.allowThis(_totalEligibleBalance);
        } else {
            _requestParticipantActivation(user);
        }
        if (!_totalInitialized) {
            _totalInitialized = true;
            _totalAccountedBalance = amount;
        } else {
            _totalAccountedBalance = FHE.add(_totalAccountedBalance, amount);
        }
        _allowPosition(user);
        _totalAccountedBalance = FHE.allowThis(_totalAccountedBalance);
        emit Deposited(user, userDepositNonces[user]++, FHE.toBytes32(amount));
    }

    function _requestParticipantActivation(address user) internal {
        ebool eligibility = FHE.gt(_balances[user], FHE.asEuint64(0));
        FHE.makePubliclyDecryptable(eligibility);
        uint256 nonce = participantActivationNonces[user]++;
        uint64 timestamp = uint64(block.timestamp);
        bytes32 eligibilityHandle = FHE.toBytes32(eligibility);
        bytes32 requestHash = keccak256(
            abi.encode(
                block.chainid, address(this), user, nonce, timestamp, FHE.toBytes32(_balances[user]), eligibilityHandle
            )
        );
        _pendingParticipantActivations[user] = ParticipantActivationRequest({
            eligibilityHandle: eligibility, timestamp: timestamp, active: true, requestHash: requestHash
        });
        emit ParticipantActivationRequested(user, nonce, requestHash, eligibilityHandle);
    }

    function _requestParticipantDeactivation(address user) internal {
        _invalidateParticipantDeactivation(user);
        ebool zeroBalance = FHE.eq(_balances[user], FHE.asEuint64(0));
        FHE.makePubliclyDecryptable(zeroBalance);
        uint256 nonce = participantDeactivationNonces[user]++;
        uint64 timestamp = uint64(block.timestamp);
        bytes32 zeroBalanceHandle = FHE.toBytes32(zeroBalance);
        bytes32 requestHash = keccak256(
            abi.encode(
                block.chainid, address(this), user, nonce, timestamp, FHE.toBytes32(_balances[user]), zeroBalanceHandle
            )
        );
        _pendingParticipantDeactivations[user] = ParticipantDeactivationRequest({
            zeroBalanceHandle: zeroBalance, timestamp: timestamp, active: true, requestHash: requestHash
        });
        emit ParticipantDeactivationRequested(user, nonce, requestHash, zeroBalanceHandle);
    }

    function _invalidateParticipantDeactivation(address user) internal {
        ParticipantDeactivationRequest memory request = _pendingParticipantDeactivations[user];
        if (!request.active) return;
        delete _pendingParticipantDeactivations[user];
        emit ParticipantDeactivationInvalidated(user, request.requestHash);
    }

    function _removeParticipant(address user) internal {
        uint256 indexPlusOne = _participantIndexPlusOne[user];
        if (indexPlusOne == 0) revert ParticipantNotActive(user);
        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = participants.length - 1;
        if (index != lastIndex) {
            address moved = participants[lastIndex];
            participants[index] = moved;
            _participantIndexPlusOne[moved] = index + 1;
        }
        participants.pop();
        delete _participantIndexPlusOne[user];
        isParticipant[user] = false;
    }

    function _creditPrizeReserve(address source, euint64 amount) internal {
        if (!_reserveInitialized) {
            _reserveInitialized = true;
            _prizeReserve = amount;
        } else {
            _prizeReserve = FHE.add(_prizeReserve, amount);
        }
        _prizeReserve = FHE.allowThis(_prizeReserve);
        emit PrizeReserveFunded(source, FHE.toBytes32(amount));
    }

    function _allowPosition(address user) internal {
        _balances[user] = FHE.allowThis(_balances[user]);
        _balances[user] = FHE.allow(_balances[user], user);
        _prizes[user] = FHE.allowThis(_prizes[user]);
        _prizes[user] = FHE.allow(_prizes[user], user);
    }

    /**
     * @dev Maps a full-width encrypted random value into [0, encryptedUpperBound) without
     *      revealing the bound. The 128-bit intermediate cannot overflow because both factors
     *      are uint64. Multiply-high reduction gives each ticket either floor or ceil of
     *      2^64 / upperBound source values, so bucket probabilities differ by at most 2^-64.
     */
    function _sampleWeightedTicket(euint64 encryptedUpperBound) internal returns (euint64) {
        euint128 random = FHE.asEuint128(FHE.randEuint64());
        euint128 product = FHE.mul(random, FHE.asEuint128(encryptedUpperBound));
        euint128 scaled = FHE.div(product, uint128(1) << 64);
        return FHE.asEuint64(scaled);
    }

    function _callbackResult(bool accepted) internal returns (ebool result) {
        result = FHE.asEbool(accepted);
        FHE.allowTransient(result, custodyAsset);
    }
}
