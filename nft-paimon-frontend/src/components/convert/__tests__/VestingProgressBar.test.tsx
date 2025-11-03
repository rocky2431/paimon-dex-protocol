/**
 * Tests for VestingProgressBar component
 * VestingProgressBar 组件测试
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "@jest/globals";
import VestingProgressBar from "../VestingProgressBar";

describe("VestingProgressBar", () => {
  describe("Functional Tests", () => {
    it("should render progress bar with correct percentage", () => {
      render(<VestingProgressBar progress={50} remainingDays={182} />);
      expect(screen.getByText("50%")).toBeInTheDocument();
    });

    it("should display remaining days correctly", () => {
      render(<VestingProgressBar progress={25} remainingDays={274} />);
      expect(screen.getByText(/274.*days remaining/i)).toBeInTheDocument();
    });
  });

  describe("Boundary Tests", () => {
    it("should handle 0% progress", () => {
      render(<VestingProgressBar progress={0} remainingDays={365} />);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("should handle 100% progress", () => {
      render(<VestingProgressBar progress={100} remainingDays={0} />);
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });

  describe("Compatibility Tests", () => {
    it("should render without crashing", () => {
      const { container } = render(<VestingProgressBar progress={50} remainingDays={182} />);
      expect(container).toBeInTheDocument();
    });
  });
});
