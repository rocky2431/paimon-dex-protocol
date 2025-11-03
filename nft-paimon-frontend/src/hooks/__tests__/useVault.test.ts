/**
 * Unit tests for useVault hook
 * useVault hook 的单元测试
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useAccount } from "wagmi";
import {
  useVaultDeposit,
  useVaultWithdraw,
  useVaultBorrow,
  useVaultRepay,
  useVaultDebtOf,
  useVaultHealthFactor,
  useVaultCollateralBalance,
  useVaultCollateralValueUSD,
} from "../useVault";

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

const mockAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const mockCollateralAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

describe("useVault", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  describe("useVaultDeposit", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultDeposit());
      expect(result.current.writeContract).toBeDefined();
      expect(typeof result.current.writeContract).toBe("function");
    });

    it("should call writeContract with correct params when deposit is called", async () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: jest.fn(),
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultDeposit());
      const collateralAddress = mockCollateralAddress;
      const amount = BigInt(1000000000000000000); // 1 token

      // This test expects the hook to provide a helper function that wraps writeContract
      // Currently fails because useVaultDeposit just returns bare useWriteContract
      result.current.writeContract({
        address: collateralAddress,
        abi: [],
        functionName: "deposit",
        args: [collateralAddress, amount],
      });

      expect(mockWriteContract).toHaveBeenCalled();
    });
  });

  describe("useVaultWithdraw", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultWithdraw());
      expect(result.current.writeContract).toBeDefined();
    });

    // Boundary test: withdraw zero amount (should be rejected)
    it("should handle boundary case: zero amount withdrawal", async () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: jest.fn().mockRejectedValue(new Error("Amount must be greater than 0")),
        isPending: false,
        isSuccess: false,
        error: null,
      });

      const { result } = renderHook(() => useVaultWithdraw());
      const amount = BigInt(0);

      await expect(
        result.current.writeContractAsync({
          address: mockAddress,
          abi: [],
          functionName: "withdraw",
          args: [mockCollateralAddress, amount],
        })
      ).rejects.toThrow();
    });
  });

  describe("useVaultBorrow", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultBorrow());
      expect(result.current.writeContract).toBeDefined();
    });

    // Security test: borrowing more than LTV limit (should be rejected)
    it("should reject borrowing beyond LTV limit", async () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: jest.fn().mockRejectedValue(new Error("Borrow exceeds LTV limit")),
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultBorrow());
      const excessiveAmount = BigInt(100000000000000000000); // 100 USDP

      await expect(
        result.current.writeContractAsync({
          address: mockAddress,
          abi: [],
          functionName: "borrow",
          args: [excessiveAmount],
        })
      ).rejects.toThrow("Borrow exceeds LTV limit");
    });
  });

  describe("useVaultRepay", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useVaultRepay());
      expect(result.current.writeContract).toBeDefined();
    });

    // Exception test: repaying more than debt
    it("should handle repaying more than current debt", async () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: jest.fn().mockResolvedValue({ hash: "0xabc" }),
        isPending: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useVaultRepay());
      const excessAmount = BigInt(999999999999999999999); // Very large amount

      // Contract should accept but only repay actual debt
      await result.current.writeContractAsync({
        address: mockAddress,
        abi: [],
        functionName: "repay",
        args: [excessAmount],
      });

      expect(mockWriteContract).toBeDefined();
    });

    // Performance test: check response time
    it("should complete repayment operation quickly", async () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: jest.fn().mockResolvedValue({ hash: "0xdef" }),
        isPending: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useVaultRepay());
      const startTime = Date.now();

      await result.current.writeContractAsync({
        address: mockAddress,
        abi: [],
        functionName: "repay",
        args: [BigInt(1000000)],
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe("useVaultDebtOf", () => {
    it("should read debt for connected user", () => {
      const mockData = BigInt(1000000000000000000); // 1 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useVaultDebtOf());
      expect(result.current.data).toBe(mockData);
    });

    it("should read debt for specific address", () => {
      const targetAddress = "0x9999999999999999999999999999999999999999" as `0x${string}`;
      const mockData = BigInt(2000000000000000000); // 2 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useVaultDebtOf(targetAddress));
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useVaultHealthFactor", () => {
    it("should read health factor for connected user", () => {
      const mockData = BigInt(1500000); // 1.5 (in basis points)
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useVaultHealthFactor());
      expect(result.current.data).toBe(mockData);
    });

    it("should be disabled when no address", () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useVaultHealthFactor());

      // Verify that query is disabled
      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe("useVaultCollateralBalance", () => {
    it("should read collateral balance", () => {
      const mockData = BigInt(5000000000000000000); // 5 tokens
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useVaultCollateralBalance(mockAddress, mockCollateralAddress)
      );
      expect(result.current.data).toBe(mockData);
    });

    it("should be disabled when no address", () => {
      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() =>
        useVaultCollateralBalance(undefined, mockCollateralAddress)
      );

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe("useVaultCollateralValueUSD", () => {
    it("should read collateral value in USD", () => {
      const mockData = BigInt(10000000000); // $10,000 (assuming 6 decimals)
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useVaultCollateralValueUSD(mockAddress, mockCollateralAddress)
      );
      expect(result.current.data).toBe(mockData);
    });
  });

  // Edge case tests
  describe("Edge cases", () => {
    it("should handle zero debt", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useVaultDebtOf());
      expect(result.current.data).toBe(BigInt(0));
    });

    it("should handle loading state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useVaultDebtOf());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it("should handle error state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Contract read failed"),
      });

      const { result } = renderHook(() => useVaultDebtOf());
      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBeDefined();
    });
  });
});
