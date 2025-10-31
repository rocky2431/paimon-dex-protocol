/**
 * useTreasuryDeposit Hook
 * Handles RWA token approval and Treasury deposit transactions
 */

import { useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
} from "wagmi";
import { ERC20_ABI } from "@/config/contracts/erc20";
import { TREASURY_ABI } from "@/config/contracts/treasury";
import { config } from "@/config";
import { parseUnits } from "viem";

interface UseTreasuryDepositParams {
  tokenAddress?: string;
  amount: string;
  decimals?: number;
}

export function useTreasuryDeposit({
  tokenAddress,
  amount,
  decimals = 18,
}: UseTreasuryDepositParams) {
  const treasuryAddress = config.tokens.treasury as `0x${string}` | undefined;
  const [txStep, setTxStep] = useState<
    "idle" | "approving" | "approved" | "depositing" | "completed"
  >("idle");

  // Parse amount
  const amountBigInt =
    amount && parseFloat(amount) > 0 ? parseUnits(amount, decimals) : 0n;

  // Simulate approve transaction for gas estimation
  const { data: approveSimulation } = useSimulateContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "approve",
    args:
      treasuryAddress && amountBigInt > 0n
        ? [treasuryAddress, amountBigInt]
        : undefined,
    query: {
      enabled:
        !!tokenAddress &&
        !!treasuryAddress &&
        amountBigInt > 0n &&
        txStep === "idle",
    },
  });

  // Approve write hook
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    isError: isApproveError,
    error: approveError,
  } = useWriteContract();

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  // Simulate deposit transaction for gas estimation
  const { data: depositSimulation } = useSimulateContract({
    address: treasuryAddress,
    abi: TREASURY_ABI,
    functionName: "depositRWA",
    args:
      tokenAddress && treasuryAddress && amountBigInt > 0n
        ? [tokenAddress as `0x${string}`, amountBigInt]
        : undefined,
    query: {
      enabled:
        !!tokenAddress &&
        !!treasuryAddress &&
        amountBigInt > 0n &&
        txStep === "approved",
    },
  });

  // Deposit write hook
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositPending,
    isError: isDepositError,
    error: depositError,
  } = useWriteContract();

  // Wait for deposit transaction
  const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } =
    useWaitForTransactionReceipt({
      hash: depositHash,
    });

  // Approve function
  const approve = async () => {
    if (!approveSimulation?.request) {
      throw new Error("Cannot simulate approve transaction");
    }

    setTxStep("approving");
    try {
      await writeApprove(approveSimulation.request);
    } catch (error) {
      setTxStep("idle");
      throw error;
    }
  };

  // Deposit function
  const deposit = async () => {
    if (!depositSimulation?.request) {
      throw new Error("Cannot simulate deposit transaction");
    }

    setTxStep("depositing");
    try {
      await writeDeposit(depositSimulation.request);
    } catch (error) {
      setTxStep("approved");
      throw error;
    }
  };

  // Update step based on transaction status
  if (isApproveSuccess && txStep === "approving") {
    setTxStep("approved");
  }

  if (isDepositSuccess && txStep === "depositing") {
    setTxStep("completed");
  }

  // Calculate estimated gas (from simulations)
  const estimatedApproveGas = approveSimulation?.request?.gas;
  const estimatedDepositGas = depositSimulation?.request?.gas;

  return {
    // Transaction step
    txStep,
    resetStep: () => setTxStep("idle"),

    // Approve
    approve,
    isApprovePending,
    isApproveConfirming,
    isApproveSuccess,
    isApproveError,
    approveError,
    approveHash,
    estimatedApproveGas,

    // Deposit
    deposit,
    isDepositPending,
    isDepositConfirming,
    isDepositSuccess,
    isDepositError,
    depositError,
    depositHash,
    estimatedDepositGas,

    // Overall status
    isLoading:
      isApprovePending ||
      isApproveConfirming ||
      isDepositPending ||
      isDepositConfirming,
    isError: isApproveError || isDepositError,
    error: approveError || depositError,
  };
}
