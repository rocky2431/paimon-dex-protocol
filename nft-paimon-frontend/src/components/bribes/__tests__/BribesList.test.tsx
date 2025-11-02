/**
 * BribesList Component Tests
 * TDD: Verify multi-asset display and esPaimon support
 *
 * Test Dimensions:
 * 1. Functional - Multi-asset display per gauge
 * 2. Functional - esPaimon bribes display
 * 3. Boundary - Empty bribes list
 * 4. Exception - Invalid bribe data
 * 5. Compatibility - Responsive design
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BribesList } from '../BribesList';
import { Bribe } from '../types';

describe('BribesList - Functional Tests (Multi-Asset Display)', () => {
  it('should display multiple tokens for a single gauge', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
        tokenSymbol: 'USDC',
        amount: 1000000000000000000000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
        apr: '10.0%',
      },
      {
        bribeId: 1n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 500000000000000000000n,
        amountFormatted: '500',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
        apr: '5.0%',
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should show gauge name only once
    expect(screen.getByText('HYD/USDC')).toBeInTheDocument();

    // Should show both tokens
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();

    // Should show "2 Bribes" chip
    expect(screen.getByText('2 Bribes')).toBeInTheDocument();
  });

  it('should display esPaimon bribe amount correctly', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'PAIMON/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 123450000000000000000n,
        amountFormatted: '123.45',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 50000n,
        apr: '2.5%',
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should show token symbol
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();

    // Should show formatted amount
    expect(screen.getByText('123.45')).toBeInTheDocument();

    // Should show APR
    expect(screen.getByText('2.5%')).toBeInTheDocument();
  });

  it('should group bribes by gauge and display all assets', () => {
    const bribes: Bribe[] = [
      // Gauge 1: HYD/USDC with USDC and esPAIMON bribes
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
        tokenSymbol: 'USDC',
        amount: 1000000000000000000000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
        apr: '10.0%',
      },
      {
        bribeId: 1n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 500000000000000000000n,
        amountFormatted: '500',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
        apr: '5.0%',
      },
      // Gauge 2: PAIMON/BUSD with esPAIMON bribe only
      {
        bribeId: 2n,
        epoch: 1n,
        gauge: '0x3000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'PAIMON/BUSD',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 750000000000000000000n,
        amountFormatted: '750',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 15000n,
        apr: '5.0%',
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should show both gauge names
    expect(screen.getByText('HYD/USDC')).toBeInTheDocument();
    expect(screen.getByText('PAIMON/BUSD')).toBeInTheDocument();

    // Should show all token symbols (2 esPAIMON instances + 1 USDC)
    const esPaimonElements = screen.getAllByText('esPAIMON');
    expect(esPaimonElements).toHaveLength(2); // One for each gauge

    expect(screen.getByText('USDC')).toBeInTheDocument();
  });

  it('should display all 5 whitelisted tokens (USDC, BUSD, WBNB, PAIMON, esPAIMON)', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0xaa3F4B0cEF6F8f4C584cc6fD3A5e79E68dAa13b2' as `0x${string}`,
        tokenSymbol: 'USDC',
        amount: 1000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
      {
        bribeId: 1n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' as `0x${string}`,
        tokenSymbol: 'BUSD',
        amount: 2000n,
        amountFormatted: '2000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
      {
        bribeId: 2n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' as `0x${string}`,
        tokenSymbol: 'WBNB',
        amount: 3000n,
        amountFormatted: '3000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
      {
        bribeId: 3n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000003' as `0x${string}`,
        tokenSymbol: 'PAIMON',
        amount: 4000n,
        amountFormatted: '4000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
      {
        bribeId: 4n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 5000n,
        amountFormatted: '5000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should display all 5 tokens
    expect(screen.getByText('USDC')).toBeInTheDocument();
    expect(screen.getByText('BUSD')).toBeInTheDocument();
    expect(screen.getByText('WBNB')).toBeInTheDocument();
    expect(screen.getByText('PAIMON')).toBeInTheDocument();
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();

    // Should show "5 Bribes" chip
    expect(screen.getByText('5 Bribes')).toBeInTheDocument();
  });
});

describe('BribesList - Boundary Tests', () => {
  it('should display empty state when no bribes', () => {
    render(<BribesList bribes={[]} />);

    expect(screen.getByText('No Active Bribes')).toBeInTheDocument();
    expect(
      screen.getByText('Be the first to create a bribe and incentivize voters!')
    ).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<BribesList bribes={[]} isLoading={true} />);

    expect(screen.getByText('Loading bribes...')).toBeInTheDocument();
  });

  it('should handle single bribe correctly (singular "Bribe" label)', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 1000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should show "1 Bribe" (singular)
    expect(screen.getByText('1 Bribe')).toBeInTheDocument();
  });
});

describe('BribesList - Exception Tests', () => {
  it('should handle bribe with missing APR gracefully', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 1000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
        // APR intentionally missing
      },
    ];

    render(<BribesList bribes={bribes} />);

    // Should still render token
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();

    // Should show default APR
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should display "Connect veNFT" button when no tokenId provided', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 1000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
    ];

    render(<BribesList bribes={bribes} />); // No tokenId

    const connectButtons = screen.getAllByText('Connect veNFT');
    expect(connectButtons.length).toBeGreaterThan(0);
    expect(connectButtons[0]).toBeDisabled();
  });
});

describe('BribesList - Compatibility Tests', () => {
  it('should render without errors on different screen sizes', () => {
    const bribes: Bribe[] = [
      {
        bribeId: 0n,
        epoch: 1n,
        gauge: '0x1000000000000000000000000000000000000000' as `0x${string}`,
        gaugeName: 'HYD/USDC',
        token: '0x0000000000000000000000000000000000000002' as `0x${string}`,
        tokenSymbol: 'esPAIMON',
        amount: 1000n,
        amountFormatted: '1000',
        creator: '0x2000000000000000000000000000000000000000' as `0x${string}`,
        totalVotes: 10000n,
      },
    ];

    // Desktop
    global.innerWidth = 1920;
    const { rerender } = render(<BribesList bribes={bribes} />);
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();

    // Mobile
    global.innerWidth = 375;
    rerender(<BribesList bribes={bribes} />);
    expect(screen.getByText('esPAIMON')).toBeInTheDocument();
  });
});
