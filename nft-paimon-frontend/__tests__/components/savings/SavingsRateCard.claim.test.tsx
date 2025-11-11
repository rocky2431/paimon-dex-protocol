/**
 * SavingsRateCard - Claim Address Fix Tests
 *
 * Tests to verify that claim transaction uses correct contract address (SavingRate)
 * instead of user address.
 *
 * Bug: gap-1.2.4
 * Issue: handleClaimInterest was calling user address instead of contract address
 * Fix: Use testnet.tokens.savingRate address
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SavingsRateCard } from '@/components/savings/SavingsRateCard';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { testnet } from '@/config/chains/testnet';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
}));

// Mock saving rate hooks
jest.mock('@/hooks/useSavingRate', () => ({
  useSavingAnnualRate: jest.fn(() => ({
    data: BigInt(500), // 5.00% APR
    isLoading: false,
    error: null,
  })),
  useSavingPrincipal: jest.fn(() => ({
    data: parseUnits('1000', 18), // 1000 USDP deposited
    isLoading: false,
    error: null,
  })),
  useSavingAccruedInterest: jest.fn(() => ({
    data: parseUnits('50', 18), // 50 USDP interest
    isLoading: false,
    error: null,
  })),
  useSavingCurrentInterest: jest.fn(() => ({
    data: parseUnits('50.5', 18), // 50.5 USDP current interest
    isLoading: false,
  })),
  useSavingClaimInterest: jest.fn(() => ({
    writeContract: jest.fn(),
  })),
}));

describe('SavingsRateCard - Claim Address Fix (gap-1.2.4)', () => {
  const mockUserAddress = '0x1234567890123456789012345678901234567890';
  const mockWriteContract = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock connected wallet
    (useAccount as jest.Mock).mockReturnValue({
      address: mockUserAddress,
      isConnected: true,
    });

    // Mock writeContract function
    const useSavingClaimInterest = require('@/hooks/useSavingRate').useSavingClaimInterest;
    useSavingClaimInterest.mockReturnValue({
      writeContract: mockWriteContract,
    });
  });

  /**
   * TEST 1: Functional - Verify contract address used for claim
   *
   * This is the CRITICAL test for gap-1.2.4 bug fix.
   * BEFORE: address = user address (mockUserAddress)
   * AFTER: address = contract address (testnet.tokens.savingRate)
   */
  it('[TEST 1] should use SavingRate contract address for claim, not user address', async () => {
    render(<SavingsRateCard locale="en" />);

    // Wait for component to render with data
    await waitFor(() => {
      expect(screen.getByText('Claim Interest')).toBeInTheDocument();
    });

    // Verify claim button is enabled (has interest to claim)
    const claimButton = screen.getByText('Claim Interest');
    expect(claimButton).not.toBeDisabled();

    // Click claim button
    fireEvent.click(claimButton);

    // Verify writeContract was called with CORRECT address
    await waitFor(() => {
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockWriteContract.mock.calls[0][0];

    // ❌ BEFORE FIX: callArgs.address === mockUserAddress
    // ✅ AFTER FIX: callArgs.address === testnet.tokens.savingRate
    expect(callArgs.address).toBe(testnet.tokens.savingRate);
    expect(callArgs.address).not.toBe(mockUserAddress);
    expect(callArgs.functionName).toBe('claimInterest');
  });

  /**
   * TEST 2: Functional - Verify full claim transaction structure
   */
  it('[TEST 2] should call claimInterest with correct ABI and function name', async () => {
    render(<SavingsRateCard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText('Claim Interest')).toBeInTheDocument();
    });

    const claimButton = screen.getByText('Claim Interest');
    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockWriteContract.mock.calls[0][0];

    expect(callArgs).toEqual({
      address: testnet.tokens.savingRate,
      abi: expect.any(Array), // Should have ABI
      functionName: 'claimInterest',
    });
  });

  /**
   * TEST 3: Boundary - Claim button disabled when no interest
   */
  it('[TEST 3] should disable claim button when accrued interest is zero', async () => {
    const useSavingAccruedInterest = require('@/hooks/useSavingRate').useSavingAccruedInterest;
    useSavingAccruedInterest.mockReturnValue({
      data: BigInt(0), // No interest
      isLoading: false,
      error: null,
    });

    render(<SavingsRateCard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText('Claim Interest')).toBeInTheDocument();
    });

    const claimButton = screen.getByText('Claim Interest');
    expect(claimButton).toBeDisabled();

    // Should not call writeContract when disabled
    fireEvent.click(claimButton);
    expect(mockWriteContract).not.toHaveBeenCalled();
  });

  /**
   * TEST 4: Exception - Handle claim transaction failure
   */
  it('[TEST 4] should handle claim transaction failure gracefully', async () => {
    // Ensure accrued interest is available so button is not disabled
    const useSavingAccruedInterest = require('@/hooks/useSavingRate').useSavingAccruedInterest;
    useSavingAccruedInterest.mockReturnValue({
      data: parseUnits('50', 18),
      isLoading: false,
      error: null,
    });

    mockWriteContract.mockRejectedValueOnce(new Error('Transaction failed'));

    render(<SavingsRateCard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText('Claim Interest')).toBeInTheDocument();
    });

    const claimButton = screen.getByText('Claim Interest');
    expect(claimButton).not.toBeDisabled();

    fireEvent.click(claimButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/transaction failed/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  /**
   * TEST 5: Security - Verify address validation before claim
   */
  it('[TEST 5] should validate user address before allowing claim', async () => {
    // Mock invalid address
    (useAccount as jest.Mock).mockReturnValue({
      address: 'invalid-address',
      isConnected: true,
    });

    render(<SavingsRateCard locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(/invalid address/i)).toBeInTheDocument();
    });

    // Should not show claim button for invalid address
    expect(screen.queryByText('Claim Interest')).not.toBeInTheDocument();
  });

  /**
   * TEST 6: Compatibility - Test with both locales
   */
  it('[TEST 6] should work correctly with Chinese locale', async () => {
    // Ensure accrued interest is available so button is not disabled
    const useSavingAccruedInterest = require('@/hooks/useSavingRate').useSavingAccruedInterest;
    useSavingAccruedInterest.mockReturnValue({
      data: parseUnits('50', 18),
      isLoading: false,
      error: null,
    });

    render(<SavingsRateCard locale="zh" />);

    await waitFor(() => {
      expect(screen.getByText('领取利息')).toBeInTheDocument();
    });

    const claimButton = screen.getByText('领取利息');
    expect(claimButton).not.toBeDisabled();

    fireEvent.click(claimButton);

    await waitFor(() => {
      expect(mockWriteContract).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });

    const callArgs = mockWriteContract.mock.calls[0][0];
    expect(callArgs.address).toBe(testnet.tokens.savingRate);
  });
});
