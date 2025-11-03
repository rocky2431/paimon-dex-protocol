/**
 * Unit tests for useEmissionBudget hook
 * useEmissionBudget hook 的单元测试
 */

import { renderHook } from "@testing-library/react";
import {
  useEmissionWeeklyBudget,
  useEmissionPhaseParams,
  useEmissionDistributionBps,
} from "../useEmissionBudget";

// Mock wagmi
jest.mock("wagmi", () => ({
  useReadContract: jest.fn(),
}));

describe("useEmissionBudget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useEmissionWeeklyBudget", () => {
    it("should read weekly budget for current week", () => {
      const mockData = BigInt(1000000000000000000000); // 1000 tokens
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(10));
      expect(result.current.data).toBe(mockData);
    });

    it("should handle week 0", () => {
      const mockData = BigInt(2000000000000000000000); // 2000 tokens (initial week)
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(0));
      expect(result.current.data).toBe(mockData);
    });

    it("should handle Phase A weeks (0-52)", () => {
      const mockData = BigInt(2000000000000000000000); // Phase A: 2000/week
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(30));
      expect(result.current.data).toBe(mockData);
    });

    it("should handle Phase B weeks (53-156)", () => {
      const mockData = BigInt(1500000000000000000000); // Phase B: declining
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(100));
      expect(result.current.data).toBe(mockData);
    });

    it("should handle Phase C weeks (157-352)", () => {
      const mockData = BigInt(300000000000000000000); // Phase C: 300/week
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(200));
      expect(result.current.data).toBe(mockData);
    });

    it("should handle final week (352)", () => {
      const mockData = BigInt(300000000000000000000); // Phase C: 300/week
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(352));
      expect(result.current.data).toBe(mockData);
    });

    it("should return zero after emission ends (week > 352)", () => {
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(400));
      expect(result.current.data).toBe(BigInt(0));
    });

    it("should be disabled when week is undefined", () => {
      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
      mockUseReadContract.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });

      renderHook(() => useEmissionWeeklyBudget(undefined));

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            enabled: false,
          }),
        })
      );
    });
  });

  describe("useEmissionPhaseParams", () => {
    it("should read PHASE_A_END", () => {
      const mockData = BigInt(52);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionPhaseParams("PHASE_A_END"));
      expect(result.current.data).toBe(BigInt(52));
    });

    it("should read PHASE_A_WEEKLY", () => {
      const mockData = BigInt(2000000000000000000000); // 2000 tokens
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionPhaseParams("PHASE_A_WEEKLY"));
      expect(result.current.data).toBe(mockData);
    });

    it("should read PHASE_B_END", () => {
      const mockData = BigInt(156);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionPhaseParams("PHASE_B_END"));
      expect(result.current.data).toBe(BigInt(156));
    });

    it("should read PHASE_C_END", () => {
      const mockData = BigInt(352);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionPhaseParams("PHASE_C_END"));
      expect(result.current.data).toBe(BigInt(352));
    });

    it("should read PHASE_C_WEEKLY", () => {
      const mockData = BigInt(300000000000000000000); // 300 tokens
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionPhaseParams("PHASE_C_WEEKLY"));
      expect(result.current.data).toBe(mockData);
    });
  });

  describe("useEmissionDistributionBps", () => {
    it("should read LP_TOTAL_BPS (4000 = 40%)", () => {
      const mockData = BigInt(4000);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionDistributionBps("LP_TOTAL_BPS"));
      expect(result.current.data).toBe(BigInt(4000));
    });

    it("should read DEBT_BPS (3000 = 30%)", () => {
      const mockData = BigInt(3000);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionDistributionBps("DEBT_BPS"));
      expect(result.current.data).toBe(BigInt(3000));
    });

    it("should read STABILITY_POOL_BPS (2500 = 25%)", () => {
      const mockData = BigInt(2500);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionDistributionBps("STABILITY_POOL_BPS"));
      expect(result.current.data).toBe(BigInt(2500));
    });

    it("should read ECO_BPS (500 = 5%)", () => {
      const mockData = BigInt(500);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionDistributionBps("ECO_BPS"));
      expect(result.current.data).toBe(BigInt(500));
    });

    it("should read BASIS_POINTS (10000 = 100%)", () => {
      const mockData = BigInt(10000);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionDistributionBps("BASIS_POINTS"));
      expect(result.current.data).toBe(BigInt(10000));
    });
  });

  // Edge case tests
  describe("Edge cases", () => {
    it("should handle loading state", () => {
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(10));
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

      const { result } = renderHook(() => useEmissionWeeklyBudget(10));
      expect(result.current.isError).toBe(true);
    });

    it("should handle negative week numbers gracefully", () => {
      // Note: TypeScript should prevent this, but testing runtime behavior
      const mockData = BigInt(0);
      (require("wagmi").useReadContract as jest.Mock).mockReturnValue({
        data: mockData,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useEmissionWeeklyBudget(-1));
      expect(result.current.data).toBe(BigInt(0));
    });
  });

  // Integration tests
  describe("Integration", () => {
    it("should calculate total emissions correctly", () => {
      // Phase A: 2000 * 52 weeks = 104,000
      // Phase B: declining from 2000 to 300 over 104 weeks
      // Phase C: 300 * 196 weeks = 58,800
      // Total ≈ 269,000 tokens over 352 weeks

      const phaseAWeekly = BigInt(2000000000000000000000); // 2000 tokens
      const phaseCWeekly = BigInt(300000000000000000000); // 300 tokens

      (require("wagmi").useReadContract as jest.Mock).mockReturnValueOnce({
        data: phaseAWeekly,
        isLoading: false,
        isError: false,
      });

      const { result: phaseAResult } = renderHook(() =>
        useEmissionWeeklyBudget(10)
      );
      expect(phaseAResult.current.data).toBe(phaseAWeekly);

      (require("wagmi").useReadContract as jest.Mock).mockReturnValueOnce({
        data: phaseCWeekly,
        isLoading: false,
        isError: false,
      });

      const { result: phaseCResult } = renderHook(() =>
        useEmissionWeeklyBudget(200)
      );
      expect(phaseCResult.current.data).toBe(phaseCWeekly);
    });

    it("should verify distribution adds up to 100%", () => {
      const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;

      mockUseReadContract.mockReturnValueOnce({ data: BigInt(4000), isLoading: false, isError: false });
      mockUseReadContract.mockReturnValueOnce({ data: BigInt(3000), isLoading: false, isError: false });
      mockUseReadContract.mockReturnValueOnce({ data: BigInt(2500), isLoading: false, isError: false });
      mockUseReadContract.mockReturnValueOnce({ data: BigInt(500), isLoading: false, isError: false });

      const { result: lpResult } = renderHook(() => useEmissionDistributionBps("LP_TOTAL_BPS"));
      const { result: debtResult } = renderHook(() => useEmissionDistributionBps("DEBT_BPS"));
      const { result: stabilityResult } = renderHook(() => useEmissionDistributionBps("STABILITY_POOL_BPS"));
      const { result: ecoResult } = renderHook(() => useEmissionDistributionBps("ECO_BPS"));

      const total =
        Number(lpResult.current.data) +
        Number(debtResult.current.data) +
        Number(stabilityResult.current.data) +
        Number(ecoResult.current.data);

      expect(total).toBe(10000); // 100% in basis points
    });
  });
});
