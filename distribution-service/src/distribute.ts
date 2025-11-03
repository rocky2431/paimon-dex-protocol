import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ethers } from 'ethers';
import { RewardDistribution } from './types';

dotenv.config();

/**
 * Submit Merkle root to RewardDistributor contract
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npm run distribute <merkle-json-path>');
    process.exit(1);
  }

  const merkleJsonPath = args[0];

  try {
    console.log('\n🚀 Starting Merkle Root Submission');
    console.log('====================================\n');

    // Load Merkle data
    console.log(`📂 Loading Merkle data from ${merkleJsonPath}...`);
    const merkleData = JSON.parse(fs.readFileSync(merkleJsonPath, 'utf-8'));

    const epoch = merkleData.epoch;
    const merkleRoot = merkleData.merkleRoot;
    const totalRewards = BigInt(merkleData.totalRewards);

    console.log(`   Epoch: ${epoch}`);
    console.log(`   Merkle Root: ${merkleRoot}`);
    console.log(`   Total Rewards: ${totalRewards}`);
    console.log(`   Recipients: ${merkleData.recipientCount}`);

    // Setup provider and signer
    const rpcUrl = process.env.RPC_URL || 'https://bsc-dataseed.binance.org/';
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error('ADMIN_PRIVATE_KEY not set in environment');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(`\n🔑 Using admin address: ${signer.address}`);

    // Connect to RewardDistributor
    const rewardDistributorAddress = process.env.REWARD_DISTRIBUTOR_ADDRESS;
    if (!rewardDistributorAddress) {
      throw new Error('REWARD_DISTRIBUTOR_ADDRESS not set');
    }

    const rewardDistributorAbi = [
      'function setMerkleRoot(bytes32 root, uint256 epoch) external',
      'function merkleRoots(uint256) view returns (bytes32)',
      'function owner() view returns (address)'
    ];

    const rewardDistributor = new ethers.Contract(
      rewardDistributorAddress,
      rewardDistributorAbi,
      signer
    );

    // Verify ownership
    console.log('\n🔍 Verifying permissions...');
    const owner = await rewardDistributor.owner();
    console.log(`   Contract Owner: ${owner}`);

    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`Signer ${signer.address} is not the owner (${owner})`);
    }

    // Check if root already set
    const existingRoot = await rewardDistributor.merkleRoots(epoch);
    if (existingRoot !== ethers.ZeroHash) {
      console.log(`\n⚠️  Warning: Merkle root already set for epoch ${epoch}`);
      console.log(`   Existing Root: ${existingRoot}`);

      // Ask for confirmation (in production, add interactive prompt)
      if (process.env.FORCE_UPDATE !== 'true') {
        throw new Error('Merkle root already set. Set FORCE_UPDATE=true to override.');
      }
    }

    // Submit transaction
    console.log('\n📤 Submitting transaction...');
    const tx = await rewardDistributor.setMerkleRoot(merkleRoot, epoch);

    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log('   ⏳ Waiting for confirmation...');

    const receipt = await tx.wait();

    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`   ⛽ Gas Used: ${receipt.gasUsed}`);

    // Verify on-chain
    console.log('\n🔍 Verifying on-chain state...');
    const onChainRoot = await rewardDistributor.merkleRoots(epoch);
    console.log(`   On-Chain Root: ${onChainRoot}`);

    if (onChainRoot !== merkleRoot) {
      throw new Error('On-chain root does not match submitted root');
    }

    console.log('\n🎉 Merkle root successfully submitted!');
    console.log('====================================\n');
  } catch (error) {
    console.error('\n❌ Merkle root submission failed:', (error as Error).message);
    process.exit(1);
  }
}

main();
