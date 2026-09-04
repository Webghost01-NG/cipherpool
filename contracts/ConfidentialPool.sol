// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {FHE, ebool, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
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
 * @dev Individual values never enter plaintext calldata. Only aggregate draw snapshots are publicly
 *      decrypted so bounded randomness can select a winner over encrypted cumulative balances.
 */
contract ConfidentialPool is
    IConfidentialPool,
    IERC7984Receiver,
    ReentrancyGuard,
    Ownable2Step,
    Pausable,
    ZamaEthereumConfig
{
    bytes32 public constant DEPOSIT_ACTION = keccak256("CIPHERPOOL_DEPOSIT_V1");
    bytes32 public constant PRIZE_RESERVE_ACTION = keccak256("CIPHERPOOL_PRIZE_RESERVE_V1");

    address public immutable override custodyAsset;
    uint64 internal immutable _drawCancellationDelay;

    mapping(address => euint64) internal _balances;
    mapping(address => euint64) internal _prizes;
    mapping(address => bool) internal _positionInitialized;

    euint64 internal _totalAccountedBalance;
    euint64 internal _prizeReserve;
    bool internal _totalInitialized;
    bool internal _reserveInitialized;

    address[] public participants;
    mapping(address => bool) public isParticipant;
    mapping(address => uint256) public userDepositNonces;
    mapping(address => uint256) public userWithdrawalNonces;

    DrawRequest internal _pendingDraw;
    uint256 public drawRequestNonce;
    uint256 public override currentDrawId;
    uint64 public override lastVerifiedTotalAccountedBalance;
    uint64 public override lastVerifiedPrizeReserve;
    uint64 public override lastDrawVerificationTimestamp;

    constructor(address confidentialAsset, uint64 cancellationDelay) Ownable(msg.sender) {
        if (confidentialAsset == address(0)) revert InvalidAssetAddress();
        if (cancellationDelay == 0) revert InvalidCancellationDelay();
        custodyAsset = confidentialAsset;
        _drawCancellationDelay = cancellationDelay;
    }

    modifier whenBalanceUpdatesUnlocked() {
        if (_pendingDraw.active) revert BalanceUpdatesLocked(_pendingDraw.requestHash);
        _;
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Accepts an official ERC-7984 transfer callback and credits its actual encrypted result.
     * @dev Call `confidentialTransferAndCall` on the custody token with DEPOSIT_ACTION or
     *      PRIZE_RESERVE_ACTION encoded as a bytes32 value.
     */
    function onConfidentialTransferReceived(
        address,
        address from,
        euint64 amount,
        bytes calldata data
    ) external override nonReentrant returns (ebool) {
        if (msg.sender != custodyAsset) revert UnauthorizedTokenCallback(msg.sender);
        if (paused() || _pendingDraw.active || data.length != 32) return _callbackResult(false);

        bytes32 action = abi.decode(data, (bytes32));
        if (action == DEPOSIT_ACTION) {
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
    function withdraw(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external override nonReentrant whenNotPaused whenBalanceUpdatesUnlocked {
        if (!_positionInitialized[msg.sender]) revert NoBalancePosition(msg.sender);

        euint64 requested = FHE.fromExternal(encryptedAmount, inputProof);
        euint64 approved = FHE.select(
            FHE.ge(_balances[msg.sender], requested),
            requested,
            FHE.asEuint64(0)
        );
        FHE.allowTransient(approved, custodyAsset);
        euint64 transferred = IERC7984(custodyAsset).confidentialTransfer(msg.sender, approved);

        _balances[msg.sender] = FHE.sub(_balances[msg.sender], transferred);
        euint64 prizeDebit = FHE.select(
            FHE.le(_prizes[msg.sender], transferred),
            _prizes[msg.sender],
            transferred
        );
        _prizes[msg.sender] = FHE.sub(_prizes[msg.sender], prizeDebit);
        _totalAccountedBalance = FHE.sub(_totalAccountedBalance, transferred);

        _allowPosition(msg.sender);
        _totalAccountedBalance = FHE.allowThis(_totalAccountedBalance);
        emit Withdrawn(msg.sender, userWithdrawalNonces[msg.sender]++, FHE.toBytes32(transferred));
    }

    /**
     * @notice Anchors aggregate encrypted state for a verifiable weighted prize draw.
     * @dev Balance-changing operations remain locked until the proof is finalized or cancelled.
     */
    function requestDraw(uint64 prizeAmount) external override onlyOwner whenNotPaused nonReentrant {
        if (_pendingDraw.active) revert ActiveDrawRequestExists(_pendingDraw.requestHash);
        if (prizeAmount == 0) revert ZeroPrizeAmount();
        if (!_totalInitialized || participants.length == 0) revert EmptyPool();
        if (!_reserveInitialized) revert EmptyPrizeReserve();

        FHE.makePubliclyDecryptable(_totalAccountedBalance);
        FHE.makePubliclyDecryptable(_prizeReserve);

        uint256 nonce = drawRequestNonce++;
        uint64 timestamp = uint64(block.timestamp);
        bytes32 totalHandle = FHE.toBytes32(_totalAccountedBalance);
        bytes32 reserveHandle = FHE.toBytes32(_prizeReserve);
        bytes32 requestHash = keccak256(abi.encode(
            block.chainid,
            address(this),
            nonce,
            prizeAmount,
            timestamp,
            totalHandle,
            reserveHandle
        ));

        _pendingDraw = DrawRequest({
            totalHandle: _totalAccountedBalance,
            reserveHandle: _prizeReserve,
            prizeAmount: prizeAmount,
            timestamp: timestamp,
            active: true,
            requestHash: requestHash
        });
        emit DrawRequested(nonce, requestHash, prizeAmount, totalHandle, reserveHandle);
    }

    /** @notice Verifies the aggregate snapshot and executes weighted selection over encrypted balances. */
    function finalizeDraw(
        uint64 totalAccountedBalance,
        uint64 prizeReserve,
        bytes calldata decryptionProof
    ) external override onlyOwner nonReentrant {
        DrawRequest memory request = _pendingDraw;
        if (!request.active) revert NoActiveDrawRequest();
        if (totalAccountedBalance == 0) revert EmptyPool();
        if (request.prizeAmount > prizeReserve) {
            revert InsufficientPrizeYield(request.prizeAmount, prizeReserve);
        }

        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(request.totalHandle);
        handles[1] = FHE.toBytes32(request.reserveHandle);
        FHE.checkSignatures(handles, abi.encode(totalAccountedBalance, prizeReserve), decryptionProof);

        delete _pendingDraw;
        euint64 winningTicket = FHE.randEuint64(totalAccountedBalance);
        euint64 cumulativeEnd = FHE.asEuint64(0);
        euint64 prize = FHE.asEuint64(request.prizeAmount);
        uint256 len = participants.length;

        for (uint256 i = 0; i < len; i++) {
            address participant = participants[i];
            euint64 cumulativeStart = cumulativeEnd;
            cumulativeEnd = FHE.add(cumulativeEnd, _balances[participant]);
            ebool isWinner = FHE.and(
                FHE.ge(winningTicket, cumulativeStart),
                FHE.lt(winningTicket, cumulativeEnd)
            );
            euint64 award = FHE.select(isWinner, prize, FHE.asEuint64(0));
            _balances[participant] = FHE.add(_balances[participant], award);
            _prizes[participant] = FHE.add(_prizes[participant], award);
            _allowPosition(participant);
        }

        _prizeReserve = FHE.sub(_prizeReserve, prize);
        _totalAccountedBalance = FHE.add(_totalAccountedBalance, prize);
        _prizeReserve = FHE.allowThis(_prizeReserve);
        _totalAccountedBalance = FHE.allowThis(_totalAccountedBalance);

        currentDrawId++;
        lastVerifiedTotalAccountedBalance = totalAccountedBalance + request.prizeAmount;
        lastVerifiedPrizeReserve = prizeReserve - request.prizeAmount;
        lastDrawVerificationTimestamp = uint64(block.timestamp);
        emit DrawExecuted(
            currentDrawId,
            request.requestHash,
            request.prizeAmount,
            totalAccountedBalance,
            lastVerifiedPrizeReserve,
            block.timestamp,
            len
        );
    }

    /** @notice Releases a draw lock if threshold decryption does not complete in time. */
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

    /** @notice Clears the caller's prize counter after merging it into their saved position. */
    function compoundPrizes() external override nonReentrant whenNotPaused {
        if (!_positionInitialized[msg.sender]) revert NoBalancePosition(msg.sender);
        _prizes[msg.sender] = FHE.asEuint64(0);
        _prizes[msg.sender] = FHE.allowThis(_prizes[msg.sender]);
        _prizes[msg.sender] = FHE.allow(_prizes[msg.sender], msg.sender);
    }

    function getPendingDraw() external view override returns (DrawRequest memory) { return _pendingDraw; }
    function drawCancellationDelay() external view override returns (uint64) { return _drawCancellationDelay; }
    function getBalanceHandle(address user) external view override returns (bytes32) { return FHE.toBytes32(_balances[user]); }
    function getPrizeHandle(address user) external view override returns (bytes32) { return FHE.toBytes32(_prizes[user]); }
    function getTotalAccountedBalanceHandle() external view override returns (bytes32) { return FHE.toBytes32(_totalAccountedBalance); }
    function getPrizeReserveHandle() external view override returns (bytes32) { return FHE.toBytes32(_prizeReserve); }
    function getParticipantCount() external view override returns (uint256) { return participants.length; }

    function _creditDeposit(address user, euint64 amount) internal {
        if (!_positionInitialized[user]) {
            _positionInitialized[user] = true;
            _balances[user] = amount;
            _prizes[user] = FHE.asEuint64(0);
        } else {
            _balances[user] = FHE.add(_balances[user], amount);
        }
        if (!isParticipant[user]) {
            isParticipant[user] = true;
            participants.push(user);
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

    function _callbackResult(bool accepted) internal returns (ebool result) {
        result = FHE.asEbool(accepted);
        FHE.allowTransient(result, custodyAsset);
    }
}
