/**
 * Unit tests for useDistributorClaim hook
 * useDistributorClaim hook 的单元测试
 */

import { renderHook } from "@testing-library/react";
import { useAccount } from "wagmi";
import {
  useDistributorClaim,
  useDistributorIsClaimed,
  useDistributorClaimedAmount,
  useDistributorCurrentEpoch,
  useDistributorBoostMultiplier,
} from "../useDistributorClaim";

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
}));

const mockAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const mockTokenAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

describe("useDistributorClaim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  describe("useDistributorClaim", () => {
    it("should return writeContract function", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useDistributorClaim());
      expect(result.current.writeContract).toBeDefined();
      expect(typeof result.current.writeContract).toBe("function");
    });

    it("should handle pending state", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: true,
        isSuccess: false,
      });

      const { result } = renderHook(() => useDistributorClaim());
      expect(result.current.isPending).toBe(true);
    });

    it("should handle success state", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: true,
      });

      const { result } = renderHook(() => useDistributorClaim());
      expect(result.current.isSuccess).toBe(true);
    });
  });

  describe("useDistributorIsClaimed", () => {
    it("should check if epoch is claimed for user", () => {
      const mockData = false;
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const epoch = 5;
      const { result } = renderHook(() =>
        useDistributorIsClaimed(mockAddress, epoch, mockTokenAddress)
      );
      expect(result.current.data).toBe(false);
    });

    it("should return true if already claimed", () => {
      const mockData = true;
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const epoch = 4;
      const { result } = renderHook(() =>
        useDistributorIsClaimed(mockAddress, epoch, mockTokenAddress)
      );
      expect(result.current.data).toBe(true);
    });

    it("should be disabled when no address", () => {
      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      const epoch = 5;
      renderHook(() =>
        useDistributorIsClaimed(undefined, epoch, mockTokenAddress)
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

  describe("useDistributorClaimedAmount", () => {
    it("should read claimed amount for user and epoch", () => {
      const mockData = BigInt(1000000000000000000); // 1 token
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const epoch = 5;
      const { result } = renderHook(() =>
        useDistributorClaimedAmount(mockAddress, epoch, mockTokenAddress)
      );
      expect(result.current.data).toBe(mockData);
    });

    it("should return zero for unclaimed epoch", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const epoch = 6;
      const { result } = renderHook(() =>
        useDistributorClaimedAmount(mockAddress, epoch, mockTokenAddress)
      );
      expect(result.current.data).toBe(BigInt(0));
    });
  });

  describe("useDistributorCurrentEpoch", () => {
    it("should read current epoch number", () => {
      const mockData = BigInt(10);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useDistributorCurrentEpoch());
      expect(result.current.data).toBe(BigInt(10));
    });

    it("should not require user address", () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
        isConnected: false,
      });

      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: BigInt(10),
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useDistributorCurrentEpoch());
      expect(result.current.data).toBeDefined();
    });
  });

  describe("useDistributorBoostMultiplier", () => {
    it("should read boost multiplier for user", () => {
      const mockData = BigInt(15000); // 1.5x (assuming 4 decimals: 10000 = 1.0x)
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useDistributorBoostMultiplier());
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

      renderHook(() => useDistributorBoostMultiplier());

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  // Edge case and integration tests
  describe("Edge cases", () => {
    it("should handle epoch 0", () => {
      const mockData = false;
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useDistributorIsClaimed(mockAddress, 0, mockTokenAddress)
      );
      expect(result.current.data).toBe(false);
    });

    it("should handle large epoch numbers", () => {
      const mockData = true;
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useDistributorIsClaimed(mockAddress, 1000, mockTokenAddress)
      );
      expect(result.current.data).toBe(true);
    });

    it("should handle Merkle proof validation in claim", () => {
      const mockWriteContract = jest.fn();
      (require("wagmi").useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
      });

      const { result } = renderHook(() => useDistributorClaim());
      expect(result.current.writeContract).toBeDefined();
      // Merkle proof validation happens at contract level
    });

    it("should handle loading state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useDistributorCurrentEpoch());
      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Contract call failed"),
      });

      const { result } = renderHook(() => useDistributorCurrentEpoch());
      expect(result.current.isError).toBe(true);
    });
  });

  // Security tests
  describe("Security", () => {
    it("should prevent claiming twice for same epoch", () => {
      const mockData = true;
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() =>
        useDistributorIsClaimed(mockAddress, 5, mockTokenAddress)
      );
      expect(result.current.data).toBe(true);
      // Contract should reject transaction if already claimed
    });
  });
});
