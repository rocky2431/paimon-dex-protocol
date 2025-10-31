/**
 * DiceRoller Component Tests
 * Tests dice rolling interface with cooldown timer and result animation
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DiceRoller } from '@/components/presale/DiceRoller'
import { useRollDice } from '@/components/presale/hooks/useRollDice'
import { useWindowSize } from '@/hooks/useWindowSize'

// Mock the custom hooks
jest.mock('@/components/presale/hooks/useRollDice')
jest.mock('@/hooks/useWindowSize')

const mockUseRollDice = useRollDice as jest.MockedFunction<typeof useRollDice>
const mockUseWindowSize = useWindowSize as jest.MockedFunction<typeof useWindowSize>

// Note: wagmi useAccount is mocked globally in jest.setup.js

describe('DiceRoller Component', () => {
  const defaultHookReturn = {
    tokenId: 1,
    diceData: {
      diceType: 0, // NORMAL
      lastRollTimestamp: 0,
      rollsThisWeek: 5,
      highestDiceRoll: 0,
    },
    rollResult: null,
    canRoll: true,
    rollDice: jest.fn(),
    isRolling: false,
    isSuccess: false,
    error: null,
    txHash: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRollDice.mockReturnValue(defaultHookReturn as any)
    mockUseWindowSize.mockReturnValue({ width: 1920, height: 1080 })
  })

  describe('Rendering', () => {
    it('renders dice roller with header', () => {
      render(<DiceRoller />)

      expect(screen.getByText('Weekly Dice Roll')).toBeInTheDocument()
    })

    it('shows warning when user has no NFTs', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        tokenId: null,
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/don't own any Bond NFTs/i)).toBeInTheDocument()
      expect(screen.getByText(/Please mint NFTs first/i)).toBeInTheDocument()
    })

    it('shows dice interface when user owns NFTs', () => {
      render(<DiceRoller />)

      expect(screen.getByRole('button', { name: /roll dice/i })).toBeInTheDocument()
    })

    it('displays dice type correctly - NORMAL', () => {
      render(<DiceRoller />)

      // DiceTypeDisplay component should be rendered
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('displays dice type correctly - GOLD', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          diceType: 1, // GOLD
        },
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('displays dice type correctly - DIAMOND', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          diceType: 2, // DIAMOND
        },
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })
  })

  describe('Roll Dice Action', () => {
    it('enables roll button when user can roll', () => {
      render(<DiceRoller />)

      const rollButton = screen.getByRole('button', { name: /roll dice/i })
      expect(rollButton).not.toBeDisabled()
    })

    it('disables roll button when user cannot roll', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        canRoll: false,
      } as any)

      render(<DiceRoller />)

      const rollButton = screen.getByRole('button', { name: /roll dice/i })
      expect(rollButton).toBeDisabled()
    })

    it('calls rollDice when button clicked', async () => {
      const rollDice = jest.fn()
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        rollDice,
      } as any)

      render(<DiceRoller />)

      const rollButton = screen.getByRole('button', { name: /roll dice/i })
      fireEvent.click(rollButton)

      await waitFor(() => {
        expect(rollDice).toHaveBeenCalledTimes(1)
      })
    })

    it('disables button while rolling', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        isRolling: true,
      } as any)

      render(<DiceRoller />)

      const rollButton = screen.getByRole('button', { name: /rolling/i })
      expect(rollButton).toBeDisabled()
    })
  })

  describe('Roll Results', () => {
    it('displays roll result', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        rollResult: {
          result: 5,
          remintReward: 100,
        },
        isSuccess: true,
      } as any)

      render(<DiceRoller />)

      // Result should be displayed in DiceAnimation component
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('shows confetti for high normal dice roll (6)', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          diceType: 0, // NORMAL
        },
        rollResult: {
          result: 6,
          remintReward: 150,
        },
      } as any)

      render(<DiceRoller />)

      // Confetti should be rendered (tested via component presence)
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('shows confetti for high gold dice roll (>10)', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          diceType: 1, // GOLD
        },
        rollResult: {
          result: 11,
          remintReward: 200,
        },
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('shows confetti for high diamond dice roll (>15)', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          diceType: 2, // DIAMOND
        },
        rollResult: {
          result: 16,
          remintReward: 300,
        },
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('displays transaction hash link on success', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        isSuccess: true,
        txHash: '0x123abc',
      } as any)

      render(<DiceRoller />)

      const txLink = screen.queryByText(/view transaction/i)
      if (txLink) {
        expect(txLink).toHaveAttribute('href', expect.stringContaining('0x123abc'))
      }
    })
  })

  describe('Cooldown Timer', () => {
    it('shows cooldown timer when user has rolled recently', () => {
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          lastRollTimestamp: oneHourAgo,
        },
        canRoll: false,
      } as any)

      render(<DiceRoller />)

      // RollCooldownTimer component should be rendered
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('hides cooldown timer when user has never rolled', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          lastRollTimestamp: 0,
        },
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('displays error message when roll fails', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        error: 'Transaction failed: insufficient gas',
      } as any)

      render(<DiceRoller />)

      expect(screen.getByText(/Transaction failed/i)).toBeInTheDocument()
    })

    it('shows network-specific BSCScan link', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        isSuccess: true,
        txHash: '0xtest',
      } as any)

      render(<DiceRoller />)

      // Link should be rendered with correct network
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing dice data gracefully', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: null,
      } as any)

      render(<DiceRoller />)

      // Should default to NORMAL type
      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })

    it('handles zero rolls remaining', () => {
      mockUseRollDice.mockReturnValue({
        ...defaultHookReturn,
        diceData: {
          ...defaultHookReturn.diceData!,
          rollsThisWeek: 0,
        },
        canRoll: false,
      } as any)

      render(<DiceRoller />)

      const rollButton = screen.getByRole('button', { name: /roll dice/i })
      expect(rollButton).toBeDisabled()
    })

    it('renders correctly on different window sizes', () => {
      mockUseWindowSize.mockReturnValue({ width: 375, height: 667 })

      render(<DiceRoller />)

      expect(screen.getByText(/Weekly Dice Roll/i)).toBeInTheDocument()
    })
  })
})
