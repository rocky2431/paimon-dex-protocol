/**
 * Unit tests for useVaultPosition hook
 * useVaultPosition hook 的单元测试
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useAccount } from "wagmi";
import { useVaultPosition } from "../useVaultPosition";

// Mock wagmi
jest.mock("wagmi", () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
}));

// Mock useVault hooks
jest.mock("../useVault", () => ({
  useVaultDebtOf: jest.fn(),
  useVaultHealthFactor: jest.fn(),
  useVaultCollateralBalance: jest.fn(),
  useVaultCollateralValueUSD: jest.fn(),
}));

const mockAddress = "0x1234567890123456789012345678901234567890" as `0x${string}`;
const mockCollateralAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as `0x${string}`;

describe("useVaultPosition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAccount as jest.Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    });
  });

  it("should aggregate position data correctly", () => {
    const mockDebt = BigInt(1000000000000000000); // 1 USDP
    const mockHealthFactor = BigInt(1500000); // 1.5
    const mockCollateralBalance = BigInt(5000000000000000000); // 5 tokens
    const mockCollateralValue = BigInt(10000000000); // $10,000

    // Mock the hook dependencies
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: mockDebt,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: mockHealthFactor,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: mockCollateralBalance,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: mockCollateralValue,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useVaultPosition(mockAddress, mockCollateralAddress)
    );

    expect(result.current.debt).toBe(mockDebt);
    expect(result.current.healthFactor).toBe(mockHealthFactor);
    expect(result.current.collateralBalance).toBe(mockCollateralBalance);
    expect(result.current.collateralValueUSD).toBe(mockCollateralValue);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("should indicate loading state when any query is loading", () => {
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useVaultPosition(mockAddress, mockCollateralAddress)
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("should indicate error state when any query errors", () => {
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Failed to fetch debt"),
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useVaultPosition(mockAddress, mockCollateralAddress)
    );

    expect(result.current.isError).toBe(true);
  });

  // Boundary test: zero debt position
  it("should handle zero debt position", () => {
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: BigInt(0),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: BigInt(0), // Infinite health factor represented as 0
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: BigInt(5000000000000000000),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: BigInt(10000000000),
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useVaultPosition(mockAddress, mockCollateralAddress)
    );

    expect(result.current.debt).toBe(BigInt(0));
    expect(result.current.healthFactor).toBe(BigInt(0));
  });

  // Boundary test: maximum borrowing (health factor = 1.0)
  it("should handle position at liquidation threshold", () => {
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: BigInt(8000000000000000000), // 8000 USDP
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: BigInt(1000000), // Exactly 1.0 (liquidation threshold)
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: BigInt(5000000000000000000),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: BigInt(10000000000),
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() =>
      useVaultPosition(mockAddress, mockCollateralAddress)
    );

    expect(result.current.healthFactor).toBe(BigInt(1000000)); // At risk
  });

  // Performance test: should complete quickly
  it("should return position data within acceptable time", () => {
    require("../useVault").useVaultDebtOf.mockReturnValue({
      data: BigInt(1000000000000000000),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultHealthFactor.mockReturnValue({
      data: BigInt(1500000),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralBalance.mockReturnValue({
      data: BigInt(5000000000000000000),
      isLoading: false,
      isError: false,
    });

    require("../useVault").useVaultCollateralValueUSD.mockReturnValue({
      data: BigInt(10000000000),
      isLoading: false,
      isError: false,
    });

    const startTime = Date.now();
    renderHook(() => useVaultPosition(mockAddress, mockCollateralAddress));
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100); // Should complete within 100ms
  });
});
