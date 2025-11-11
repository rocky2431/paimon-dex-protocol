/**
 * Contract ABI Registry
 * Centralized management of all contract ABIs
 */

// Protocol contract ABIs
export { TREASURY_ABI } from "./treasury";
export { USDP_TOKEN_ABI, PAIMON_TOKEN_ABI, VE_NFT_ABI } from "./tokens";
// export { LAUNCHPAD_ABI } from './launchpad';
// export { GOVERNANCE_ABI } from './governance';

// DEX contract ABIs
export { PANCAKE_ROUTER_ABI, PANCAKE_FACTORY_ABI } from "./dex";
export { DEX_ROUTER_ABI } from "./dexRouter";
// export { LIQUIDITY_POOL_ABI } from './liquidity';

// External contract ABIs
export { ERC20_ABI, ERC721_ABI } from "./external";

// Utility ABIs
// export { MULTICALL_ABI } from './utility';

// Type definitions for ABI arrays
export type ABI = readonly any[];
