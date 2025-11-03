/**
 * Unit tests for SavingRateCard component
 * SavingRateCard 组件的单元测试
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { SavingRateCard } from "../SavingRateCard";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("SavingRateCard", () => {
  const mockStats = {
    totalFunded: BigInt("100000000000000000000000"), // 100,000 USDP
    annualRate: BigInt(200), // 2%
    lastRateUpdateTime: BigInt(1704067200), // 2024-01-01
    weekStartRate: BigInt(200), // 2%
  };

  describe("Rendering", () => {
    it("should render card title", () => {
      render(<SavingRateCard stats={mockStats} isLoading={false} />);
      expect(screen.getByText(/saving rate/i)).toBeInTheDocument();
    });

    it("should display annual rate", () => {
      render(<SavingRateCard stats={mockStats} isLoading={false} />);
      // 200 bps = 2%
      expect(screen.getByText(/2\.00%/)).toBeInTheDocument();
    });

    it("should display total funded amount", () => {
      render(<SavingRateCard stats={mockStats} isLoading={false} />);
      // Should format 100,000 USDP as 100.00K
      expect(screen.getByText(/100\.00K/i)).toBeInTheDocument();
    });

    it("should display pool status", () => {
      render(<SavingRateCard stats={mockStats} isLoading={false} />);
      // Should show healthy status for high funding
      expect(screen.getByText(/healthy|健康/i)).toBeInTheDocument();
    });

    it("should display last update time", () => {
      render(<SavingRateCard stats={mockStats} isLoading={false} />);
      // Should format timestamp to readable date
      expect(screen.getByText(/2024|01-01|1\/1/i)).toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("should show skeleton when loading", () => {
      render(
        <SavingRateCard
          stats={{
            totalFunded: undefined,
            annualRate: undefined,
            lastRateUpdateTime: undefined,
            weekStartRate: undefined,
          }}
          isLoading={true}
        />
      );

      const skeletons = screen.getAllByTestId(/skeleton|loading/i);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("should not display data when loading", () => {
      render(
        <SavingRateCard
          stats={{
            totalFunded: undefined,
            annualRate: undefined,
            lastRateUpdateTime: undefined,
            weekStartRate: undefined,
          }}
          isLoading={true}
        />
      );

      expect(screen.queryByText(/2\.00%/)).not.toBeInTheDocument();
    });
  });

  describe("Pool Health Status", () => {
    it("should show healthy status for high funding (>50K)", () => {
      const highFundingStats = {
        ...mockStats,
        totalFunded: BigInt("100000000000000000000000"), // 100,000 USDP
      };

      render(<SavingRateCard stats={highFundingStats} isLoading={false} />);
      expect(screen.getByText(/healthy|健康/i)).toBeInTheDocument();
    });

    it("should show warning status for medium funding (10K-50K)", () => {
      const mediumFundingStats = {
        ...mockStats,
        totalFunded: BigInt("30000000000000000000000"), // 30,000 USDP
      };

      render(<SavingRateCard stats={mediumFundingStats} isLoading={false} />);
      expect(screen.getByText(/warning|警告/i)).toBeInTheDocument();
    });

    it("should show critical status for low funding (<10K)", () => {
      const lowFundingStats = {
        ...mockStats,
        totalFunded: BigInt("5000000000000000000000"), // 5,000 USDP
      };

      render(<SavingRateCard stats={lowFundingStats} isLoading={false} />);
      expect(screen.getByText(/critical|危险/i)).toBeInTheDocument();
    });

    it("should show zero status for no funding", () => {
      const zeroFundingStats = {
        ...mockStats,
        totalFunded: BigInt(0),
      };

      render(<SavingRateCard stats={zeroFundingStats} isLoading={false} />);
      expect(screen.getByText(/no funds|无资金/i)).toBeInTheDocument();
    });
  });

  describe("Rate Formatting", () => {
    it("should format low rate (0.5%)", () => {
      const lowRateStats = {
        ...mockStats,
        annualRate: BigInt(50), // 50 bps = 0.5%
      };

      render(<SavingRateCard stats={lowRateStats} isLoading={false} />);
      expect(screen.getByText(/0\.50%/)).toBeInTheDocument();
    });

    it("should format high rate (10%)", () => {
      const highRateStats = {
        ...mockStats,
        annualRate: BigInt(1000), // 1000 bps = 10%
      };

      render(<SavingRateCard stats={highRateStats} isLoading={false} />);
      expect(screen.getByText(/10\.00%/)).toBeInTheDocument();
    });

    it("should handle zero rate", () => {
      const zeroRateStats = {
        ...mockStats,
        annualRate: BigInt(0),
      };

      render(<SavingRateCard stats={zeroRateStats} isLoading={false} />);
      expect(screen.getByText(/0\.00%/)).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should render with correct Material-UI Card structure", () => {
      const { container } = render(
        <SavingRateCard stats={mockStats} isLoading={false} />
      );

      // Should use MUI Card component
      const card = container.querySelector('[class*="MuiCard"]');
      expect(card).toBeInTheDocument();
    });

    it("should have warm color gradient (orange/red)", () => {
      const { container } = render(
        <SavingRateCard stats={mockStats} isLoading={false} />
      );

      const card = container.querySelector('[class*="MuiCard"]');
      const style = card ? window.getComputedStyle(card) : null;

      // Should use warm colors (orange/red) not blue/purple
      if (style) {
        expect(style.background).toMatch(/#FF|#F[0-9A-F]|orange|red/i);
        expect(style.background).not.toMatch(/#00|#0[0-9A-F]|blue|purple/i);
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined stats gracefully", () => {
      render(
        <SavingRateCard
          stats={{
            totalFunded: undefined,
            annualRate: undefined,
            lastRateUpdateTime: undefined,
            weekStartRate: undefined,
          }}
          isLoading={false}
        />
      );

      // Should render without crashing
      expect(screen.getByText(/saving rate/i)).toBeInTheDocument();
    });

    it("should handle very large funded amount (1B+)", () => {
      const largeFundingStats = {
        ...mockStats,
        totalFunded: BigInt("1500000000000000000000000000"), // 1.5B USDP
      };

      render(<SavingRateCard stats={largeFundingStats} isLoading={false} />);
      // Should format with B suffix
      expect(screen.getByText(/1\.50B/)).toBeInTheDocument();
    });

    it("should handle very old timestamp", () => {
      const oldTimestampStats = {
        ...mockStats,
        lastRateUpdateTime: BigInt(946684800), // 2000-01-01
      };

      render(<SavingRateCard stats={oldTimestampStats} isLoading={false} />);
      // Should still render date without crashing
      expect(screen.getByText(/2000|01-01/i)).toBeInTheDocument();
    });
  });
});
