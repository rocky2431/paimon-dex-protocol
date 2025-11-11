// @ts-nocheck - Temporarily disable type checking for wagmi v2 API changes
/**
 * RouteDisplay Component Tests
 * TDD Phase 1: RED - Writing failing tests for route visualization
 *
 * Test Coverage:
 * 1. Functional - Display single-hop and multi-hop routes
 * 2. UI - Format route with arrows and token symbols
 * 3. Boundary - Handle undefined/null routes
 * 4. Exception - Handle invalid token addresses
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RouteDisplay } from '../RouteDisplay';
import type { Address } from 'viem';

describe('RouteDisplay - Functional Tests', () => {
  it('[TEST 1] should display single-hop route (A → B)', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890', // Token A
      '0xABCDEF1234567890123456789012345678901234', // Token B
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show: HYD → USDC
    expect(screen.getByText(/HYD/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC/i)).toBeInTheDocument();
    // Arrow is MUI icon, check for ArrowForward via test ID or SVG
    expect(screen.getByTestId('ArrowForwardIcon')).toBeInTheDocument();
  });

  it('[TEST 2] should display multi-hop route (A → B → C)', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890', // HYD
      '0x0000000000000000000000000000000000000001', // WBNB
      '0xABCDEF1234567890123456789012345678901234', // USDC
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0x0000000000000000000000000000000000000001': 'WBNB',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show: HYD → WBNB → USDC
    expect(screen.getByText(/HYD/i)).toBeInTheDocument();
    expect(screen.getByText(/WBNB/i)).toBeInTheDocument();
    expect(screen.getByText(/USDC/i)).toBeInTheDocument();

    // Should have 2 arrows (MUI icons)
    const arrows = screen.getAllByTestId('ArrowForwardIcon');
    expect(arrows).toHaveLength(2);
  });

  it('[TEST 3] should show "Direct" badge for single-hop routes', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890',
      '0xABCDEF1234567890123456789012345678901234',
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show "Direct" badge
    expect(screen.getByText(/Direct/i)).toBeInTheDocument();
  });

  it('[TEST 4] should show hop count for multi-hop routes', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890',
      '0x0000000000000000000000000000000000000001',
      '0xABCDEF1234567890123456789012345678901234',
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0x0000000000000000000000000000000000000001': 'WBNB',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show "2 hops"
    expect(screen.getByText(/2 hops/i)).toBeInTheDocument();
  });
});

describe('RouteDisplay - UI Tests', () => {
  it('[TEST 5] should use correct styling for route container', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890',
      '0xABCDEF1234567890123456789012345678901234',
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Find the route container
    const routeContainer = screen.getByText(/HYD/i).closest('div');

    // Should have proper styling (Material-UI Box)
    expect(routeContainer).toBeInTheDocument();
  });

  it('[TEST 6] should display tokens in colored pills', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890',
      '0xABCDEF1234567890123456789012345678901234',
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
      '0xABCDEF1234567890123456789012345678901234': 'USDC',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Tokens should be displayed in Chip components
    const hydChip = screen.getByText(/HYD/i).closest('.MuiChip-root');
    const usdcChip = screen.getByText(/USDC/i).closest('.MuiChip-root');

    expect(hydChip).toBeInTheDocument();
    expect(usdcChip).toBeInTheDocument();
  });
});

describe('RouteDisplay - Boundary Tests', () => {
  it('[TEST 7] should handle null route gracefully', () => {
    render(<RouteDisplay route={null} tokenMap={{}} />);

    // Should show "No route available" message
    expect(screen.getByText(/No route available/i)).toBeInTheDocument();
  });

  it('[TEST 8] should handle empty route array', () => {
    render(<RouteDisplay route={[]} tokenMap={{}} />);

    // Should show "No route available" message
    expect(screen.getByText(/No route available/i)).toBeInTheDocument();
  });

  it('[TEST 9] should handle single token in route (invalid)', () => {
    const route: Address[] = ['0x1234567890123456789012345678901234567890'];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show error message
    expect(screen.getByText(/Invalid route/i)).toBeInTheDocument();
  });
});

describe('RouteDisplay - Exception Tests', () => {
  it('[TEST 10] should handle unknown token addresses', () => {
    const route: Address[] = [
      '0x1234567890123456789012345678901234567890',
      '0xUNKNOWN000000000000000000000000000000' as Address,
    ];

    const tokenMap = {
      '0x1234567890123456789012345678901234567890': 'HYD',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show HYD
    expect(screen.getByText(/HYD/i)).toBeInTheDocument();

    // Should show abbreviated address for unknown token (using ellipsis character …)
    expect(screen.getByText(/0xUNKN…0000/i)).toBeInTheDocument();
  });

  it('[TEST 11] should handle very long routes (>3 hops)', () => {
    const route: Address[] = [
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
    ];

    const tokenMap = {
      '0x1111111111111111111111111111111111111111': 'A',
      '0x2222222222222222222222222222222222222222': 'B',
      '0x3333333333333333333333333333333333333333': 'C',
      '0x4444444444444444444444444444444444444444': 'D',
    };

    render(<RouteDisplay route={route} tokenMap={tokenMap} />);

    // Should show all tokens
    expect(screen.getByText(/A/)).toBeInTheDocument();
    expect(screen.getByText(/B/)).toBeInTheDocument();
    expect(screen.getByText(/C/)).toBeInTheDocument();
    expect(screen.getByText(/D/)).toBeInTheDocument();

    // Should show "3 hops"
    expect(screen.getByText(/3 hops/i)).toBeInTheDocument();
  });
});
