/**
 * Unit tests for useConfigValidation hook
 * useConfigValidation hook 的单元测试
 *
 * Tests cross-network configuration consistency validation
 * 测试跨网配置一致性校验
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useConfigValidation } from "../useConfigValidation";

// Mock wagmi
jest.mock("wagmi", () => ({
  useReadContract: jest.fn(),
  useChainId: jest.fn(),
}));

describe("useConfigValidation", () => {
  const mockUseReadContract = require("wagmi").useReadContract as jest.Mock;
  const mockUseChainId = require("wagmi").useChainId as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Functional Tests", () => {
    it("should validate consistent USDC decimals and PSM SCALE", async () => {
      // Setup: USDC decimals = 6, PSM usdcDecimals = 6 (consistent)
      mockUseChainId.mockReturnValue(97); // BSC Testnet

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          // USDC.decimals()
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          // PSM.usdcDecimals()
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.usdcDecimals).toBe(6);
      expect(result.current.psmUsdcDecimals).toBe(6);
      expect(result.current.psmScale).toBe(BigInt(10 ** 12));
      expect(result.current.expectedScale).toBe(BigInt(10 ** 12));
    });

    it("should validate consistent mainnet config (USDC=18, SCALE=1)", async () => {
      // Setup: USDC decimals = 18, PSM usdcDecimals = 18 (consistent)
      mockUseChainId.mockReturnValue(56); // BSC Mainnet

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.usdcDecimals).toBe(18);
      expect(result.current.psmUsdcDecimals).toBe(18);
      expect(result.current.psmScale).toBe(BigInt(1));
      expect(result.current.expectedScale).toBe(BigInt(1));
    });
  });

  describe("Boundary Tests", () => {
    it("should handle USDC decimals = 0", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(0),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(0),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.expectedScale).toBe(BigInt(10 ** 18));
    });

    it("should handle maximum decimals (18)", async () => {
      mockUseChainId.mockReturnValue(56);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.expectedScale).toBe(BigInt(1));
    });
  });

  describe("Exception Tests", () => {
    it("should detect inconsistent configuration", async () => {
      // Setup: USDC decimals = 6, but PSM usdcDecimals = 18 (wrong!)
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(18), // Wrong! Should be 6
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toContain("Configuration mismatch");
      expect(result.current.usdcDecimals).toBe(6);
      expect(result.current.psmUsdcDecimals).toBe(18);
      expect(result.current.psmScale).toBe(BigInt(1)); // 10^(18-18) = 1
      expect(result.current.expectedScale).toBe(BigInt(10 ** 12)); // 10^(18-6)
    });

    it("should handle USDC.decimals() read error", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error("Contract read failed"),
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toContain("Failed to read USDC decimals");
    });

    it("should handle PSM.SCALE() read error", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: undefined,
            isLoading: false,
            isError: true,
            error: new Error("Contract read failed"),
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toContain("Failed to read PSM SCALE");
    });

    it("should handle network switching during validation", async () => {
      mockUseChainId.mockReturnValueOnce(97).mockReturnValueOnce(56);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result, rerender } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Revalidate after network switch
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBeDefined();
    });
  });

  describe("Security Tests", () => {
    it("should prevent operations when validation fails", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(18), // Inconsistent
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.shouldBlockOperations).toBe(true);
    });

    it("should detect potential precision loss scenarios", async () => {
      // USDC decimals > 18 (invalid scenario, but should be caught)
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(24), // Invalid: exceeds 18
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(24),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toContain("Invalid USDC decimals");
    });
  });

  describe("Performance Tests", () => {
    it("should complete validation within 2 seconds", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      const startTime = Date.now();
      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it("should not cause excessive re-renders", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      let renderCount = 0;
      const { result } = renderHook(() => {
        renderCount++;
        return useConfigValidation();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not exceed 5 renders (initial + data fetching)
      expect(renderCount).toBeLessThanOrEqual(5);
    });
  });

  describe("Compatibility Tests", () => {
    it("should work on BSC Mainnet (ChainID 56)", async () => {
      mockUseChainId.mockReturnValue(56);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(18),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should work on BSC Testnet (ChainID 97)", async () => {
      mockUseChainId.mockReturnValue(97);

      mockUseReadContract.mockImplementation(({ functionName }: any) => {
        if (functionName === 'decimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        } else if (functionName === 'usdcDecimals') {
          return {
            data: BigInt(6),
            isLoading: false,
            isError: false,
          };
        }
      });

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should handle unsupported networks gracefully", async () => {
      mockUseChainId.mockReturnValue(1); // Ethereum Mainnet (not supported)

      mockUseReadContract.mockImplementation(() => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network not supported"),
      }));

      const { result } = renderHook(() => useConfigValidation());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isValid).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });
});
