# Paimon Distribution Service

Offline snapshot and Merkle tree generation service for Paimon reward distribution.

## Features

- 📸 **On-chain Snapshot**: Fetch debt, LP shares, and stability pool shares from BSC
- ⚖️ **TWAD Calculation**: Time-Weighted Average Debt weight calculation
- 🌳 **Merkle Generation**: Generate Merkle trees using OpenZeppelin library
- ✅ **Validation**: Comprehensive validation before submission
- 📊 **CSV/JSON Output**: Export snapshots, weights, and rewards
- 🔄 **CI/CD Ready**: GitHub Actions workflow for weekly automation

## Installation

```bash
cd distribution-service
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key configuration variables:

- `RPC_URL`: BSC RPC endpoint
- `USDP_VAULT_ADDRESS`: USDPVault contract address
- `STABILITY_POOL_ADDRESS`: StabilityPool contract address
- `REWARD_DISTRIBUTOR_ADDRESS`: RewardDistributor contract address
- `EMISSION_MANAGER_ADDRESS`: EmissionManager contract address
- `LP_TOKEN_ADDRESSES`: Comma-separated LP token addresses
- `ADMIN_PRIVATE_KEY`: Private key for setMerkleRoot (keep secure!)

## Usage

### 1. Generate Snapshot and Merkle Tree

```bash
npm run snapshot <epoch> <users-file>
```

Example:

```bash
# Create users.json with array of addresses
echo '["0xaaaa...", "0xbbbb..."]' > users.json

# Run snapshot for epoch 1
npm run snapshot 1 users.json
```

**Output files** (in `./output/`):
- `snapshot.csv`: Raw on-chain data
- `weights.csv`: TWAD weights for each user
- `rewards.csv`: Final reward allocation
- `merkle.json`: Merkle tree data with proofs
- `summary.txt`: Human-readable summary

### 2. Validate Distribution

```bash
npm run validate ./output/merkle.json
```

Validates:
- ✅ Total rewards ≤ weekly budget
- ✅ No duplicate addresses
- ✅ Merkle root format
- ✅ Proof integrity
- ✅ Reward breakdown consistency

### 3. Submit Merkle Root

```bash
npm run distribute ./output/merkle.json
```

⚠️ **Security Note**: This requires `ADMIN_PRIVATE_KEY` to be set. Use a hardware wallet or secure key management in production.

## Development

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Build

```bash
npm run build
```

## CI/CD Automation

The service includes a GitHub Actions workflow (`.github/workflows/weekly-distribution.yml`) for automated weekly distribution:

**Workflow Steps:**
1. Fetch eligible user addresses from subgraph
2. Generate snapshot at epoch start
3. Calculate TWAD weights
4. Generate Merkle tree
5. Validate distribution
6. Submit Merkle root (manual approval required)

**Schedule**: Every Monday at 00:00 UTC

**Manual Trigger**:
```bash
gh workflow run weekly-distribution.yml -f epoch=1
```

## Architecture

```
src/
├── snapshot.ts         # On-chain data fetching
├── twad.ts            # TWAD weight calculation
├── merkle.ts          # Merkle tree generation
├── validator.ts       # Distribution validation
├── output.ts          # CSV/JSON formatting
├── orchestrator.ts    # Main coordination logic
├── distribute.ts      # Contract interaction (setMerkleRoot)
└── index.ts           # CLI entry point

test/
├── snapshot.test.ts   # 6-dimensional tests
├── twad.test.ts       # 6-dimensional tests
└── merkle.test.ts     # 6-dimensional tests
```

## Testing Standards

All code follows **6-dimensional test coverage**:

1. **Functional**: Core business logic
2. **Boundary**: Edge cases (zero, max, empty)
3. **Exception**: Error handling and retries
4. **Performance**: <2s for 10 users, <500ms for 1000 recipients
5. **Security**: Address validation, overflow protection, proof integrity
6. **Compatibility**: BSC mainnet/testnet, concurrent snapshots

**Coverage Target**: ≥80% overall, 100% for critical paths

## Security Considerations

1. **Private Key Management**: Never commit `ADMIN_PRIVATE_KEY`. Use environment variables or hardware wallets.
2. **Merkle Root Verification**: Always verify on-chain root matches generated root.
3. **Budget Validation**: Service validates total rewards ≤ weekly budget.
4. **Proof Integrity**: OpenZeppelin MerkleTree ensures cryptographic security.
5. **Address Sanitization**: All addresses validated before processing.

## Operational Manual

### Weekly Distribution Checklist

- [ ] Verify RPC endpoint is responsive
- [ ] Fetch current epoch from EmissionManager
- [ ] Fetch eligible user addresses (from subgraph or events)
- [ ] Run snapshot: `npm run snapshot <epoch> users.json`
- [ ] Review `output/summary.txt`
- [ ] Validate distribution: `npm run validate output/merkle.json`
- [ ] Fix any validation errors/warnings
- [ ] Submit Merkle root: `npm run distribute output/merkle.json`
- [ ] Verify on-chain: Check `RewardDistributor.merkleRoots(epoch)`
- [ ] Archive output files to IPFS/S3 for transparency

### Regression Testing

```bash
# Test against BSC testnet
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/ npm test

# Test with production addresses
npm run snapshot 1 production-users.json
npm run validate output/merkle.json
```

### Rollback Procedure

If incorrect Merkle root submitted:

1. **Pause claiming** (if pausable)
2. **Generate correct distribution**
3. **Submit new Merkle root** with same epoch (if contract allows override)
4. **Communicate to users** about the fix

## Troubleshooting

### Issue: RPC rate limiting

**Solution**: Use a paid RPC endpoint or add retry logic with exponential backoff.

### Issue: Users file too large

**Solution**: Process in batches. Split users.json into chunks:

```bash
# Split into batches of 1000
split -l 1000 users.json batch-

# Process each batch
for batch in batch-*; do
  npm run snapshot 1 $batch
done
```

### Issue: Gas estimation failed

**Solution**: Ensure `ADMIN_PRIVATE_KEY` has sufficient BNB for gas fees.

## License

MIT

## Support

For issues or questions:
- GitHub Issues: https://github.com/paimon-protocol/paimon/issues
- Discord: https://discord.gg/paimon
