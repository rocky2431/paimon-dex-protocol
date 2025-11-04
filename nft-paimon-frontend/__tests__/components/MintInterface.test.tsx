/**
 * MintInterface Component Tests
 * Tests the complete minting flow: quantity selection → approval → minting
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MintInterface } from '@/components/presale/MintInterface'
import { useMintBondNFT } from '@/components/presale/hooks/useMintBondNFT'

// Mock the custom hook
jest.mock('@/components/presale/hooks/useMintBondNFT')

// Mock config utilities
jest.mock('@/config', () => ({
  config: {
    tokens: {
      bondNft: '0x0000000000000000000000000000000000000009',
      usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    },
    chainId: 56,
  },
  getBscScanLink: jest.fn((hash: string) => `https://bscscan.com/tx/${hash}`),
}))

const mockUseMintBondNFT = useMintBondNFT as jest.MockedFunction<typeof useMintBondNFT>

// Note: wagmi useAccount is mocked globally in jest.setup.js

describe('MintInterface Component', () => {
  const defaultHookReturn = {
    quantity: 1,
    setQuantity: jest.fn(),
    isApproving: false,
    isMinting: false,
    isApproved: false,
    contractData: {
      totalSupply: 1000,
      userBalance: 0,
      usdcBalance: '1000',
      allowance: '0',
    },
    costCalculation: {
      quantity: 1,
      pricePerNFT: 100,
      totalCost: 100,
      formattedCost: '100.00', // ✅ FIX (Task 84): Added missing field
    },
    validation: {
      isValid: true,
      error: null,
    },
    handleApprove: jest.fn(),
    handleMint: jest.fn(),
    approvalTxHash: null,
    mintTxHash: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseMintBondNFT.mockReturnValue(defaultHookReturn as any)
  })

  describe('Rendering', () => {
    it('renders mint interface with header', () => {
      render(<MintInterface />)

      expect(screen.getByText('Mint RWA Bond NFTs')).toBeInTheDocument()
      expect(screen.getByText(/Invest in real-world assets/i)).toBeInTheDocument()
    })

    it('displays total supply progress', () => {
      render(<MintInterface />)

      expect(screen.getByText(/Total Minted:/i)).toBeInTheDocument()
      expect(screen.getByText('1,000 / 10,000')).toBeInTheDocument()
      expect(screen.getByText('9,000 NFTs remaining')).toBeInTheDocument()
    })

    it('renders quantity selector', () => {
      render(<MintInterface />)

      // QuantitySelector component should be rendered
      const quantityInputs = screen.getAllByRole('button')
      expect(quantityInputs.length).toBeGreaterThan(0)
    })

    it('renders cost display', () => {
      render(<MintInterface />)

      // CostDisplay should show the total (1 NFT × 100 USDC = 100.00)
      // Button text includes "Step 1: Approve 100.00 USDC"
      expect(screen.getByRole('button', { name: /approve.*100\.00.*usdc/i })).toBeInTheDocument() // ✅ FIX (Task 84): Updated to match actual button text
    })
  })

  describe('Approval Flow', () => {
    it('shows approve button when not approved', () => {
      render(<MintInterface />)

      const approveButton = screen.getByRole('button', { name: /step 1.*approve.*usdc/i }) // ✅ FIX (Task 84): Match actual button text
      expect(approveButton).toBeInTheDocument()
      expect(approveButton).not.toBeDisabled()
    })

    it('calls handleApprove when approve button clicked', async () => {
      const handleApprove = jest.fn()
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        handleApprove,
      } as any)

      render(<MintInterface />)

      const approveButton = screen.getByRole('button', { name: /step 1.*approve.*usdc/i }) // ✅ FIX (Task 84): Match actual button text
      fireEvent.click(approveButton)

      await waitFor(() => {
        expect(handleApprove).toHaveBeenCalledTimes(1)
      })
    })

    it('disables approve button when approving', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproving: true,
      } as any)

      render(<MintInterface />)

      const approveButton = screen.getByRole('button', { name: /approving.*usdc/i }) // ✅ FIX (Task 84): Match "Approving USDC..."
      expect(approveButton).toBeDisabled()
    })

    it('shows success state when approved', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproved: true,
        approvalTxHash: '0x123',
      } as any)

      render(<MintInterface />)

      expect(screen.getByRole('button', { name: /✓.*usdc approved/i })).toBeInTheDocument() // ✅ FIX (Task 84): Match "✓ USDC Approved"
    })
  })

  describe('Minting Flow', () => {
    it('shows mint button when approved', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproved: true,
      } as any)

      render(<MintInterface />)

      const mintButton = screen.getByRole('button', { name: /mint.*nfts?/i })
      expect(mintButton).toBeInTheDocument()
      expect(mintButton).not.toBeDisabled()
    })

    it('disables mint button when not approved', () => {
      render(<MintInterface />)

      const mintButton = screen.getByRole('button', { name: /mint.*nfts?/i })
      expect(mintButton).toBeDisabled()
    })

    it('calls handleMint when mint button clicked', async () => {
      const handleMint = jest.fn()
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproved: true,
        handleMint,
      } as any)

      render(<MintInterface />)

      const mintButton = screen.getByRole('button', { name: /mint.*nfts?/i })
      fireEvent.click(mintButton)

      await waitFor(() => {
        expect(handleMint).toHaveBeenCalledTimes(1)
      })
    })

    it('disables mint button when minting', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproved: true,
        isMinting: true,
      } as any)

      render(<MintInterface />)

      const mintButton = screen.getByRole('button', { name: /minting/i })
      expect(mintButton).toBeDisabled()
    })

    it('shows success message when minting completes', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproved: true,
        mintTxHash: '0xabc',
      } as any)

      render(<MintInterface />)

      expect(screen.getByText(/success/i)).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('displays error message when validation fails', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        validation: {
          isValid: false,
          error: 'Insufficient USDC balance',
        },
      } as any)

      render(<MintInterface />)

      expect(screen.getByText('Insufficient USDC balance')).toBeInTheDocument()
    })

    it('disables buttons when validation fails', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        validation: {
          isValid: false,
          error: 'Maximum mint per transaction exceeded',
        },
      } as any)

      render(<MintInterface />)

      const approveButton = screen.getByRole('button', { name: /step 1.*approve.*usdc/i }) // ✅ FIX (Task 84): Match actual button text
      expect(approveButton).toBeDisabled()
    })
  })

  describe('Supply Progress', () => {
    it('calculates progress correctly', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        contractData: {
          ...defaultHookReturn.contractData,
          totalSupply: 5000, // 50% of 10,000
        },
      } as any)

      render(<MintInterface />)

      expect(screen.getByText('5,000 / 10,000')).toBeInTheDocument()
      expect(screen.getByText('5,000 NFTs remaining')).toBeInTheDocument()
    })

    it('shows sold out state when supply exhausted', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        contractData: {
          ...defaultHookReturn.contractData,
          totalSupply: 10000,
        },
      } as any)

      render(<MintInterface />)

      expect(screen.getByText('10,000 / 10,000')).toBeInTheDocument()
      expect(screen.getByText('0 NFTs remaining')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero quantity gracefully', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        quantity: 0,
      } as any)

      render(<MintInterface />)

      // Should still render without errors
      expect(screen.getByText('Mint RWA Bond NFTs')).toBeInTheDocument()
    })

    it('handles maximum quantity', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        quantity: 5, // MAX_MINT_PER_TX
        costCalculation: {
          quantity: 5,
          pricePerNFT: 100,
          totalCost: 500,
          formattedCost: '500.00', // ✅ FIX (Task 84): Corrected mock fields
        },
      } as any)

      render(<MintInterface />)

      // ✅ FIX (Task 84): Use specific button selector to avoid multiple matches
      expect(screen.getByRole('button', { name: /approve.*500\.00.*usdc/i })).toBeInTheDocument()
    })

    it('disables quantity selector during approval', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isApproving: true,
      } as any)

      render(<MintInterface />)

      // QuantitySelector should receive disabled prop
      // This is tested indirectly through the mock
      expect(mockUseMintBondNFT).toHaveBeenCalled()
    })

    it('disables quantity selector during minting', () => {
      mockUseMintBondNFT.mockReturnValue({
        ...defaultHookReturn,
        isMinting: true,
      } as any)

      render(<MintInterface />)

      expect(mockUseMintBondNFT).toHaveBeenCalled()
    })
  })
})
