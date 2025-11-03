/**
 * Tests for ClaimVestedButton component
 * ClaimVestedButton 组件测试
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, jest } from "@jest/globals";
import ClaimVestedButton from "../ClaimVestedButton";
import { useWriteContract } from "wagmi";

describe("ClaimVestedButton", () => {
  const mockWriteContract = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useWriteContract as jest.Mock).mockReturnValue({
      writeContract: mockWriteContract,
      isPending: false,
      isSuccess: false,
      error: null,
    });
  });

  describe("Functional Tests", () => {
    it("should call claim function when clicked", async () => {
      render(<ClaimVestedButton claimableAmount={1000000000000000000000n} />);
      const button = screen.getByRole("button", { name: /claim/i });

      fireEvent.click(button);

      await waitFor(() => {
        expect(mockWriteContract).toHaveBeenCalled();
      });
    });

    it("should be disabled when no claimable amount", () => {
      render(<ClaimVestedButton claimableAmount={0n} />);
      const button = screen.getByRole("button", { name: /claim/i });
      expect(button).toBeDisabled();
    });
  });

  describe("Boundary Tests", () => {
    it("should handle zero claimable amount", () => {
      render(<ClaimVestedButton claimableAmount={0n} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should handle very large amounts", () => {
      const maxUint256 = 2n ** 256n - 1n;
      render(<ClaimVestedButton claimableAmount={maxUint256} />);
      expect(screen.getByRole("button")).toBeEnabled();
    });
  });

  describe("Exception Tests", () => {
    it("should show loading state during transaction", () => {
      (useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: true,
        isSuccess: false,
      });

      render(<ClaimVestedButton claimableAmount={1000000000000000000000n} />);
      expect(screen.getByRole("button")).toBeDisabled();
    });

    it("should handle transaction errors gracefully", () => {
      (useWriteContract as jest.Mock).mockReturnValue({
        writeContract: mockWriteContract,
        isPending: false,
        isSuccess: false,
        error: new Error("Transaction failed"),
      });

      render(<ClaimVestedButton claimableAmount={1000000000000000000000n} />);
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
