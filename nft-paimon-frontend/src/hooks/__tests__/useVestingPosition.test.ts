/**
 * Tests for useVestingPosition hook
 * useVestingPosition hook 的测试
 */

import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { useVestingPosition } from "../useVestingPosition";
import { useReadContract, useAccount } from "wagmi";

describe("useVestingPosition", () => {
  const mockAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
  const VESTING_PERIOD = 365n * 24n * 60n * 60n; // 365 days in seconds
  const ONE_DAY = 24n * 60n * 60n;

  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
    });
  });

  describe("Functional Tests - Core Logic", () => {
    it("should calculate vesting position correctly for 50% progress", () => {
      const totalAmount = 1000000000000000000000n; // 1000 tokens (18 decimals)
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD / 2n)); // Started 182.5 days ago
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.totalVested).toBe(totalAmount);
      expect(result.current.vested).toBeGreaterThanOrEqual(totalAmount / 2n - 1000000000000000000n); // ~500 tokens (with 1 token tolerance)
      expect(result.current.vested).toBeLessThanOrEqual(totalAmount / 2n + 1000000000000000000n);
      expect(result.current.locked).toBeGreaterThanOrEqual(totalAmount / 2n - 1000000000000000000n);
      expect(result.current.locked).toBeLessThanOrEqual(totalAmount / 2n + 1000000000000000000n);
      expect(result.current.claimable).toBe(result.current.vested); // No claims yet
      expect(result.current.vestingProgress).toBeGreaterThanOrEqual(49);
      expect(result.current.vestingProgress).toBeLessThanOrEqual(51);
      expect(result.current.remainingDays).toBeGreaterThanOrEqual(182);
      expect(result.current.remainingDays).toBeLessThanOrEqual(183);
    });

    it("should calculate claimable amount correctly when partially claimed", () => {
      const totalAmount = 1000000000000000000000n; // 1000 tokens
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD / 2n));
      const claimedAmount = 200000000000000000000n; // 200 tokens already claimed

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      // Should have ~500 vested, but 200 already claimed, so ~300 claimable
      expect(result.current.claimable).toBeGreaterThanOrEqual(290000000000000000000n);
      expect(result.current.claimable).toBeLessThanOrEqual(310000000000000000000n);
    });
  });

  describe("Boundary Tests - Edge Cases", () => {
    it("should return zero values when no vesting position exists", () => {
      (useReadContract as jest.Mock).mockReturnValue({
        data: [0n, 0n, 0n, 0n],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.totalVested).toBe(0n);
      expect(result.current.vested).toBe(0n);
      expect(result.current.locked).toBe(0n);
      expect(result.current.claimable).toBe(0n);
      expect(result.current.vestingProgress).toBe(0);
      expect(result.current.remainingDays).toBe(0);
    });

    it("should handle fully vested position (365 days elapsed)", () => {
      const totalAmount = 1000000000000000000000n;
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD)); // Started 365 days ago
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.vested).toBe(totalAmount); // Fully vested
      expect(result.current.locked).toBe(0n); // Nothing locked
      expect(result.current.vestingProgress).toBe(100); // 100% progress
      expect(result.current.remainingDays).toBe(0); // No days remaining
    });

    it("should handle newly created vesting position (0 days elapsed)", () => {
      const totalAmount = 1000000000000000000000n;
      const startTime = BigInt(Math.floor(Date.now() / 1000)); // Just started
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.vested).toBeLessThanOrEqual(1000000000000000n); // Nearly 0 vested (max 0.000001 tokens)
      expect(result.current.locked).toBeGreaterThanOrEqual(totalAmount - 1000000000000000n); // Nearly all locked
      expect(result.current.vestingProgress).toBeLessThanOrEqual(1); // Nearly 0% progress
      expect(result.current.remainingDays).toBeGreaterThanOrEqual(364); // Nearly 365 days remaining
    });

    it("should handle very large amounts (max uint256)", () => {
      const maxUint256 = 2n ** 256n - 1n;
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD / 2n));
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [maxUint256, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      // Should not overflow or throw errors
      expect(result.current.totalVested).toBe(maxUint256);
      expect(result.current.vested).toBeGreaterThan(0n);
      expect(result.current.vestingProgress).toBeGreaterThanOrEqual(49);
      expect(result.current.vestingProgress).toBeLessThanOrEqual(51);
    });
  });

  describe("Exception Tests - Error Handling", () => {
    it("should handle loading state gracefully", () => {
      (useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.totalVested).toBe(0n);
    });

    it("should handle error state gracefully", () => {
      (useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error("Contract call failed"),
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      expect(result.current.error).toBeDefined();
      expect(result.current.totalVested).toBe(0n);
    });

    it("should handle undefined address", () => {
      (useAccount as jest.Mock).mockReturnValue({
        address: undefined,
      });

      (useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition());

      expect(result.current.totalVested).toBe(0n);
    });

    it("should handle malformed contract data", () => {
      (useReadContract as jest.Mock).mockReturnValue({
        data: [null, null, null, null],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      // Should not crash, return safe defaults
      expect(result.current.totalVested).toBe(0n);
      expect(result.current.vested).toBe(0n);
    });
  });

  describe("Performance Tests - Calculation Efficiency", () => {
    it("should complete calculations in under 100ms", () => {
      const totalAmount = 1000000000000000000000n;
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD / 2n));
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const start = performance.now();
      const { result } = renderHook(() => useVestingPosition(mockAddress));
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
      expect(result.current.vestingProgress).toBeGreaterThan(0);
    });
  });

  describe("Security Tests - Data Validation", () => {
    it("should prevent negative vested amounts", () => {
      const totalAmount = 1000000000000000000000n;
      const startTime = BigInt(Math.floor(Date.now() / 1000) + Number(VESTING_PERIOD)); // Future start time (invalid)
      const claimedAmount = 0n;

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      // Should clamp to 0, not negative
      expect(result.current.vested).toBeGreaterThanOrEqual(0n);
      expect(result.current.locked).toBeGreaterThanOrEqual(0n);
    });

    it("should prevent claimed amount exceeding total vested", () => {
      const totalAmount = 1000000000000000000000n;
      const startTime = BigInt(Math.floor(Date.now() / 1000) - Number(VESTING_PERIOD / 4n)); // 25% vested
      const claimedAmount = 5000000000000000000000n; // 5000 tokens claimed (more than total!)

      (useReadContract as jest.Mock).mockReturnValue({
        data: [totalAmount, claimedAmount, startTime, startTime],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(mockAddress));

      // Claimable should be 0, not negative
      expect(result.current.claimable).toBe(0n);
    });
  });

  describe("Compatibility Tests - Cross-environment", () => {
    it("should work with different address formats", () => {
      const checksummedAddress = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed" as `0x${string}`;

      (useAccount as jest.Mock).mockReturnValue({
        address: checksummedAddress,
      });

      (useReadContract as jest.Mock).mockReturnValue({
        data: [1000000000000000000000n, 0n, BigInt(Math.floor(Date.now() / 1000)), BigInt(Math.floor(Date.now() / 1000))],
        isLoading: false,
        error: null,
      });

      const { result } = renderHook(() => useVestingPosition(checksummedAddress));

      expect(result.current.totalVested).toBe(1000000000000000000000n);
    });
  });
});
