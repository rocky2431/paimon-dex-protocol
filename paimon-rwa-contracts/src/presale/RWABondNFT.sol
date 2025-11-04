// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title RWABondNFT
 * @notice ERC-721 NFT representing RWA bond certificates with gamification
 * @dev Features:
 * - 5,000 supply @ 100 USDC per NFT
 * - 90-day maturity with 2% APY base yield
 * - Chainlink VRF integration for dice rolling game
 * - Dynamic metadata based on accumulated Remint earnings
 * - 5 rarity tiers: Bronze → Silver → Gold → Diamond → Legendary
 */
contract RWABondNFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    // ==================== State Variables ====================

    /// @notice USDC token (6 decimals)
    IERC20 public immutable USDC;

    /// @notice Treasury address to receive mint payments
    address public treasury;

    /// @notice VRF Coordinator address
    address public immutable vrfCoordinator;

    /// @notice VRF Subscription ID (mutable for migration support)
    uint64 public vrfSubscriptionId;

    /// @notice VRF Key Hash
    bytes32 public immutable vrfKeyHash;

    /// @notice VRF Callback Gas Limit
    uint32 public immutable vrfCallbackGasLimit;

    /// @notice Maximum supply of NFTs
    uint256 public constant maxSupply = 5_000;

    /// @notice Mint price in USDC (100 USDC with 6 decimals)
    uint256 public constant mintPrice = 100 * 1e6;

    /// @notice Maturity period in days
    uint256 public constant maturityDays = 90;

    /// @notice Base yield for 90 days (0.5 USDC = 2% APY)
    uint256 public constant baseYieldAmount = 0.5 * 1e6;

    /// @notice Current token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Rarity tier thresholds (in USDC)
    uint256 public constant BRONZE_THRESHOLD = 0;
    uint256 public constant SILVER_THRESHOLD = 2 * 1e6;
    uint256 public constant GOLD_THRESHOLD = 4 * 1e6;
    uint256 public constant DIAMOND_THRESHOLD = 6 * 1e6;
    uint256 public constant LEGENDARY_THRESHOLD = 8 * 1e6;

    /// @notice Bond information for each token
    struct BondInfo {
        uint128 principal; // Principal amount (100 USDC)
        uint64 mintTime; // Timestamp of minting
        uint64 maturityDate; // Maturity date (mintTime + 90 days)
        uint128 accumulatedRemint; // Accumulated Remint earnings from dice game
        uint8 diceType; // 0 = Normal, 1 = Gold, 2 = Diamond
        uint8 weeklyRollsLeft; // Remaining dice rolls this week
    }

    /// @notice Mapping of tokenId to BondInfo
    mapping(uint256 => BondInfo) private _bondInfo;

    /// @notice Mapping of VRF requestId to tokenId (for dice rolling)
    mapping(uint256 => uint256) private _vrfRequestToTokenId;

    // ==================== Events ====================

    event NFTMinted(address indexed minter, uint256 indexed tokenId, uint256 quantity, uint256 totalCost);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DiceRolled(uint256 indexed tokenId, uint256 requestId, uint8 diceType);
    event DiceResult(uint256 indexed tokenId, uint256 result, uint256 remintEarned);
    event RarityUpgraded(uint256 indexed tokenId, string oldRarity, string newRarity);
    event VRFSubscriptionUpdated(uint64 indexed oldSubscriptionId, uint64 indexed newSubscriptionId);
    event VRFRequestFailed(uint256 indexed tokenId, string reason);

    // ==================== Constructor ====================

    constructor(
        address _usdc,
        address _treasury,
        address _vrfCoordinator,
        uint64 _vrfSubscriptionId,
        bytes32 _vrfKeyHash,
        uint32 _vrfCallbackGasLimit
    ) ERC721("Paimon Bond NFT", "PAIMON-BOND") Ownable(msg.sender) {
        require(_usdc != address(0), "RWABondNFT: zero address USDC");
        require(_treasury != address(0), "RWABondNFT: zero address treasury");
        require(_vrfCoordinator != address(0), "RWABondNFT: zero address VRF coordinator");

        USDC = IERC20(_usdc);
        treasury = _treasury;
        vrfCoordinator = _vrfCoordinator;
        vrfSubscriptionId = _vrfSubscriptionId;
        vrfKeyHash = _vrfKeyHash;
        vrfCallbackGasLimit = _vrfCallbackGasLimit;
    }

    // ==================== Minting Functions ====================

    /**
     * @notice Mint NFTs by paying USDC
     * @param quantity Number of NFTs to mint
     */
    function mint(uint256 quantity) external whenNotPaused nonReentrant {
        require(quantity > 0, "RWABondNFT: quantity must be > 0");

        // ✅ Task 81: Cache _tokenIdCounter to reduce SLOAD operations
        uint256 tokenIdCache = _tokenIdCounter;
        require(tokenIdCache + quantity <= maxSupply, "RWABondNFT: exceeds max supply");

        uint256 totalCost = mintPrice * quantity;

        // Transfer USDC from minter to treasury
        USDC.safeTransferFrom(msg.sender, treasury, totalCost);

        // ✅ Task 81: Cache timestamp and maturity to avoid repeated calculations
        uint64 currentTime = uint64(block.timestamp);
        uint64 maturity = uint64(block.timestamp + maturityDays * 1 days);
        uint128 principal128 = uint128(mintPrice);

        // Mint NFTs
        // ✅ Task 81: Use unchecked block for loop increment (overflow impossible with maxSupply=5000)
        for (uint256 i = 0; i < quantity;) {
            unchecked {
                tokenIdCache++;
            }
            uint256 newTokenId = tokenIdCache;

            _safeMint(msg.sender, newTokenId);

            // Initialize bond info
            _bondInfo[newTokenId] = BondInfo({
                principal: principal128,
                mintTime: currentTime,
                maturityDate: maturity,
                accumulatedRemint: 0,
                diceType: 0, // Normal dice
                weeklyRollsLeft: 1 // 1 free roll per week
            });

            unchecked {
                i++;
            }
        }

        // ✅ Task 81: Write back cached counter once at end
        _tokenIdCounter = tokenIdCache;

        emit NFTMinted(msg.sender, tokenIdCache - quantity + 1, quantity, totalCost);
    }

    // ==================== Yield Calculation Functions ====================

    /**
     * @notice Calculate base yield for a token (2% APY for 90 days)
     * @param tokenId Token ID
     * @return Base yield amount in USDC
     */
    function calculateBaseYield(uint256 tokenId) public view returns (uint256) {
        _requireOwned(tokenId);

        BondInfo memory bond = _bondInfo[tokenId];
        uint256 timeElapsed = block.timestamp - bond.mintTime;
        uint256 maturityTime = maturityDays * 1 days;

        if (timeElapsed >= maturityTime) {
            return baseYieldAmount;
        }

        // Linear yield accrual: (timeElapsed / maturityTime) * baseYieldAmount
        return (timeElapsed * baseYieldAmount) / maturityTime;
    }

    /**
     * @notice Calculate total yield (base + Remint)
     * @param tokenId Token ID
     * @return Total yield amount in USDC
     */
    function calculateTotalYield(uint256 tokenId) public view returns (uint256) {
        _requireOwned(tokenId);

        uint256 baseYield = calculateBaseYield(tokenId);
        uint256 remintYield = _bondInfo[tokenId].accumulatedRemint;

        return baseYield + remintYield;
    }

    // ==================== Maturity Functions ====================

    /**
     * @notice Check if a token has matured
     * @param tokenId Token ID
     * @return True if matured
     */
    function isMatured(uint256 tokenId) public view returns (bool) {
        _requireOwned(tokenId);
        return block.timestamp >= _bondInfo[tokenId].maturityDate;
    }

    // ==================== Metadata Functions ====================

    /**
     * @notice Get rarity tier based on accumulated Remint
     * @param tokenId Token ID
     * @return Rarity tier name
     */
    function getRarityTier(uint256 tokenId) public view returns (string memory) {
        _requireOwned(tokenId);

        uint256 remint = _bondInfo[tokenId].accumulatedRemint;

        if (remint >= LEGENDARY_THRESHOLD) return "Legendary";
        if (remint >= DIAMOND_THRESHOLD) return "Diamond";
        if (remint >= GOLD_THRESHOLD) return "Gold";
        if (remint >= SILVER_THRESHOLD) return "Silver";
        return "Bronze";
    }

    /**
     * @notice Generate token URI with dynamic metadata (OpenSea compatible)
     * @param tokenId Token ID
     * @return Token URI (data URI with base64-encoded JSON)
     */
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        BondInfo memory bond = _bondInfo[tokenId];
        string memory rarity = getRarityTier(tokenId);
        uint256 totalYield = calculateTotalYield(tokenId);
        bool matured = isMatured(tokenId);

        // Build JSON metadata according to OpenSea standards
        string memory json = string(
            abi.encodePacked(
                '{"name":"Paimon Bond NFT #',
                tokenId.toString(),
                '","description":"RWA Bond Certificate (100 USDC principal, 90-day maturity, 2% APY) with gamified Remint yield. Trade this NFT before maturity or redeem for principal + yield at settlement.","image":"',
                _getRarityImage(rarity),
                '","attributes":[',
                _buildAttributes(bond, rarity, totalYield, matured),
                "]}"
            )
        );

        // Return as data URI
        string memory dataURI = string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
        return dataURI;
    }

    /**
     * @notice Get rarity-specific image URI (placeholder for designer integration)
     * @param rarity Rarity tier name
     * @return Image URI (IPFS or data URI)
     */
    function _getRarityImage(string memory rarity) internal pure returns (string memory) {
        // Placeholder: Use on-chain SVG or IPFS CID
        // Designer will replace these with actual artwork
        if (keccak256(bytes(rarity)) == keccak256(bytes("Legendary"))) {
            return "ipfs://QmLegendaryPlaceholder"; // Replace with actual CID
        } else if (keccak256(bytes(rarity)) == keccak256(bytes("Diamond"))) {
            return "ipfs://QmDiamondPlaceholder";
        } else if (keccak256(bytes(rarity)) == keccak256(bytes("Gold"))) {
            return "ipfs://QmGoldPlaceholder";
        } else if (keccak256(bytes(rarity)) == keccak256(bytes("Silver"))) {
            return "ipfs://QmSilverPlaceholder";
        } else {
            // Bronze (default)
            return "ipfs://QmBronzePlaceholder";
        }
    }

    /**
     * @notice Build attributes array for OpenSea metadata
     * @param bond Bond info
     * @param rarity Rarity tier
     * @param totalYield Total yield amount
     * @param matured Whether bond is matured
     * @return JSON attributes array
     */
    function _buildAttributes(BondInfo memory bond, string memory rarity, uint256 totalYield, bool matured)
        internal
        pure
        returns (string memory)
    {
        return string(
            abi.encodePacked(
                '{"trait_type":"Rarity","value":"',
                rarity,
                '"},',
                '{"trait_type":"Principal","display_type":"number","value":',
                uint256(bond.principal / 1e6).toString(), // Convert to USDC (no decimals for display)
                "},",
                '{"trait_type":"Total Yield","display_type":"number","value":',
                _formatUSDC(totalYield),
                "},",
                '{"trait_type":"Remint Earned","display_type":"number","value":',
                _formatUSDC(bond.accumulatedRemint),
                "},",
                '{"trait_type":"Maturity Date","display_type":"date","value":',
                uint256(bond.maturityDate).toString(),
                "},",
                '{"trait_type":"Dice Type","value":"',
                _getDiceTypeName(bond.diceType),
                '"},',
                '{"trait_type":"Status","value":"',
                matured ? "Matured" : "Active",
                '"}'
            )
        );
    }

    /**
     * @notice Format USDC amount as string with 2 decimals
     * @param amount Amount in USDC (6 decimals)
     * @return Formatted string (e.g., "100.50")
     */
    function _formatUSDC(uint256 amount) internal pure returns (string memory) {
        uint256 wholePart = amount / 1e6;
        uint256 decimalPart = (amount % 1e6) / 1e4; // Get 2 decimal places
        return string(abi.encodePacked(wholePart.toString(), ".", _padZeros(decimalPart, 2)));
    }

    /**
     * @notice Pad number with leading zeros
     */
    function _padZeros(uint256 num, uint256 targetLength) internal pure returns (string memory) {
        string memory numStr = num.toString();
        uint256 len = bytes(numStr).length;
        if (len >= targetLength) return numStr;

        bytes memory zeros = new bytes(targetLength - len);
        for (uint256 i = 0; i < targetLength - len; i++) {
            zeros[i] = "0";
        }
        return string(abi.encodePacked(zeros, numStr));
    }

    /**
     * @notice Get dice type name from ID
     */
    function _getDiceTypeName(uint8 diceType) internal pure returns (string memory) {
        if (diceType == 1) return "Gold Dice";
        if (diceType == 2) return "Diamond Dice";
        return "Normal Dice";
    }

    // ==================== View Functions ====================

    /**
     * @notice Get bond information for a token
     * @param tokenId Token ID
     * @return principal Principal amount in USDC
     * @return mintTime Timestamp of minting
     * @return maturityDate Maturity date (mintTime + 90 days)
     * @return accumulatedRemint Accumulated Remint earnings
     * @return diceType Dice type (0=Normal, 1=Gold, 2=Diamond)
     * @return weeklyRollsLeft Remaining dice rolls this week
     */
    function getBondInfo(uint256 tokenId)
        external
        view
        returns (uint128 principal, uint64 mintTime, uint64 maturityDate, uint128 accumulatedRemint, uint8 diceType, uint8 weeklyRollsLeft)
    {
        _requireOwned(tokenId);

        BondInfo memory bond = _bondInfo[tokenId];
        return (bond.principal, bond.mintTime, bond.maturityDate, bond.accumulatedRemint, bond.diceType, bond.weeklyRollsLeft);
    }

    /**
     * @notice Get total supply of minted NFTs
     * @return Total supply
     */
    function totalSupply() public view override returns (uint256) {
        return _tokenIdCounter;
    }

    // ==================== Chainlink VRF Functions (Basic Framework) ====================

    /**
     * @notice Request random dice roll for a token
     * @param tokenId Token ID to roll dice for
     * @dev Full implementation with weekly limits, social tasks in PRESALE-002
     * @return requestId The VRF request ID (0 if request failed)
     */
    function requestDiceRoll(uint256 tokenId) external whenNotPaused nonReentrant returns (uint256 requestId) {
        require(
            ownerOf(tokenId) == msg.sender || msg.sender == remintController,
            "RWABondNFT: caller is not owner"
        );
        require(!isMatured(tokenId), "RWABondNFT: bond has matured");

        BondInfo storage bond = _bondInfo[tokenId];
        // Note: Weekly roll limit is managed by RemintController
        // No need to check or decrement here

        // Request random words from Chainlink VRF with error handling
        try this._requestRandomWordsExternal() returns (uint256 _requestId) {
            requestId = _requestId;

            // Map requestId to tokenId for callback
            _vrfRequestToTokenId[requestId] = tokenId;

            emit DiceRolled(tokenId, requestId, bond.diceType);
        } catch Error(string memory reason) {
            // VRF request failed - restore roll and emit error
            emit VRFRequestFailed(tokenId, reason);
            return 0;
        } catch {
            // Unknown error
            emit VRFRequestFailed(tokenId, "Unknown VRF error");
            return 0;
        }

        return requestId;
    }

    /**
     * @notice External wrapper for _requestRandomWords to enable try-catch
     * @dev Only callable by this contract
     */
    function _requestRandomWordsExternal() external returns (uint256) {
        require(msg.sender == address(this), "RWABondNFT: internal only");
        return _requestRandomWords();
    }

    /**
     * @notice Internal function to request random words from VRF
     * @return requestId The VRF request ID
     */
    function _requestRandomWords() internal returns (uint256 requestId) {
        // Call Chainlink VRF Coordinator
        (bool success, bytes memory data) = vrfCoordinator.call(
            abi.encodeWithSignature(
                "requestRandomWords(bytes32,uint64,uint16,uint32,uint32)",
                vrfKeyHash,
                vrfSubscriptionId,
                3, // requestConfirmations
                vrfCallbackGasLimit,
                1 // numWords (we only need 1 random number)
            )
        );
        require(success, "RWABondNFT: VRF request failed");
        requestId = abi.decode(data, (uint256));
    }

    /**
     * @notice Chainlink VRF callback function
     * @param requestId The VRF request ID
     * @param randomWords Array of random numbers
     * @dev Only callable by VRF Coordinator
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        require(msg.sender == vrfCoordinator, "RWABondNFT: only VRF coordinator");

        uint256 tokenId = _vrfRequestToTokenId[requestId];
        require(tokenId != 0, "RWABondNFT: invalid request ID");

        BondInfo storage bond = _bondInfo[tokenId];
        uint8 diceType = bond.diceType;

        // Calculate dice result and reward
        (uint256 diceResult, uint256 remintReward) = _calculateDiceReward(diceType, randomWords[0]);

        // ✅ Task 81: Use unchecked for reward addition (max reward 2 USDC, max total 8 USDC threshold)
        uint128 oldRemint = bond.accumulatedRemint;
        unchecked {
            bond.accumulatedRemint = oldRemint + uint128(remintReward);
        }

        // Check if rarity tier upgraded
        string memory oldRarity = _getRarityTierFromRemint(oldRemint);
        string memory newRarity = getRarityTier(tokenId);
        if (keccak256(bytes(oldRarity)) != keccak256(bytes(newRarity))) {
            emit RarityUpgraded(tokenId, oldRarity, newRarity);
        }

        emit DiceResult(tokenId, diceResult, remintReward);

        // Clean up mapping
        delete _vrfRequestToTokenId[requestId];
    }

    /**
     * @notice Calculate dice reward based on dice type and random value
     * @param diceType Dice type (0=Normal, 1=Gold, 2=Diamond)
     * @param randomValue Random number from VRF
     * @return diceResult The dice roll result (1-6, 1-12, or 1-20)
     * @return remintReward The Remint reward amount in USDC
     */
    function _calculateDiceReward(uint8 diceType, uint256 randomValue)
        internal
        pure
        returns (uint256 diceResult, uint256 remintReward)
    {
        if (diceType == 0) {
            // Normal Dice: 1-6 → 0-3% APY for 90 days
            diceResult = (randomValue % 6) + 1;
            remintReward = (diceResult * 500_000) / 6; // Max 0.5 USDC (500,000 µUSDC)
        } else if (diceType == 1) {
            // Gold Dice: 1-12 → 0-6% APY for 90 days
            diceResult = (randomValue % 12) + 1;
            remintReward = (diceResult * 1_000_000) / 12; // Max 1.0 USDC
        } else {
            // Diamond Dice: 1-20 → 0-10% APY for 90 days
            diceResult = (randomValue % 20) + 1;
            remintReward = (diceResult * 2_000_000) / 20; // Max 2.0 USDC
        }
    }

    /**
     * @notice Get rarity tier from Remint amount (helper for rarity upgrade detection)
     * @param remint Accumulated Remint amount
     * @return Rarity tier name
     */
    function _getRarityTierFromRemint(uint128 remint) internal pure returns (string memory) {
        if (remint >= LEGENDARY_THRESHOLD) return "Legendary";
        if (remint >= DIAMOND_THRESHOLD) return "Diamond";
        if (remint >= GOLD_THRESHOLD) return "Gold";
        if (remint >= SILVER_THRESHOLD) return "Silver";
        return "Bronze";
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Pause contract (emergency)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Set treasury address
     * @param _treasury New treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "RWABondNFT: zero address treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    /**
     * @notice Update VRF subscription ID (for migration)
     * @param newSubscriptionId New VRF subscription ID
     * @dev Only callable by owner. Useful when migrating to a new VRF subscription
     */
    function setVRFSubscriptionId(uint64 newSubscriptionId) external onlyOwner {
        require(newSubscriptionId != 0, "RWABondNFT: zero subscription ID");
        uint64 oldSubscriptionId = vrfSubscriptionId;
        vrfSubscriptionId = newSubscriptionId;
        emit VRFSubscriptionUpdated(oldSubscriptionId, newSubscriptionId);
    }

    // ==================== RemintController Integration ====================

    /// @notice RemintController address (authorized to request dice rolls)
    address public remintController;
    address public settlementRouter; // PRESALE-003: Settlement router for bond NFT settlement

    event RemintControllerUpdated(address indexed oldController, address indexed newController);

    /**
     * @notice Set RemintController address (admin only)
     */
    function setRemintController(address _remintController) external onlyOwner {
        require(_remintController != address(0), "RWABondNFT: zero address");
        address oldController = remintController;
        remintController = _remintController;
        emit RemintControllerUpdated(oldController, _remintController);
    }

    /**
     * @notice Set settlement router address (PRESALE-003)
     * @param _settlementRouter New settlement router address
     */
    function setSettlementRouter(address _settlementRouter) external onlyOwner {
        require(_settlementRouter != address(0), "RWABondNFT: zero address");
        settlementRouter = _settlementRouter;
    }

    // ==================== Internal Functions ====================

    /**
     * @notice Override required by Solidity for multiple inheritance
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Override _update for ERC721Enumerable compatibility
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    /**
     * @notice Override _increaseBalance for ERC721Enumerable compatibility
     */
    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    // ==================== Settlement Functions (PRESALE-003) ====================

    /**
     * @notice Burn Bond NFT after settlement
     * @param tokenId Token ID to burn
     * @dev Only callable by authorized settlement router
     *      Called after user settles to veNFT or cash redemption
     */
    function burn(uint256 tokenId) external {
        require(
            msg.sender == settlementRouter || msg.sender == owner(),
            "RWABondNFT: caller not authorized to burn"
        );
        require(_ownerOf(tokenId) != address(0), "RWABondNFT: token does not exist");

        // Delete bond info
        delete _bondInfo[tokenId];

        // Burn the NFT
        _burn(tokenId);
    }
}
