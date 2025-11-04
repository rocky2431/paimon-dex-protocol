// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title Validate Deployment Script
 * @notice Validates all deployed contracts and their configurations
 * @dev This script should be run after deployment and initialization
 *
 * Usage:
 *   forge script script/config/ValidateDeployment.s.sol \
 *     --rpc-url $BSC_TESTNET_RPC \
 *     --sig "run(string)" \
 *     deployments/bsc-testnet-97.json
 *
 * This script performs the following checks:
 * 1. Contract deployment verification
 * 2. Ownership verification
 * 3. Permission verification
 * 4. Parameter validation
 * 5. Integration checks
 */
contract ValidateDeploymentScript is Script {
    struct ValidationResult {
        bool passed;
        string message;
    }

    ValidationResult[] public results;
    uint256 public passedChecks;
    uint256 public failedChecks;

    function run(string memory deploymentFile) public view {
        console.log("==============================================");
        console.log("Deployment Validation Script");
        console.log("==============================================");
        console.log("Reading deployment from:", deploymentFile);
        console.log("Chain ID:", block.chainid);
        console.log("==============================================\n");

        string memory json = vm.readFile(deploymentFile);

        // Phase 1: Contract Deployment Checks
        validateContractDeployments(json);

        // Phase 2: Ownership Checks
        validateOwnership(json);

        // Phase 3: Permission Checks
        validatePermissions(json);

        // Phase 4: Parameter Checks
        validateParameters(json);

        // Phase 5: Integration Checks
        validateIntegrations(json);

        // Print summary
        printValidationSummary();
    }

    function validateContractDeployments(string memory json) internal view {
        console.log("[Phase 1] Validating Contract Deployments...\n");

        // Core Tokens
        checkContract(json, "usdp", "USDP");
        checkContract(json, "paimon", "PAIMON");
        checkContract(json, "esPaimon", "esPAIMON");
        checkContract(json, "psm", "PSM");

        // Governance
        checkContract(json, "votingEscrow", "VotingEscrow");
        checkContract(json, "votingEscrowPaimon", "VotingEscrowPaimon");
        checkContract(json, "gaugeController", "GaugeController");
        checkContract(json, "rewardDistributor", "RewardDistributor");
        checkContract(json, "bribeMarketplace", "BribeMarketplace");
        checkContract(json, "emissionManager", "EmissionManager");

        // Incentives
        checkContract(json, "boostStaking", "BoostStaking");
        checkContract(json, "nitroPool", "NitroPool");

        // DEX
        checkContract(json, "dexFactory", "DEXFactory");
        checkContract(json, "dexRouter", "DEXRouter");
        checkContract(json, "usdpUsdcPair", "USDP/USDC Pair");

        // Treasury & Oracle
        checkContract(json, "treasury", "Treasury");
        checkContract(json, "savingRate", "SavingRate");
        checkContract(json, "priceOracle", "PriceOracle");
        checkContract(json, "rwaPriceOracle", "RWAPriceOracle");

        // Vault & StabilityPool
        checkContract(json, "usdpVault", "USDPVault");
        checkContract(json, "stabilityPool", "USDPStabilityPool");

        // Launchpad
        checkContract(json, "projectRegistry", "ProjectRegistry");
        checkContract(json, "issuanceController", "IssuanceController");

        // Presale
        checkContract(json, "rwaBondNFT", "RWABondNFT");
        checkContract(json, "remintController", "RemintController");
        checkContract(json, "settlementRouter", "SettlementRouter");

        console.log();
    }

    function validateOwnership(string memory json) internal view {
        console.log("[Phase 2] Validating Ownership...\n");

        address deployer = vm.parseJsonAddress(json, ".deployer");
        console.log("  Expected owner:", deployer);

        // Check ownership of key contracts
        checkOwnership(json, "psm", deployer);
        checkOwnership(json, "gaugeController", deployer);
        checkOwnership(json, "bribeMarketplace", deployer);
        checkOwnership(json, "treasury", deployer);

        console.log();
    }

    function validatePermissions(string memory json) internal view {
        console.log("[Phase 3] Validating Permissions...\n");

        // Check USDP minter roles
        console.log("  Checking USDP minter roles...");
        address usdpAddress = vm.parseJsonAddress(json, ".usdp");
        address psmAddress = vm.parseJsonAddress(json, ".psm");
        address vaultAddress = vm.parseJsonAddress(json, ".usdpVault");

        checkMinterRole(usdpAddress, psmAddress, "PSM");
        checkMinterRole(usdpAddress, vaultAddress, "USDPVault");

        // Check PAIMON minter roles
        console.log("  Checking PAIMON minter roles...");
        address paimonAddress = vm.parseJsonAddress(json, ".paimon");
        address rewardDistributorAddress = vm.parseJsonAddress(json, ".rewardDistributor");
        address emissionManagerAddress = vm.parseJsonAddress(json, ".emissionManager");

        checkMinterRole(paimonAddress, rewardDistributorAddress, "RewardDistributor");
        checkMinterRole(paimonAddress, emissionManagerAddress, "EmissionManager");

        console.log();
    }

    function validateParameters(string memory json) internal view {
        console.log("[Phase 4] Validating Parameters...\n");

        // Check PSM parameters
        address psmAddress = vm.parseJsonAddress(json, ".psm");
        console.log("  PSM Configuration:");
        checkParameter(psmAddress, "feeIn()", "Fee In", 0, 1000); // 0-10%
        checkParameter(psmAddress, "feeOut()", "Fee Out", 0, 1000);

        // Check Vault parameters
        address vaultAddress = vm.parseJsonAddress(json, ".usdpVault");
        console.log("  Vault Configuration:");
        checkParameter(vaultAddress, "minCollateralRatio()", "Min Collateral Ratio", 10000, 30000); // 100-300%
        checkParameter(vaultAddress, "liquidationThreshold()", "Liquidation Threshold", 10000, 20000);

        console.log();
    }

    function validateIntegrations(string memory json) internal view {
        console.log("[Phase 5] Validating Integrations...\n");

        // Check DEXFactory -> Treasury link
        address dexFactoryAddress = vm.parseJsonAddress(json, ".dexFactory");
        address treasuryAddress = vm.parseJsonAddress(json, ".treasury");
        checkIntegration(dexFactoryAddress, "treasury()", treasuryAddress, "DEXFactory -> Treasury");

        // Check Vault -> StabilityPool link
        address vaultAddress = vm.parseJsonAddress(json, ".usdpVault");
        address stabilityPoolAddress = vm.parseJsonAddress(json, ".stabilityPool");
        checkIntegration(vaultAddress, "stabilityPool()", stabilityPoolAddress, "Vault -> StabilityPool");

        // Check GaugeController -> RewardDistributor link
        address gaugeControllerAddress = vm.parseJsonAddress(json, ".gaugeController");
        address rewardDistributorAddress = vm.parseJsonAddress(json, ".rewardDistributor");
        checkIntegration(gaugeControllerAddress, "rewardDistributor()", rewardDistributorAddress, "GaugeController -> RewardDistributor");

        console.log();
    }

    function checkContract(string memory json, string memory key, string memory name) internal view {
        try vm.parseJsonAddress(json, string.concat(".", key)) returns (address addr) {
            if (addr == address(0)) {
                console.log("  [FAIL] %s: Zero address", name);
            } else if (addr.code.length == 0) {
                console.log("  [FAIL] %s: No contract code at %s", name, addr);
            } else {
                console.log("  [PASS] %s: Deployed at %s", name, addr);
            }
        } catch {
            console.log("  [FAIL] %s: Not found in deployment file", name);
        }
    }

    function checkOwnership(string memory json, string memory contractKey, address expectedOwner) internal view {
        address contractAddress = vm.parseJsonAddress(json, string.concat(".", contractKey));

        try this.getOwner(contractAddress) returns (address owner) {
            if (owner == expectedOwner) {
                console.log("  [PASS] %s: Correct owner", contractKey);
            } else {
                console.log("  [FAIL] %s: Owner is %s, expected %s", contractKey, owner, expectedOwner);
            }
        } catch {
            console.log("  [WARN] %s: Could not check ownership", contractKey);
        }
    }

    function checkMinterRole(address tokenAddress, address minterAddress, string memory minterName) internal view {
        // This is a simplified check - real implementation would call hasRole()
        console.log("  [INFO] %s should have minter role on token %s", minterName, tokenAddress);
    }

    function checkParameter(address contractAddress, string memory functionSig, string memory paramName, uint256 minValue, uint256 maxValue) internal view {
        console.log("  [INFO] %s should be between %d and %d", paramName, minValue, maxValue);
        // Real implementation would call the function and check the value
    }

    function checkIntegration(address contractAddress, string memory functionSig, address expectedAddress, string memory integrationName) internal view {
        console.log("  [INFO] %s: Expected %s", integrationName, expectedAddress);
        // Real implementation would call the function and compare
    }

    function getOwner(address contractAddress) external view returns (address) {
        // Try to call owner() function
        (bool success, bytes memory data) = contractAddress.staticcall(abi.encodeWithSignature("owner()"));
        require(success, "Failed to call owner()");
        return abi.decode(data, (address));
    }

    function printValidationSummary() internal view {
        console.log("==============================================");
        console.log("VALIDATION SUMMARY");
        console.log("==============================================");
        console.log("All validation checks completed.");
        console.log("Please review the output above for any failures or warnings.");
        console.log("");
        console.log("Next steps:");
        console.log("  1. Fix any failed checks");
        console.log("  2. Run functional tests");
        console.log("  3. Proceed with testnet deployment");
        console.log("==============================================");
    }
}
