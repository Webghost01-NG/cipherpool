// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IConfidentialVault} from "./interfaces/IConfidentialVault.sol";
import {IPoolErrors} from "./interfaces/IPoolErrors.sol";

/**
 * @title ConfidentialVault
 * @notice Yield harvesting vault adapter deploying idle pool custody assets to generate prizes.
 * @dev Enforces strict principal segregation ensuring prize harvesting never draws down user deposits.
 */
contract ConfidentialVault is IConfidentialVault, Ownable, ReentrancyGuard, IPoolErrors {
    using SafeERC20 for IERC20;

    /// @notice The underlying custody asset (e.g. USDC).
    IERC20 public immutable asset;

    /// @notice The parent ConfidentialPool contract authorized to deposit/withdraw.
    address public immutable pool;

    /// @notice Total principal assets committed from the pool.
    uint256 public principalDeposited;

    /// @notice Emitted when principal is deposited into the strategy.
    event StrategyDeposited(uint256 amount, uint256 timestamp);

    /// @notice Emitted when principal is withdrawn from the strategy back to the pool.
    event StrategyWithdrawn(uint256 amount, uint256 timestamp);

    /// @notice Emitted when yield is harvested and sent to the pool.
    event YieldHarvested(uint256 amount, uint256 timestamp);

    /**
     * @param _asset The underlying ERC-20 token address.
     * @param _pool The authorized ConfidentialPool contract address.
     */
    constructor(address _asset, address _pool) Ownable(msg.sender) {
        if (_asset == address(0) || _pool == address(0)) {
            revert InvalidAssetAddress();
        }
        asset = IERC20(_asset);
        pool = _pool;
    }

    /**
     * @notice Deposits custody assets into the yield strategy.
     * @param amount The plaintext amount to deposit.
     */
    function depositToStrategy(uint256 amount) external override nonReentrant {
        if (msg.sender != pool && msg.sender != owner()) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (amount == 0) {
            revert ZeroDepositAmount();
        }

        principalDeposited += amount;
        emit StrategyDeposited(amount, block.timestamp);

        asset.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraws custody assets from the strategy back to the pool.
     * @param amount The plaintext amount to redeem.
     */
    function withdrawFromStrategy(uint256 amount) external override nonReentrant {
        if (msg.sender != pool) {
            revert UnauthorizedCaller(msg.sender);
        }
        if (amount > principalDeposited) {
            revert InsufficientCustodyBalance(amount, principalDeposited);
        }

        principalDeposited -= amount;
        emit StrategyWithdrawn(amount, block.timestamp);

        asset.safeTransfer(pool, amount);
    }

    /**
     * @notice Harvests accumulated yield and transfers it to the pool for prize draws.
     * @return harvestedAmount The yield amount transferred.
     */
    function harvestYield() external override nonReentrant returns (uint256 harvestedAmount) {
        uint256 total = totalManagedAssets();
        if (total > principalDeposited) {
            harvestedAmount = total - principalDeposited;
            emit YieldHarvested(harvestedAmount, block.timestamp);
            asset.safeTransfer(pool, harvestedAmount);
        } else {
            harvestedAmount = 0;
        }
    }

    /**
     * @notice Returns the total assets held in the vault.
     */
    function totalManagedAssets() public view override returns (uint256) {
        return asset.balanceOf(address(this));
    }
}
