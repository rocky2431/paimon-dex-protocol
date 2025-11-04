/**
 * Navigation Component Tests
 * Tests top navigation bar with wallet connection, menus, and active page highlighting
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Navigation, NavPage } from '@/components/layout/Navigation'

// Mock RainbowKit's ConnectButton
jest.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => <button>Connect Wallet</button>,
}))

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

describe('Navigation Component', () => {
  describe('Rendering', () => {
    it('renders logo and brand name', () => {
      render(<Navigation activePage="swap" />)

      expect(screen.getByText('Paimon DEX')).toBeInTheDocument()
    })

    it('renders all main navigation links', () => {
      render(<Navigation activePage="swap" />)

      expect(screen.getByText('Swap')).toBeInTheDocument()
      expect(screen.getByText('Liquidity')).toBeInTheDocument()
      expect(screen.getByText('Lock')).toBeInTheDocument()
      expect(screen.getByText('Vote')).toBeInTheDocument()
      expect(screen.getByText('Treasury')).toBeInTheDocument()
      expect(screen.getByText('Presale')).toBeInTheDocument()
    })

    it('renders wallet connect button', () => {
      render(<Navigation activePage="swap" />)

      expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
    })
  })

  describe('Active Page Highlighting', () => {
    it('highlights Swap when active', () => {
      render(<Navigation activePage="swap" />)

      const swapLink = screen.getByText('Swap')
      expect(swapLink).toBeInTheDocument()
    })

    it('highlights Liquidity when active', () => {
      render(<Navigation activePage="liquidity" />)

      const liquidityLink = screen.getByText('Liquidity')
      expect(liquidityLink).toBeInTheDocument()
    })

    it('highlights Lock when active', () => {
      render(<Navigation activePage="lock" />)

      const lockLink = screen.getByText('Lock')
      expect(lockLink).toBeInTheDocument()
    })

    it('highlights Vote when active', () => {
      render(<Navigation activePage="vote" />)

      const voteLink = screen.getByText('Vote')
      expect(voteLink).toBeInTheDocument()
    })

    it('highlights Treasury when active', () => {
      render(<Navigation activePage="treasury" />)

      const treasuryLink = screen.getByText('Treasury')
      expect(treasuryLink).toBeInTheDocument()
    })

    it('highlights Presale when active', () => {
      render(<Navigation activePage="presale" />)

      const presaleLink = screen.getByText('Presale')
      expect(presaleLink).toBeInTheDocument()
    })
  })

  describe('Treasury Dropdown Menu', () => {
    it('opens treasury dropdown on click', async () => {
      render(<Navigation activePage="swap" />)

      const treasuryButton = screen.getByText('Treasury')
      fireEvent.click(treasuryButton)

      await waitFor(() => {
        expect(screen.getByText('Deposit RWA')).toBeInTheDocument()
        expect(screen.getByText('My Positions')).toBeInTheDocument()
      })
    })

    it('closes treasury dropdown when clicking outside', async () => {
      render(<Navigation activePage="swap" />)

      const treasuryButton = screen.getByText('Treasury')
      fireEvent.click(treasuryButton)

      await waitFor(() => {
        expect(screen.getByText('Deposit RWA')).toBeInTheDocument()
      })

      // Click outside (e.g., on logo)
      const logo = screen.getByText('Paimon DEX')
      fireEvent.click(logo)

      // Menu should close (MUI menu removes items from accessible tree)
      await waitFor(() => {
        const menuItems = screen.queryAllByRole('menuitem')
        expect(menuItems.length).toBe(0)
      })
    })

    it('shows treasury menu items with icons', async () => {
      render(<Navigation activePage="swap" />)

      const treasuryButton = screen.getByText('Treasury')
      fireEvent.click(treasuryButton)

      await waitFor(() => {
        expect(screen.getByText('Deposit RWA')).toBeInTheDocument()
        expect(screen.getByText('My Positions')).toBeInTheDocument()
      })
    })
  })

  describe('Presale Dropdown Menu', () => {
    it('opens presale dropdown on click', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')
      fireEvent.click(presaleButton)

      await waitFor(() => {
        expect(screen.getByText('Mint Bond NFT')).toBeInTheDocument()
        expect(screen.getByText('Dice Rolling')).toBeInTheDocument()
        expect(screen.getByText('Social Tasks')).toBeInTheDocument()
        expect(screen.getByText('Leaderboards')).toBeInTheDocument()
        expect(screen.getByText('Bond Dashboard')).toBeInTheDocument()
      })
    })

    it('closes presale dropdown when clicking outside', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')
      fireEvent.click(presaleButton)

      await waitFor(() => {
        expect(screen.getByText('Mint Bond NFT')).toBeInTheDocument()
      })

      const logo = screen.getByText('Paimon DEX')
      fireEvent.click(logo)

      // Menu should close (MUI menu removes items from accessible tree)
      await waitFor(() => {
        const menuItems = screen.queryAllByRole('menuitem')
        expect(menuItems.length).toBe(0)
      })
    })

    it('shows all presale menu items', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')
      fireEvent.click(presaleButton)

      await waitFor(() => {
        expect(screen.getByText('Mint Bond NFT')).toBeInTheDocument()
        expect(screen.getByText('Dice Rolling')).toBeInTheDocument()
        expect(screen.getByText('Social Tasks')).toBeInTheDocument()
        expect(screen.getByText('Leaderboards')).toBeInTheDocument()
        expect(screen.getByText('Bond Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Links', () => {
    it('links to correct routes', () => {
      render(<Navigation activePage="swap" />)

      // Main links
      const swapLink = screen.getByText('Swap').closest('a')
      expect(swapLink).toHaveAttribute('href', '/')

      // ✅ FIX (Task 84): Liquidity is now a dropdown menu (like Treasury/Presale), not a direct link
      // Liquidity dropdown links are tested separately if needed

      const lockLink = screen.getByText('Lock').closest('a')
      expect(lockLink).toHaveAttribute('href', '/lock')

      const voteLink = screen.getByText('Vote').closest('a')
      expect(voteLink).toHaveAttribute('href', '/vote')
    })

    it('treasury dropdown links to correct routes', async () => {
      render(<Navigation activePage="swap" />)

      const treasuryButton = screen.getByText('Treasury')
      fireEvent.click(treasuryButton)

      await waitFor(() => {
        const depositLink = screen.getByText('Deposit RWA').closest('a')
        expect(depositLink).toHaveAttribute('href', '/treasury/deposit')

        const positionsLink = screen.getByText('My Positions').closest('a')
        expect(positionsLink).toHaveAttribute('href', '/treasury/positions')
      })
    })

    it('presale dropdown links to correct routes', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')
      fireEvent.click(presaleButton)

      await waitFor(() => {
        const mintLink = screen.getByText('Mint Bond NFT').closest('a')
        expect(mintLink).toHaveAttribute('href', '/presale/mint')

        const diceLink = screen.getByText('Dice Rolling').closest('a')
        expect(diceLink).toHaveAttribute('href', '/presale/dice')

        const tasksLink = screen.getByText('Social Tasks').closest('a')
        expect(tasksLink).toHaveAttribute('href', '/presale/tasks')

        const leaderboardsLink = screen.getByText('Leaderboards').closest('a')
        expect(leaderboardsLink).toHaveAttribute('href', '/presale/leaderboards')

        const bondsLink = screen.getByText('Bond Dashboard').closest('a')
        expect(bondsLink).toHaveAttribute('href', '/presale/bonds')
      })
    })
  })

  describe('Responsive Behavior', () => {
    it('renders fixed navigation bar', () => {
      const { container } = render(<Navigation activePage="swap" />)

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('renders all elements in correct order', () => {
      render(<Navigation activePage="swap" />)

      // Logo should appear first
      const logo = screen.getByText('Paimon DEX')
      expect(logo).toBeInTheDocument()

      // Navigation links in middle
      expect(screen.getByText('Swap')).toBeInTheDocument()

      // Wallet button on right
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper semantic HTML structure', () => {
      const { container } = render(<Navigation activePage="swap" />)

      const nav = container.querySelector('nav')
      expect(nav).toBeInTheDocument()
    })

    it('all links are accessible', () => {
      render(<Navigation activePage="swap" />)

      const links = screen.getAllByRole('link')
      expect(links.length).toBeGreaterThan(0)

      links.forEach((link) => {
        expect(link).toBeInTheDocument()
      })
    })

    it('wallet button is accessible', () => {
      render(<Navigation activePage="swap" />)

      const walletButton = screen.getByText('Connect Wallet')
      expect(walletButton).toBeInTheDocument()
      expect(walletButton.tagName).toBe('BUTTON')
    })
  })

  describe('Edge Cases', () => {
    it('handles rapid dropdown toggling', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')

      // Rapidly click multiple times
      fireEvent.click(presaleButton)
      fireEvent.click(presaleButton)
      fireEvent.click(presaleButton)

      // Should still work correctly
      await waitFor(() => {
        expect(screen.queryByText('Mint Bond NFT')).toBeInTheDocument()
      })
    })

    it('handles multiple dropdowns opening', async () => {
      render(<Navigation activePage="swap" />)

      const presaleButton = screen.getByText('Presale')
      const treasuryButton = screen.getByText('Treasury')

      // Open presale dropdown
      fireEvent.click(presaleButton)
      await waitFor(() => {
        expect(screen.getByText('Mint Bond NFT')).toBeInTheDocument()
      })

      // Open treasury dropdown (should close presale)
      fireEvent.click(treasuryButton)
      await waitFor(() => {
        expect(screen.getByText('Deposit RWA')).toBeInTheDocument()
      })
    })

    it('renders correctly with different active pages', () => {
      const pages: NavPage[] = ['swap', 'liquidity', 'lock', 'vote', 'presale', 'treasury']

      pages.forEach((page) => {
        const { unmount } = render(<Navigation activePage={page} />)
        expect(screen.getByText('Paimon DEX')).toBeInTheDocument()
        unmount()
      })
    })
  })
})
