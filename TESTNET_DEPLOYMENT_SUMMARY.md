# BSC Testnet Deployment Summary

**Deployment Date**: 2025-11-07 02:02:44 UTC  
**Network**: BSC Testnet (ChainID 97)  
**Deployer**: 0x90465a524Fd4c54470f77a11DeDF7503c951E62F  
**Gas Cost**: 0.0060533788 BNB (~0.006 tBNB)  
**Status**: ✅ **Successfully Deployed**

---

## 🎯 Deployment Highlights

- **47 Contracts Deployed** across 13 phases
- **100% Success Rate** on all transactions
- **Token Supply Configured**:
  - USDC (Mock): 1,000,000,000 (1B tokens)
  - HYD (Test RWA): 10,000,000 (10M tokens)
  - PAIMON: 1,000,000,000 minted to deployer

---

## 📋 Core Contract Addresses (Latest Deployment)

### Core Tokens
- **USDP**: `0x6F7021C9B4DCD61b26d1aF5ACd1394A79eb49051`
- **PAIMON**: `0x9c85485176fcD2db01eD0af66ed63680Eb9e5CB2`
- **esPAIMON**: `0x16f3a36Adae84c9c980D6C96510F37A5861DF2C6`
- **HYD** (Test RWA): `0x3803E40C522E23163078c6fB2980288974645d85`

### DeFi Core
- **PSM**: `0xC04288c5f143541d38D5E7EAd152dB69b386a384`
- **DEX Factory**: `0xc32F700393F6d9d39b4f3b30ceF02e7A0795DB5A`
- **DEX Router**: `0x77a9B25d69746d9b51455c2EE71dbcc934365dDB`
- **Treasury**: `0x0BdBeC0efe5f3Db5b771AB095aF1A7051B304E05`
- **USDP Vault**: `0x94E9F52F90609a6941ACc20996CCF9F738Eb22A1`
- **Stability Pool**: `0x594D48f69B14D3f22fa18682F48Bd6fBcB829dA0`

### Governance
- **VotingEscrow**: `0x1A54aA3302a1F2F5BF852517A92587E9c43B15e8`
- **VotingEscrowPaimon**: `0x9f70D468BBdC4e4b0789732DDBCa7eF01E671cC4`
- **GaugeController**: `0x229d5744Edc1684C30A8A393e3d66428bd904b26`
- **EmissionManager**: `0x8bF29ACdeFFBCc3965Aaa225C4CB3EA479e7615a`
- **EmissionRouter**: `0x122e31af6BefAEC17EC5eE2402e31364aCAbE60b`
- **RewardDistributor**: `0xc1867Dea89CaBcCdf207f348C420850dA4DeFF38`
- **BribeMarketplace**: `0x0B6454BF8C2a1111F1ba888AE29000c5FC52d7dF`

### Incentives
- **BoostStaking**: `0xd7b1C5F77F2a2BEB06E3f145eF5cce53E566D2FF`
- **NitroPool**: `0x52712Ef3aa240Bdd46180f3522c1bf7573C1abbA`

### Treasury & Oracle
- **Saving Rate**: `0x3977DB6503795E3c1812765f6910D96848b1e025`
- **Price Oracle**: `0x53E69De7747a373071867eD1f0E0fFd4fC3C7357`
- **RWA Price Oracle**: `0xbEf3913a7FA99985c1C7FfAb9B948C5f93eC2A8b`

### Launchpad
- **Project Registry**: `0x03799e8F66027cE3A96e03bA3a39A641D72961dC`
- **Issuance Controller**: `0xA417eA34907F30DaC280E736b07B867ADB187E0e`

### Mock Contracts (Testnet Only)
- **Mock USDC**: `0x2Dbcd194F22858Ae139Ba026830cBCc5C730FdF4` (1B supply, 6 decimals)
- **Mock USDC Price Feed**: `0xC3071490d44f6122e892b37996308f073D75C4B7`
- **Mock HYD Price Feed**: `0x45E3E8bB1169283Ae9d5B7B65aE5D72227Ea83BF`
- **Mock Pyth**: `0x04c8ca319FBd3378E56bDe0EbDbDb7200f462084`
- **Mock VRF Coordinator**: `0x2aAb24fC469334EE2e81F4A647c876EF921C1A2c`

📄 **Full Address List**: `deployments/testnet/addresses.json`

---

## ✅ Verification Steps Completed

1. ✅ All contracts deployed successfully
2. ✅ Token supplies verified on-chain:
   - USDC: 1e15 (1B with 6 decimals)
   - HYD: 1e25 (10M with 18 decimals)
3. ✅ Deployment artifacts saved:
   - `broadcast/DeployTestnet.s.sol/97/run-latest.json` (209 transactions)
   - `deployments/testnet/addresses.json` (contract addresses)

---

## 🔍 Links

- **BscScan Explorer**: https://testnet.bscscan.com/
- **USDP Contract**: https://testnet.bscscan.com/address/0x69cA4879c52A0935561F9D8165e4CB3b91f951a6
- **DEXRouter**: https://testnet.bscscan.com/address/0x066Db99AE64B1524834a1f97aa1613e2411E13AC
- **Testnet Faucet**: https://testnet.bnbchain.org/faucet-smart

---

## 📝 Next Steps

### Immediate (Day 1-2)
- [ ] Verify contracts on BscScan (run with `--verify` flag)
- [ ] Test PSM swap functionality (USDC ↔ USDP)
- [ ] Test DEX liquidity operations
- [ ] Update frontend configuration

### Short Term (Week 1)
- [ ] Comprehensive functional testing
- [ ] Gas optimization validation
- [ ] veNFT locking and voting tests
- [ ] Treasury collateral deposit tests

### Medium Term (Week 2-4)
- [ ] 7-day stress testing period
- [ ] Community testnet beta
- [ ] Bug bounty program
- [ ] Prepare for mainnet deployment

---

## 🐛 Troubleshooting Notes

### Issue Resolved: Encoding Error

**Problem**: `Error: encode length mismatch: expected 0 types, got 4/6`

**Solution**: Use explicit contract name and function signature:
```bash
forge script script/DeployTestnet.s.sol:DeployTestnetScript --sig "run()" \
  --rpc-url $BSC_TESTNET_RPC --broadcast --legacy
```

**Root Cause**: Foundry broadcast encoding issue without explicit contract specification.

---

## 📞 Support

- **Documentation**: See `DEPLOYMENT.md` for complete deployment guide
- **Quick Start**: See `TESTNET_QUICKSTART.md` for testing guide
- **Issues**: https://github.com/paimondex/paimon-contracts/issues

---

**Deployed by**: Paimon.dex Team  
**Last Updated**: 2025-11-07
