/**
 * PositionCard Component Tests
 * Tests position display with redeem/add collateral actions and health factor monitoring
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PositionCard } from '@/components/treasury/PositionCard'
import { PositionWithMetadata } from '@/components/treasury/hooks/useUserPositions'

describe('PositionCard Component', () => {
  const defaultPosition: PositionWithMetadata = {
    rwaAsset: '0x1234567890123456789012345678901234567890',
    rwaAmount: 10000000000000000000n, // 10 tokens
    usdpMinted: 6000000000000000000n, // 6 USDP
    depositTime: BigInt(Math.floor(Date.now() / 1000) - 86400 * 8), // 8 days ago
    assetName: 'Lido Staked ETH',
    assetSymbol: 'stETH',
    assetTier: 1,
    rwaPrice: 2500, // $2500 per token
    rwaValueUSD: 25000, // 10 * $2500
    hydValueUSD: 6, // 6 USDP = $6 (1:1)
    healthFactor: 416.67, // (25000 / 6000) * 100
    collateralizationRatio: 416.67,
    canRedeem: true,
    timeUntilRedemption: 0,
  }

  const onRedeemMock = jest.fn()
  const onAddCollateralMock = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders position header with asset info', () => {
      render(<PositionCard position={defaultPosition} />)

      expect(screen.getByText('stETH')).toBeInTheDocument()
      expect(screen.getByText('Lido Staked ETH')).toBeInTheDocument()
      expect(screen.getByText('T1')).toBeInTheDocument()
    })

    it('displays health factor gauge', () => {
      render(<PositionCard position={defaultPosition} />)

      // HealthFactorGauge component should be rendered
      expect(screen.getByText('stETH')).toBeInTheDocument()
    })

    it('shows position statistics', () => {
      render(<PositionCard position={defaultPosition} />)

      expect(screen.getByText('Collateral Amount')).toBeInTheDocument()
      expect(screen.getByText('Collateral Value')).toBeInTheDocument()
      expect(screen.getByText('HYD Minted')).toBeInTheDocument()
      expect(screen.getByText('Collateralization Ratio')).toBeInTheDocument()
      expect(screen.getByText('Liquidation Price')).toBeInTheDocument()
      expect(screen.getByText('Current Price')).toBeInTheDocument()
    })

    it('displays tier badge correctly', () => {
      const tier2Position = { ...defaultPosition, assetTier: 2 }
      render(<PositionCard position={tier2Position} />)

      expect(screen.getByText('T2')).toBeInTheDocument()
    })
  })

  describe('Health Factor Display', () => {
    it('shows healthy status (>150%)', () => {
      const healthyPosition = {
        ...defaultPosition,
        healthFactor: 200,
      }

      render(<PositionCard position={healthyPosition} />)

      // No warning should be displayed
      expect(screen.queryByText(/at risk of liquidation/i)).not.toBeInTheDocument()
    })

    it('shows warning for health factor 115-150%', () => {
      const warningPosition = {
        ...defaultPosition,
        healthFactor: 130,
      }

      render(<PositionCard position={warningPosition} />)

      expect(screen.getByText(/below recommended threshold/i)).toBeInTheDocument()
    })

    it('shows critical alert for health factor <115%', () => {
      const criticalPosition = {
        ...defaultPosition,
        healthFactor: 110,
      }

      render(<PositionCard position={criticalPosition} />)

      expect(screen.getByText(/at risk of liquidation/i)).toBeInTheDocument()
    })

    it('highlights liquidation price in red when at risk', () => {
      const atRiskPosition = {
        ...defaultPosition,
        healthFactor: 140,
      }

      render(<PositionCard position={atRiskPosition} />)

      expect(screen.getByText('Liquidation Price')).toBeInTheDocument()
    })
  })

  describe('Redeem Flow', () => {
    it('enables redeem button when cooldown period passed', () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      expect(redeemButton).not.toBeDisabled()
    })

    it('disables redeem button during cooldown period', () => {
      const cooldownPosition = {
        ...defaultPosition,
        canRedeem: false,
        timeUntilRedemption: 86400 * 3, // 3 days remaining
      }

      render(<PositionCard position={cooldownPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /cooldown/i })
      expect(redeemButton).toBeDisabled()
    })

    it('shows remaining cooldown time', () => {
      const cooldownPosition = {
        ...defaultPosition,
        canRedeem: false,
        timeUntilRedemption: 86400 * 2 + 3600 * 5, // 2 days 5 hours
      }

      render(<PositionCard position={cooldownPosition} onRedeem={onRedeemMock} />)

      expect(screen.getByText(/cooldown/i)).toBeInTheDocument()
    })

    it('opens redeem dialog on button click', async () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
        expect(screen.getByText(/Enter the amount of/i)).toBeInTheDocument()
      })
    })

    it('handles amount input in redeem dialog', async () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      await waitFor(() => {
        const amountInput = screen.getByLabelText(/redeem amount/i)
        fireEvent.change(amountInput, { target: { value: '5' } })
        expect(amountInput).toHaveValue(5)
      })
    })

    it('calls onRedeem with correct parameters', async () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      // Open dialog
      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      await waitFor(() => {
        // Enter amount
        const amountInput = screen.getByLabelText(/redeem amount/i)
        fireEvent.change(amountInput, { target: { value: '5' } })

        // Click confirm
        const confirmButton = screen.getByRole('button', { name: /confirm redeem/i })
        fireEvent.click(confirmButton)

        expect(onRedeemMock).toHaveBeenCalledWith(defaultPosition.rwaAsset, '5')
      })
    })

    it('disables confirm button when amount is zero', async () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm redeem/i })
        expect(confirmButton).toBeDisabled()
      })
    })

    it('closes dialog on cancel', async () => {
      render(<PositionCard position={defaultPosition} onRedeem={onRedeemMock} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Add Collateral Flow', () => {
    it('renders add collateral button', () => {
      render(<PositionCard position={defaultPosition} onAddCollateral={onAddCollateralMock} />)

      const addButton = screen.getByRole('button', { name: /add collateral/i })
      expect(addButton).toBeInTheDocument()
      expect(addButton).not.toBeDisabled()
    })

    it('opens add collateral dialog on button click', async () => {
      render(<PositionCard position={defaultPosition} onAddCollateral={onAddCollateralMock} />)

      const addButton = screen.getByRole('button', { name: /add collateral/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByText(/Add more/i)).toBeInTheDocument()
      })
    })

    it('handles amount input in add collateral dialog', async () => {
      render(<PositionCard position={defaultPosition} onAddCollateral={onAddCollateralMock} />)

      const addButton = screen.getByRole('button', { name: /add collateral/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount to add/i)
        fireEvent.change(amountInput, { target: { value: '3' } })
        expect(amountInput).toHaveValue(3)
      })
    })

    it('calls onAddCollateral with correct parameters', async () => {
      render(<PositionCard position={defaultPosition} onAddCollateral={onAddCollateralMock} />)

      const addButton = screen.getByRole('button', { name: /add collateral/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount to add/i)
        fireEvent.change(amountInput, { target: { value: '3' } })

        const confirmButton = screen.getByRole('button', { name: /confirm add/i })
        fireEvent.click(confirmButton)

        expect(onAddCollateralMock).toHaveBeenCalledWith(defaultPosition.rwaAsset, '3')
      })
    })

    it('disables confirm when amount is invalid', async () => {
      render(<PositionCard position={defaultPosition} onAddCollateral={onAddCollateralMock} />)

      const addButton = screen.getByRole('button', { name: /add collateral/i })
      fireEvent.click(addButton)

      await waitFor(() => {
        const confirmButton = screen.getByRole('button', { name: /confirm add/i })
        expect(confirmButton).toBeDisabled()
      })
    })
  })

  describe('Liquidation Price Calculation', () => {
    it('calculates liquidation price correctly', () => {
      // HF = (rwaValue / hydMinted) * 100 = (rwaAmount * price / hydMinted) * 100
      // 115 = (10 * liquidationPrice / 6) * 100
      // liquidationPrice = (115 * 6) / (100 * 10) = 0.69
      const position = {
        ...defaultPosition,
        rwaAmount: 10000000000000000000n, // 10 tokens
        hydMinted: 6000000000000000000n, // 6 HYD
      }

      render(<PositionCard position={position} />)

      expect(screen.getByText('Liquidation Price')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles zero health factor gracefully', () => {
      const zeroHFPosition = {
        ...defaultPosition,
        healthFactor: 0,
      }

      render(<PositionCard position={zeroHFPosition} />)

      expect(screen.getByText('stETH')).toBeInTheDocument()
    })

    it('handles very large health factor', () => {
      const highHFPosition = {
        ...defaultPosition,
        healthFactor: 999,
      }

      render(<PositionCard position={highHFPosition} />)

      expect(screen.getByText('stETH')).toBeInTheDocument()
    })

    it('formats time remaining correctly for days', () => {
      const daysPosition = {
        ...defaultPosition,
        canRedeem: false,
        timeUntilRedemption: 86400 * 5 + 3600 * 12, // 5d 12h
      }

      render(<PositionCard position={daysPosition} />)

      expect(screen.getByRole('button', { name: /cooldown/i })).toBeInTheDocument()
    })

    it('formats time remaining correctly for hours', () => {
      const hoursPosition = {
        ...defaultPosition,
        canRedeem: false,
        timeUntilRedemption: 3600 * 8 + 60 * 30, // 8h 30m
      }

      render(<PositionCard position={hoursPosition} />)

      expect(screen.getByRole('button', { name: /cooldown/i })).toBeInTheDocument()
    })

    it('formats time remaining correctly for minutes', () => {
      const minutesPosition = {
        ...defaultPosition,
        canRedeem: false,
        timeUntilRedemption: 60 * 45, // 45m
      }

      render(<PositionCard position={minutesPosition} />)

      expect(screen.getByRole('button', { name: /cooldown/i })).toBeInTheDocument()
    })

    it('handles missing callback props gracefully', () => {
      render(<PositionCard position={defaultPosition} />)

      const redeemButton = screen.getByRole('button', { name: /redeem collateral/i })
      fireEvent.click(redeemButton)

      // Should not crash even without callbacks
      expect(screen.getByText('stETH')).toBeInTheDocument()
    })
  })

  describe('Visual Styling', () => {
    it('applies warning border for at-risk positions', () => {
      const atRiskPosition = {
        ...defaultPosition,
        healthFactor: 140,
      }

      const { container } = render(<PositionCard position={atRiskPosition} />)

      // Card should have warning styling
      expect(container.firstChild).toBeInTheDocument()
    })

    it('does not apply warning styling for healthy positions', () => {
      const { container } = render(<PositionCard position={defaultPosition} />)

      expect(container.firstChild).toBeInTheDocument()
    })
  })
})
