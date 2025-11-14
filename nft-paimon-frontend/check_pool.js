const { createPublicClient, http, formatUnits } = require('viem');
const { bscTestnet } = require('viem/chains');

const client = createPublicClient({
  chain: bscTestnet,
  transport: http('https://data-seed-prebsc-1-s1.binance.org:8545')
});

const FACTORY_ABI = [
  {
    inputs: [{ name: "tokenA", type: "address" }, { name: "tokenB", type: "address" }],
    name: "getPair",
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
    type: "function",
  }
];

const PAIR_ABI = [
  {
    inputs: [],
    name: "getReserves",
    outputs: [
      { name: "reserve0", type: "uint112" },
      { name: "reserve1", type: "uint112" },
      { name: "blockTimestampLast", type: "uint32" }
    ],
    stateMutability: "view",
    type: "function",
  },
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
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
];

async function checkPool() {
  const factoryAddress = '0x4cC72Aa0BfbFa1C3F782e54C308d87A8da372d43';
  const paimonAddress = '0x37F76716f550d08Bb6c5FEEE91E46bc9732A0974';
  const usdcAddress = '0xA1112f596A73111E102b4a9c39064b2b2383EC38';
  
  console.log('Querying Factory for PAIMON/USDC pair...');
  const pairAddress = await client.readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: 'getPair',
    args: [paimonAddress, usdcAddress]
  });
  
  console.log('Pair address:', pairAddress);
  
  if (pairAddress === '0x0000000000000000000000000000000000000000') {
    console.log('Pool does not exist!');
    return;
  }
  
  console.log('\nQuerying pair details...');
  const [token0, token1, reserves, totalSupply] = await Promise.all([
    client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'token0'
    }),
    client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'token1'
    }),
    client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'getReserves'
    }),
    client.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'totalSupply'
    })
  ]);
  
  console.log('Token0:', token0);
  console.log('Token1:', token1);
  console.log('Reserve0:', reserves[0].toString());
  console.log('Reserve1:', reserves[1].toString());
  console.log('Total LP Supply:', totalSupply.toString());
  
  // Calculate TVL (assuming both tokens are 18 decimals and $1 each)
  const reserve0Formatted = Number(formatUnits(reserves[0], 18));
  const reserve1Formatted = Number(formatUnits(reserves[1], 18));
  const tvlUSD = reserve0Formatted + reserve1Formatted;
  
  console.log('\nReserve0 formatted:', reserve0Formatted);
  console.log('Reserve1 formatted:', reserve1Formatted);
  console.log('Calculated TVL:', tvlUSD);
  console.log('Meets $10 threshold?', tvlUSD >= 10 ? 'YES' : 'NO');
}

checkPool().catch(console.error);
