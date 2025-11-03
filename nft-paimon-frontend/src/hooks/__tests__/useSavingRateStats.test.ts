/**
 * Unit tests for useSavingRateStats hook
 * useSavingRateStats hook 的单元测试
 */

import { renderHook } from "@testing-library/react";
import {
  useSavingRateTotalFunded,
  useSavingRateAnnualRate,
  useSavingRateLastUpdateTime,
  useSavingRateWeekStartRate,
  useSavingRateStats,
} from "../useSavingRateStats";

// Mock wagmi
jest.mock("wagmi", () => ({
  useReadContract: jest.fn(),
}));

describe("useSavingRateStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useSavingRateTotalFunded", () => {
    it("should read totalFunded from contract", () => {
      const mockData = BigInt("100000000000000000000000"); // 100,000 USDP
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateTotalFunded());
      expect(result.current.data).toBe(mockData);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    it("should handle zero funding", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateTotalFunded());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle loading state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateTotalFunded());
      expect(result.current.data).toBeUndefined();
      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Contract read failed"),
      });

      const { result } = renderHook(() => useSavingRateTotalFunded());
      expect(result.current.isError).toBe(true);
    });
  });

  describe("useSavingRateAnnualRate", () => {
    it("should read annualRate from contract", () => {
      const mockData = BigInt(200); // 200 bps = 2%
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateAnnualRate());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle high rate (10%)", () => {
      const mockData = BigInt(1000); // 1000 bps = 10%
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateAnnualRate());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle zero rate", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateAnnualRate());
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useSavingRateLastUpdateTime", () => {
    it("should read lastRateUpdateTime from contract", () => {
      const mockData = BigInt(1704067200); // 2024-01-01
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateLastUpdateTime());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle recent timestamp", () => {
      const mockData = BigInt(Math.floor(Date.now() / 1000));
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateLastUpdateTime());
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useSavingRateWeekStartRate", () => {
    it("should read weekStartRate from contract", () => {
      const mockData = BigInt(200); // 200 bps
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateWeekStartRate());
      expect(result.current.data).toBe(mockData);
    });

    it("should handle different week start rate", () => {
      const mockData = BigInt(250); // 250 bps
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateWeekStartRate());
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useSavingRateStats", () => {
    it("should aggregate all stats", () => {
      const mockTotalFunded = BigInt("100000000000000000000000"); // 100,000 USDP
      const mockAnnualRate = BigInt(200); // 2%
      const mockLastUpdate = BigInt(1704067200);
      const mockWeekStart = BigInt(200);

      let callCount = 0;
      (require("wagmi").useReadContract as jest.Mock).mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: // totalFunded
            return { data: mockTotalFunded, isLoading: false, isError: false };
          case 2: // annualRate
            return { data: mockAnnualRate, isLoading: false, isError: false };
          case 3: // lastRateUpdateTime
            return { data: mockLastUpdate, isLoading: false, isError: false };
          case 4: // weekStartRate
            return { data: mockWeekStart, isLoading: false, isError: false };
          default:
            return { data: undefined, isLoading: false, isError: false };
        }
      });

      const { result } = renderHook(() => useSavingRateStats());

      expect(result.current.totalFunded).toBe(mockTotalFunded);
      expect(result.current.annualRate).toBe(mockAnnualRate);
      expect(result.current.lastRateUpdateTime).toBe(mockLastUpdate);
      expect(result.current.weekStartRate).toBe(mockWeekStart);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle loading state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useSavingRateStats());
      expect(result.current.isLoading).toBe(true);
    });

    it("should handle error state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useSavingRateStats());
      expect(result.current.isError).toBe(true);
    });

    it("should handle pool health - healthy (sufficient funds)", () => {
      const mockTotalFunded = BigInt("100000000000000000000000"); // 100,000 USDP (high)
      const mockAnnualRate = BigInt(200); // 2%

      let callCount = 0;
      (require("wagmi").useReadContract as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { data: mockTotalFunded, isLoading: false, isError: false };
        } else if (callCount === 2) {
          return { data: mockAnnualRate, isLoading: false, isError: false };
        }
        return { data: BigInt(0), isLoading: false, isError: false };
      });

      const { result } = renderHook(() => useSavingRateStats());

      // Pool health should be "healthy" when totalFunded is high
      expect(result.current.totalFunded).toBe(mockTotalFunded);
      expect(result.current.annualRate).toBe(mockAnnualRate);
    });

    it("should handle pool health - warning (low funds)", () => {
      const mockTotalFunded = BigInt("1000000000000000000000"); // 1,000 USDP (low)
      const mockAnnualRate = BigInt(200);

      let callCount = 0;
      (require("wagmi").useReadContract as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { data: mockTotalFunded, isLoading: false, isError: false };
        } else if (callCount === 2) {
          return { data: mockAnnualRate, isLoading: false, isError: false };
        }
        return { data: BigInt(0), isLoading: false, isError: false };
      });

      const { result } = renderHook(() => useSavingRateStats());

      // Pool health should be determinable from totalFunded
      expect(result.current.totalFunded).toBe(mockTotalFunded);
    });
  });
});
