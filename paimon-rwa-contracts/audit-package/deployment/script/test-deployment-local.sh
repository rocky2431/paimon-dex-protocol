#!/bin/bash

# Local Deployment Test Script
# Tests the complete deployment on a local Anvil network

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Paimon.dex Local Deployment Test${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Check if Anvil is installed
if ! command -v anvil &> /dev/null; then
    echo -e "${RED}Error: Anvil is not installed${NC}"
    echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}Error: Forge is not installed${NC}"
    echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    exit 1
fi

# Configuration
ANVIL_PORT=8545
ANVIL_PID=""
ANVIL_RPC_URL="http://127.0.0.1:$ANVIL_PORT"

# Anvil default account (first account with 10000 ETH)
# Private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
DEPLOYER_PRIVATE_KEY="ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
DEPLOYER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Cleaning up...${NC}"
    if [ ! -z "$ANVIL_PID" ]; then
        echo "Stopping Anvil (PID: $ANVIL_PID)..."
        kill $ANVIL_PID 2>/dev/null || true
        wait $ANVIL_PID 2>/dev/null || true
    fi

    # Remove temporary deployment file
    if [ -f "deployments/local-test-31337.json" ]; then
        rm -f "deployments/local-test-31337.json"
        echo "Removed temporary deployment file"
    fi

    echo -e "${GREEN}Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Step 1: Start Anvil
echo -e "${YELLOW}[Step 1/5]${NC} Starting Anvil local node..."
anvil --port $ANVIL_PORT --block-time 1 > /dev/null 2>&1 &
ANVIL_PID=$!
echo -e "  ${GREEN}✓${NC} Anvil started (PID: $ANVIL_PID, Port: $ANVIL_PORT)"

# Wait for Anvil to be ready
echo -n "  Waiting for Anvil to be ready"
for i in {1..10}; do
    if curl -s -X POST --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $ANVIL_RPC_URL > /dev/null 2>&1; then
        echo ""
        echo -e "  ${GREEN}✓${NC} Anvil is ready"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 10 ]; then
        echo ""
        echo -e "${RED}Error: Anvil failed to start${NC}"
        exit 1
    fi
done
echo ""

# Step 2: Build contracts
echo -e "${YELLOW}[Step 2/5]${NC} Building contracts..."
if forge build > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Contracts compiled successfully"
else
    echo -e "  ${RED}✗${NC} Compilation failed"
    forge build  # Show errors
    exit 1
fi
echo ""

# Step 3: Create temporary .env file for testing
echo -e "${YELLOW}[Step 3/5]${NC} Configuring test environment..."
cat > .env.test << EOF
PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY
DEPLOYER_ADDRESS=$DEPLOYER_ADDRESS
IS_TESTNET=true
BSC_TESTNET_RPC=$ANVIL_RPC_URL
BSCSCAN_API_KEY=test_api_key
AUTO_VERIFY=false
SAVE_DEPLOYMENT=true
DEPLOYMENT_OUTPUT_DIR=./deployments
EOF
echo -e "  ${GREEN}✓${NC} Test environment configured"
echo ""

# Step 4: Run deployment script
echo -e "${YELLOW}[Step 4/5]${NC} Running deployment script..."
echo -e "  ${BLUE}This may take 2-3 minutes...${NC}"
echo ""

# Export environment variables
export $(cat .env.test | xargs)

if forge script script/DeployComplete.s.sol \
    --rpc-url $ANVIL_RPC_URL \
    --broadcast \
    --slow 2>&1 | tee deployment-test.log; then
    echo ""
    echo -e "  ${GREEN}✓${NC} Deployment completed successfully"
else
    echo ""
    echo -e "  ${RED}✗${NC} Deployment failed"
    echo -e "${YELLOW}Check deployment-test.log for details${NC}"
    exit 1
fi
echo ""

# Step 5: Validate deployment
echo -e "${YELLOW}[Step 5/5]${NC} Validating deployment..."

# Check if deployment file exists
DEPLOYMENT_FILE="deployments/local-test-31337.json"
if [ ! -f "$DEPLOYMENT_FILE" ]; then
    # Try alternative name
    DEPLOYMENT_FILE=$(ls deployments/*31337*.json 2>/dev/null | head -1)
    if [ -z "$DEPLOYMENT_FILE" ]; then
        echo -e "  ${RED}✗${NC} Deployment file not found"
        exit 1
    fi
fi

echo -e "  ${BLUE}Deployment file:${NC} $DEPLOYMENT_FILE"

# Count deployed contracts
CONTRACTS_DEPLOYED=$(cat $DEPLOYMENT_FILE | grep -o '"0x[a-fA-F0-9]\{40\}"' | wc -l | tr -d ' ')
echo -e "  ${BLUE}Contracts deployed:${NC} $CONTRACTS_DEPLOYED"

# Expected minimum contracts (should be around 25-30)
MIN_EXPECTED_CONTRACTS=20
if [ "$CONTRACTS_DEPLOYED" -ge "$MIN_EXPECTED_CONTRACTS" ]; then
    echo -e "  ${GREEN}✓${NC} Deployment validation passed"
else
    echo -e "  ${YELLOW}⚠${NC} Warning: Expected at least $MIN_EXPECTED_CONTRACTS contracts, found $CONTRACTS_DEPLOYED"
fi

# Verify critical contracts exist
echo ""
echo -e "  ${BLUE}Verifying critical contracts:${NC}"
CRITICAL_CONTRACTS=("usdp" "paimon" "psm" "votingEscrow" "gaugeController" "dexFactory" "dexRouter" "treasury")
ALL_CRITICAL_EXIST=true

for contract in "${CRITICAL_CONTRACTS[@]}"; do
    if grep -q "\"$contract\"" $DEPLOYMENT_FILE; then
        echo -e "    ${GREEN}✓${NC} $contract"
    else
        echo -e "    ${RED}✗${NC} $contract (missing)"
        ALL_CRITICAL_EXIST=false
    fi
done

echo ""

# Step 6: Run initialization (optional, commented out for now)
# echo -e "${YELLOW}[Step 6/6]${NC} Running initialization..."
# if forge script script/config/InitializeContracts.s.sol \
#     --rpc-url $ANVIL_RPC_URL \
#     --broadcast \
#     --sig "run(string)" \
#     $DEPLOYMENT_FILE 2>&1 | tee initialization-test.log; then
#     echo -e "  ${GREEN}✓${NC} Initialization completed"
# else
#     echo -e "  ${YELLOW}⚠${NC} Initialization failed (this is optional for testing)"
# fi
# echo ""

# Final summary
echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "  Network: ${GREEN}Anvil (ChainID: 31337)${NC}"
echo -e "  Deployer: ${GREEN}$DEPLOYER_ADDRESS${NC}"
echo -e "  Contracts Deployed: ${GREEN}$CONTRACTS_DEPLOYED${NC}"
echo -e "  Deployment File: ${GREEN}$DEPLOYMENT_FILE${NC}"

if [ "$ALL_CRITICAL_EXIST" = true ] && [ "$CONTRACTS_DEPLOYED" -ge "$MIN_EXPECTED_CONTRACTS" ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}✓ Deployment script is ready for testnet/mainnet${NC}"
    EXIT_CODE=0
else
    echo ""
    echo -e "${YELLOW}⚠ Some checks failed${NC}"
    echo -e "${YELLOW}⚠ Review the deployment before proceeding${NC}"
    EXIT_CODE=1
fi

echo -e "${BLUE}=================================================${NC}"
echo ""

# Cleanup .env.test
rm -f .env.test

exit $EXIT_CODE
