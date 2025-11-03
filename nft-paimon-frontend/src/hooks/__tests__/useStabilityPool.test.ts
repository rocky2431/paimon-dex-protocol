/**
 * Unit tests for useStabilityPool hook
 * useStabilityPool hook 的单元测试
 */

import { renderHook } from "@testing-library/react";
import { useAccount } from "wagmi";
import {
  useStabilityPoolDeposit,
  useStabilityPoolWithdraw,
  useStabilityPoolClaim,
  useStabilityPoolBalance,
  useStabilityPoolShares,
  useStabilityPoolTotalDeposits,
  useStabilityPoolTotalShares,
  useStabilityPoolPendingGain,
} from "../useStabilityPool";

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

const mockAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const mockCollateralAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

describe("useStabilityPool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  describe("useStabilityPoolDeposit", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useStabilityPoolDeposit());
      expect(result.current.writeContract).toBeDefined();
      expect(typeof result.current.writeContract).toBe("function");
    });
  });

  describe("useStabilityPoolWithdraw", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useStabilityPoolWithdraw());
      expect(result.current.writeContract).toBeDefined();
    });
  });

  describe("useStabilityPoolClaim", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useStabilityPoolClaim());
      expect(result.current.writeContract).toBeDefined();
    });
  });

  describe("useStabilityPoolBalance", () => {
    it("should read balance for connected user", () => {
      const mockData = BigInt(1000000000000000000); // 1 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolBalance());
      expect(result.current.data).toBe(mockData);
    });

    it("should read balance for specific address", () => {
      const targetAddress = "0x9999999999999999999999999999999999999999" as `0x${string}`;
      const mockData = BigInt(2000000000000000000); // 2 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolBalance(targetAddress));
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

      renderHook(() => useStabilityPoolBalance());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe("useStabilityPoolShares", () => {
    it("should read shares for connected user", () => {
      const mockData = BigInt(950000000000000000); // 0.95 shares
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolShares());
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useStabilityPoolTotalDeposits", () => {
    it("should read total deposits", () => {
      const mockData = BigInt(1000000000000000000000); // 1000 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolTotalDeposits());
      expect(result.current.data).toBe(mockData);
    });

    it("should not require user address", () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: BigInt(1000000000000000000000),
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolTotalDeposits());
      expect(result.current.data).toBeDefined();
    });
  });

  describe("useStabilityPoolTotalShares", () => {
    it("should read total shares", () => {
      const mockData = BigInt(950000000000000000000); // 950 shares
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolTotalShares());
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useStabilityPoolPendingGain", () => {
    it("should read pending collateral gain", () => {
      const mockData = BigInt(500000000000000000); // 0.5 tokens
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useStabilityPoolPendingGain(mockAddress, mockCollateralAddress)
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

      renderHook(() => useStabilityPoolPendingGain(undefined, mockCollateralAddress));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  // Edge case tests
  describe("Edge cases", () => {
    it("should handle zero balance", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolBalance());
      expect(result.current.data).toBe(BigInt(0));
    });

    it("should handle large deposit amounts", () => {
      const mockData = BigInt("1000000000000000000000000"); // 1 million USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useStabilityPoolBalance());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle error state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error"),
      });

      const { result } = renderHook(() => useStabilityPoolBalance());
      expect(result.current.isError).toBe(true);
    });
  });
});
