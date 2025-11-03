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
