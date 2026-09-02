// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title IConfidentialVault
 * @notice Yield-generating vault adapter interface for the Confidential PoolTogether protocol.
 * @dev Manages custody asset deployment to external yield strategies while maintaining principal solvency.
 */
interface IConfidentialVault {
    /**
     * @notice Deposits underlying custody assets into the yield strategy.
     * @param amount The plaintext amount to deposit.
     */
    function depositToStrategy(uint256 amount) external;

    /**
     * @notice Withdraws underlying custody assets from the yield strategy back to the pool.
     * @param amount The plaintext amount to redeem.
     */
    function withdrawFromStrategy(uint256 amount) external;

    /**
     * @notice Harvests accumulated yield and transfers it to the prize pool reserve.
     * @return harvestedAmount The plaintext yield amount harvested.
     */
    function harvestYield() external returns (uint256 harvestedAmount);

    /**
     * @notice Returns the total assets currently deployed and earning yield in the strategy.
     * @return Total managed assets.
     */
    function totalManagedAssets() external view returns (uint256);
}
