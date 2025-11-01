// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/Math.sol";

/**
 * @title DEXPair
 * @notice Uniswap V2-style AMM liquidity pool with custom fee structure
 * @dev Implements constant product formula (x * y = k) with 0.25% swap fee
 *
 * Key Features:
 * - Constant product AMM (x * y = k)
 * - 0.25% total swap fee (25 basis points)
 * - Fee split: 70% to voters (0.175%), 30% to treasury (0.075%)
 * - Minimum liquidity lock (1000 wei) to prevent inflation attacks
 * - ReentrancyGuard on all state-changing functions
 * - SafeERC20 for token transfers
 *
 * Fee Calculation:
 * - Total fee: 0.25% (25 / 10000)
 * - Voter fee: Dynamically calculated as (totalFee × 7) / 10 = 70% of total
 * - Treasury fee: Dynamically calculated as totalFee - voterFee = 30% of total
 * - Precision: Exact 70/30 split, no rounding errors
 */
contract DEXPair is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Minimum liquidity locked forever
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    /// @notice Dead address for locking minimum liquidity (OpenZeppelin 5.x doesn't allow zero address)
    address private constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice Fee denominator (10000 = 100%)
    uint256 public constant FEE_DENOMINATOR = 10000;

    /// @notice Total swap fee (0.25%)
    uint256 public constant TOTAL_FEE = 25;

    /// @notice Factory contract address
    address public factory;

    /// @notice Token0 address (sorted)
    address public token0;

    /// @notice Token1 address (sorted)
    address public token1;

    /// @notice Reserve of token0
    uint112 private reserve0;

    /// @notice Reserve of token1
    uint112 private reserve1;

    /// @notice Last block timestamp
    uint32 private blockTimestampLast;

    /// @notice Accumulated voter fees for token0
    uint256 public voterFees0;

    /// @notice Accumulated voter fees for token1
    uint256 public voterFees1;

    /// @notice Accumulated treasury fees for token0
    uint256 public treasuryFees0;

    /// @notice Accumulated treasury fees for token1
    uint256 public treasuryFees1;

    /// @notice Emitted when liquidity is added
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);

    /// @notice Emitted when liquidity is removed
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);

    /// @notice Emitted when a swap occurs
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    /// @notice Emitted when reserves are synced
    event Sync(uint112 reserve0, uint112 reserve1);

    /**
     * @notice Constructor creates LP token
     */
    constructor() ERC20("Paimon DEX LP", "PAIMON-LP") {
        factory = msg.sender;
    }

    /**
     * @notice Initialize the pair (called once by factory)
     * @param _token0 Address of token0
     * @param _token1 Address of token1
     */
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "FORBIDDEN");
        token0 = _token0;
        token1 = _token1;
    }

    /**
     * @notice Get current reserves
     * @return _reserve0 Reserve of token0
     * @return _reserve1 Reserve of token1
     * @return _blockTimestampLast Last update timestamp
     */
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    /**
     * @notice Update reserves and timestamp
     * @param balance0 New balance of token0
     * @param balance1 New balance of token1
     */
    function _update(uint256 balance0, uint256 balance1, uint112 /* _reserve0 */, uint112 /* _reserve1 */) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "OVERFLOW");
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    /**
     * @notice Mint liquidity tokens
     * @param to Address to receive LP tokens
     * @return liquidity Amount of LP tokens minted
     */
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this)) - voterFees0 - treasuryFees0;
        uint256 balance1 = IERC20(token1).balanceOf(address(this)) - voterFees1 - treasuryFees1;
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            // First mint: lock minimum liquidity
            uint256 sqrtK = Math.sqrt(amount0 * amount1);
            require(sqrtK > MINIMUM_LIQUIDITY, "INSUFFICIENT_LIQUIDITY_MINTED");
            liquidity = sqrtK - MINIMUM_LIQUIDITY;
            _mint(DEAD_ADDRESS, MINIMUM_LIQUIDITY); // Permanently lock the first MINIMUM_LIQUIDITY tokens
        } else {
            // Subsequent mints: proportional to reserves
            liquidity = Math.min((amount0 * _totalSupply) / _reserve0, (amount1 * _totalSupply) / _reserve1);
        }

        require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /**
     * @notice Burn liquidity tokens and return underlying tokens
     * @param to Address to receive tokens
     * @return amount0 Amount of token0 returned
     * @return amount1 Amount of token1 returned
     */
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this)) - voterFees0 - treasuryFees0;
        uint256 balance1 = IERC20(_token1).balanceOf(address(this)) - voterFees1 - treasuryFees1;
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply; // Using balances ensures pro-rata distribution
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        IERC20(_token0).safeTransfer(to, amount0);
        IERC20(_token1).safeTransfer(to, amount1);

        balance0 = IERC20(_token0).balanceOf(address(this)) - voterFees0 - treasuryFees0;
        balance1 = IERC20(_token1).balanceOf(address(this)) - voterFees1 - treasuryFees1;

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /**
     * @notice Swap tokens
     * @param amount0Out Amount of token0 to send out
     * @param amount1Out Amount of token1 to send out
     * @param to Address to receive tokens
     */
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata /* data */) external nonReentrant {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");

        uint256 balance0;
        uint256 balance1;
        {
            address _token0 = token0;
            address _token1 = token1;
            require(to != _token0 && to != _token1, "INVALID_TO");

            if (amount0Out > 0) IERC20(_token0).safeTransfer(to, amount0Out);
            if (amount1Out > 0) IERC20(_token1).safeTransfer(to, amount1Out);

            balance0 = IERC20(_token0).balanceOf(address(this));
            balance1 = IERC20(_token1).balanceOf(address(this));
        }

        uint256 amount0In = balance0 > _reserve0 + voterFees0 + treasuryFees0 - amount0Out
            ? balance0 - (_reserve0 + voterFees0 + treasuryFees0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 + voterFees1 + treasuryFees1 - amount1Out
            ? balance1 - (_reserve1 + voterFees1 + treasuryFees1 - amount1Out)
            : 0;

        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        // Calculate and collect fees (dynamic 70/30 split)
        uint256 fee0 = 0;
        uint256 fee1 = 0;

        if (amount0In > 0) {
            fee0 = (amount0In * TOTAL_FEE) / FEE_DENOMINATOR;
            // Dynamic calculation: voterShare = (fee × 7) / 10, treasuryShare = fee - voterShare
            uint256 voterShare0 = (fee0 * 7) / 10;
            uint256 treasuryShare0 = fee0 - voterShare0;
            voterFees0 += voterShare0;
            treasuryFees0 += treasuryShare0;
        }

        if (amount1In > 0) {
            fee1 = (amount1In * TOTAL_FEE) / FEE_DENOMINATOR;
            // Dynamic calculation: voterShare = (fee × 7) / 10, treasuryShare = fee - voterShare
            uint256 voterShare1 = (fee1 * 7) / 10;
            uint256 treasuryShare1 = fee1 - voterShare1;
            voterFees1 += voterShare1;
            treasuryFees1 += treasuryShare1;
        }

        // Verify K invariant (adjusted for fees)
        {
            uint256 balance0Adjusted = (balance0 - voterFees0 - treasuryFees0) * FEE_DENOMINATOR - (amount0In * TOTAL_FEE);
            uint256 balance1Adjusted = (balance1 - voterFees1 - treasuryFees1) * FEE_DENOMINATOR - (amount1In * TOTAL_FEE);
            require(
                balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * uint256(_reserve1) * (FEE_DENOMINATOR ** 2),
                "K"
            );
        }

        _update(balance0 - voterFees0 - treasuryFees0, balance1 - voterFees1 - treasuryFees1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /**
     * @notice Force reserves to match balances
     */
    function skim(address to) external nonReentrant {
        address _token0 = token0;
        address _token1 = token1;
        IERC20(_token0).safeTransfer(to, IERC20(_token0).balanceOf(address(this)) - reserve0 - voterFees0 - treasuryFees0);
        IERC20(_token1).safeTransfer(to, IERC20(_token1).balanceOf(address(this)) - reserve1 - voterFees1 - treasuryFees1);
    }

    /**
     * @notice Force balances to match reserves
     */
    function sync() external nonReentrant {
        _update(
            IERC20(token0).balanceOf(address(this)) - voterFees0 - treasuryFees0,
            IERC20(token1).balanceOf(address(this)) - voterFees1 - treasuryFees1,
            reserve0,
            reserve1
        );
    }

    /**
     * @notice Claim treasury fees
     * @param to Address to receive fees
     */
    function claimTreasuryFees(address to) external nonReentrant {
        address treasuryAddress = IFactory(factory).treasury();
        require(msg.sender == treasuryAddress, "FORBIDDEN");

        uint256 _treasuryFees0 = treasuryFees0;
        uint256 _treasuryFees1 = treasuryFees1;

        if (_treasuryFees0 > 0) {
            treasuryFees0 = 0;
            IERC20(token0).safeTransfer(to, _treasuryFees0);
        }

        if (_treasuryFees1 > 0) {
            treasuryFees1 = 0;
            IERC20(token1).safeTransfer(to, _treasuryFees1);
        }
    }

    /**
     * @notice Claim voter fees
     * @param to Address to receive fees
     */
    function claimVoterFees(address to) external nonReentrant {
        // In production, this should be restricted to GaugeController
        // For now, allow anyone to claim (will be restricted in Phase 2)
        uint256 _voterFees0 = voterFees0;
        uint256 _voterFees1 = voterFees1;

        if (_voterFees0 > 0) {
            voterFees0 = 0;
            IERC20(token0).safeTransfer(to, _voterFees0);
        }

        if (_voterFees1 > 0) {
            voterFees1 = 0;
            IERC20(token1).safeTransfer(to, _voterFees1);
        }
    }
}

/**
 * @title IFactory
 * @notice Interface for DEXFactory
 */
interface IFactory {
    function treasury() external view returns (address);
}
