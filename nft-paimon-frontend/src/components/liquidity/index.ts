/**
 * Liquidity Components Export
 * Central export file for all liquidity-related components
 */

// ==================== Add Liquidity ====================
export { AddLiquidityCard } from "./AddLiquidityCard";
export { AddLiquidityButton } from "./AddLiquidityButton";
export { TokenInputPair } from "./TokenInputPair";
export { LiquidityPreview as AddLiquidityPreviewComponent } from "./LiquidityPreview";

// ==================== Remove Liquidity ====================
export { RemoveLiquidityCard } from "./RemoveLiquidityCard";
export { RemoveLiquidityButton } from "./RemoveLiquidityButton";
export { RemovePercentageSlider } from "./RemovePercentageSlider";
export { LPTokenDisplay } from "./LPTokenDisplay";
export { RemovePreview } from "./RemovePreview";

// ==================== Staking (Liquidity Mining) ====================
export { StakingCard } from "./StakingCard";
export { StakingButton } from "./StakingButton";
export { StakeAmountInput } from "./StakeAmountInput";
export { StakingStats } from "./StakingStats";
export { RewardsDisplay } from "./RewardsDisplay";
export { ClaimRewardsButton } from "./ClaimRewardsButton";

// ==================== Shared Components ====================
export { PoolSelector } from "./PoolSelector";

// ==================== Hooks ====================
export { useAddLiquidity } from "./hooks/useAddLiquidity";
export { useRemoveLiquidity } from "./hooks/useRemoveLiquidity";
export { useStaking } from "./hooks/useStaking";
export { useClaimRewards } from "./hooks/useClaimRewards";

// ==================== Types ====================
export type {
  Token,
  LiquidityPool,
  TokenAmount,
  AddLiquidityFormData,
  LiquidityPreview,
  AddLiquidityResult,
  AddLiquidityParams,
  RemoveLiquidityFormData,
  RemoveLiquidityPreview,
  RemoveLiquidityResult,
  RemoveLiquidityParams,
  StakingFormData,
  StakingInfo,
  ValidationResult,
} from "./types";

export {
  AddLiquidityState,
  RemoveLiquidityState,
  StakingState,
  PoolType,
} from "./types";

// ==================== Constants ====================
export {
  LIQUIDITY_ADDRESSES,
  SUPPORTED_TOKENS,
  LIQUIDITY_POOLS,
  getGaugeAddress,
  SLIPPAGE_PRESETS,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  REMOVE_PERCENTAGE_PRESETS,
  LIQUIDITY_DESIGN_TOKENS,
  ANIMATION_CONFIG,
} from "./constants";
