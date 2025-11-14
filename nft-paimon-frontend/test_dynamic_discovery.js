const { createPublicClient, http, getAddress } = require('viem');
const { bscTestnet } = require('viem/chains');

const client = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545')
});

// Use getAddress() to ensure proper checksum
const FACTORY_ADDRESS = getAddress('0x4cC72Aa0BfbFa1C3F782e54C308d87A8da372d43');
const USER_ADDRESS = getAddress('0x90465a524Fd4c54470f77a11DeDF7503c951E62F');

const FACTORY_ABI = [
  {
    inputs: [],
    name: "allPairsLength",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "", type: "uint256" }],
    name: "allPairs",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

const PAIR_ABI = [
  {
    inputs: [],
    name: "token0",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "token1",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

async function testDynamicDiscovery() {
  console.log('🔍 Testing Dynamic Pool Discovery');
  console.log('========================================\n');

  console.log(`Factory: ${FACTORY_ADDRESS}`);
  console.log(`User: ${USER_ADDRESS}\n`);

  // Step 1: Get total number of pairs
  console.log('📊 Step 1: Query total pairs from Factory...');
  const allPairsLength = await client.readContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: 'allPairsLength'
  });

  console.log(`   Total pairs in Factory: ${allPairsLength.toString()}\n`);

  // Step 2: Get all pair addresses
  console.log('📊 Step 2: Enumerate all pair addresses...');
  const pairAddresses = [];
  for (let i = 0; i < Number(allPairsLength); i++) {
    const pairAddress = await client.readContract({
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: 'allPairs',
      args: [BigInt(i)]
    });
    pairAddresses.push(pairAddress);
    console.log(`   [${i}] ${pairAddress}`);
  }
  console.log('');

  // Step 3: Check user's balance for each pair
  console.log('📊 Step 3: Check user LP balances...');
  const balances = [];
  for (const pairAddress of pairAddresses) {
    const balance = await client.readContract({
      address: pairAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [USER_ADDRESS]
    });
    balances.push({ pairAddress, balance });

    const hasBalance = balance > 0n;
    const symbol = hasBalance ? '✅' : '⏭️';
    console.log(`   ${symbol} ${pairAddress}: ${balance.toString()} (${balance > 0n ? 'HAS BALANCE' : 'zero'})`);
  }
  console.log('');

  // Step 4: Get token symbols for pairs with balance > 0
  console.log('📊 Step 4: Get pool details for pairs with balance > 0...');
  const poolsWithBalance = balances.filter(b => b.balance > 0n);

  if (poolsWithBalance.length === 0) {
    console.log('   ❌ No pools found with user balance > 0');
    return;
  }

  for (const { pairAddress, balance } of poolsWithBalance) {
    console.log(`\n   🔍 Pool: ${pairAddress}`);
    console.log(`   💰 LP Balance: ${balance.toString()}`);

    // Get token addresses
    const token0 = await client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'token0'
    });

    const token1 = await client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'token1'
    });

    console.log(`   📌 Token0: ${token0}`);
    console.log(`   📌 Token1: ${token1}`);

    // Get token symbols
    const symbol0 = await client.readContract({
      address: token0,
      abi: ERC20_ABI,
      functionName: 'symbol'
    });

    const symbol1 = await client.readContract({
      address: token1,
      abi: ERC20_ABI,
      functionName: 'symbol'
    });

    console.log(`   🏷️  Pool Name: ${symbol0}/${symbol1}`);
  }

  console.log('\n========================================');
  console.log(`✅ Dynamic discovery successful! Found ${poolsWithBalance.length} pool(s) with user LP tokens.`);
  console.log('\n📋 Summary:');
  poolsWithBalance.forEach(({ pairAddress }, index) => {
    console.log(`   ${index + 1}. ${pairAddress}`);
  });
}

testDynamicDiscovery().catch(console.error);
