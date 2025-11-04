// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPancakePair
 * @notice Interface for PancakeSwap V2 Pair (LP token)
 * @dev Based on Uniswap V2 Pair interface
 *
 * Each pair is an ERC-20 token representing liquidity shares
 *
 * References:
 * - https://docs.pancakeswap.finance/
 * - https://docs.uniswap.org/contracts/v2/reference/smart-contracts/pair
 */
interface IPancakePair {
    // ============================================================
    // EVENTS
    // ============================================================

    /**
     * @notice Emitted when liquidity is minted
     * @param sender Address that initiated the mint
     * @param amount0 Amount of token0 deposited
     * @param amount1 Amount of token1 deposited
     */
    event Mint(address indexed sender, uint amount0, uint amount1);

    /**
     * @notice Emitted when liquidity is burned
     * @param sender Address that initiated the burn
     * @param amount0 Amount of token0 withdrawn
     * @param amount1 Amount of token1 withdrawn
     * @param to Address that received the tokens
     */
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);

    /**
     * @notice Emitted when a swap occurs
     * @param sender Address that initiated the swap
     * @param amount0In Amount of token0 sent to pair
     * @param amount1In Amount of token1 sent to pair
     * @param amount0Out Amount of token0 sent from pair
     * @param amount1Out Amount of token1 sent from pair
     * @param to Address that received the output tokens
     */
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );

    /**
     * @notice Emitted when reserves are synced
     * @param reserve0 New reserve of token0
     * @param reserve1 New reserve of token1
     */
    event Sync(uint112 reserve0, uint112 reserve1);

    // ============================================================
    // ERC-20 FUNCTIONS
    // ============================================================

    /**
     * @notice Returns the name of the LP token
     * @return Name string
     */
    function name() external pure returns (string memory);

    /**
     * @notice Returns the symbol of the LP token
     * @return Symbol string
     */
    function symbol() external pure returns (string memory);

    /**
     * @notice Returns the decimals of the LP token
     * @return Number of decimals (always 18)
     */
    function decimals() external pure returns (uint8);

    /**
     * @notice Returns the total supply of LP tokens
     * @return Total supply
     */
    function totalSupply() external view returns (uint);

    /**
     * @notice Returns the LP token balance of an address
     * @param owner Address to query
     * @return Balance of LP tokens
     */
    function balanceOf(address owner) external view returns (uint);

    /**
     * @notice Returns the allowance for a spender
     * @param owner Address of the token owner
     * @param spender Address of the spender
     * @return Allowance amount
     */
    function allowance(address owner, address spender) external view returns (uint);

    /**
     * @notice Approves a spender to transfer LP tokens
     * @param spender Address to approve
     * @param value Amount to approve
     * @return True if successful
     */
    function approve(address spender, uint value) external returns (bool);

    /**
     * @notice Transfers LP tokens
     * @param to Address to transfer to
     * @param value Amount to transfer
     * @return True if successful
     */
    function transfer(address to, uint value) external returns (bool);

    /**
     * @notice Transfers LP tokens from one address to another
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param value Amount to transfer
     * @return True if successful
     */
    function transferFrom(address from, address to, uint value) external returns (bool);

    // ============================================================
    // PAIR-SPECIFIC FUNCTIONS
    // ============================================================

    /**
     * @notice Returns the minimum liquidity locked forever
     * @return Minimum liquidity (1000 wei)
     */
    function MINIMUM_LIQUIDITY() external pure returns (uint);

    /**
     * @notice Returns the factory address
     * @return Address of PancakeFactory
     */
    function factory() external view returns (address);

    /**
     * @notice Returns the first token address
     * @return Address of token0
     */
    function token0() external view returns (address);

    /**
     * @notice Returns the second token address
     * @return Address of token1
     */
    function token1() external view returns (address);

    /**
     * @notice Returns the current reserves and last update timestamp
     * @return reserve0 Reserve of token0
     * @return reserve1 Reserve of token1
     * @return blockTimestampLast Timestamp of last update
     */
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);

    /**
     * @notice Returns the cumulative price of token0
     * @return Cumulative price
     */
    function price0CumulativeLast() external view returns (uint);

    /**
     * @notice Returns the cumulative price of token1
     * @return Cumulative price
     */
    function price1CumulativeLast() external view returns (uint);

    /**
     * @notice Returns the product of reserves at the time of the most recent liquidity event
     * @return k value (reserve0 × reserve1)
     */
    function kLast() external view returns (uint);

    /**
     * @notice Mints new LP tokens (called by router when adding liquidity)
     * @param to Address to mint LP tokens to
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external returns (uint liquidity);

    /**
     * @notice Burns LP tokens (called by router when removing liquidity)
     * @param to Address to send underlying tokens to
     * @return amount0 Amount of token0 withdrawn
     * @return amount1 Amount of token1 withdrawn
     */
    function burn(address to) external returns (uint amount0, uint amount1);

    /**
     * @notice Swaps tokens (called by router)
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Address to send output tokens to
     * @param data Callback data for flash swaps
     */
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;

    /**
     * @notice Forces reserves to match balances
     * @param to Address to send excess tokens to
     */
    function skim(address to) external;

    /**
     * @notice Forces reserves to match balances (no transfer)
     */
    function sync() external;
}
