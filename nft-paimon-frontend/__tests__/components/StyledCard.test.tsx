/**
 * StyledCard Component Tests
 * Example test suite demonstrating Jest + Testing Library setup
 */

import { render, screen } from '@testing-library/react'
import { StyledCard } from '@/components/common/StyledCard'

describe('StyledCard Component', () => {
  describe('Rendering', () => {
    it('renders children correctly', () => {
      render(
        <StyledCard>
          <div>Test Content</div>
        </StyledCard>
      )

      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('renders with white variant by default', () => {
      const { container } = render(
        <StyledCard>
          <div>Content</div>
        </StyledCard>
      )

      const card = container.firstChild
      expect(card).toBeInTheDocument()
    })

    it('renders with accent variant when specified', () => {
      const { container } = render(
        <StyledCard variant="accent">
          <div>Accent Card</div>
        </StyledCard>
      )

      const card = container.firstChild
      expect(card).toBeInTheDocument()
      expect(screen.getByText('Accent Card')).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('accepts custom className prop', () => {
      render(
        <StyledCard className="custom-class">
          <div>Content</div>
        </StyledCard>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('renders with hoverLift enabled', () => {
      const { container } = render(
        <StyledCard hoverLift>
          <div>Hover Card</div>
        </StyledCard>
      )

      expect(screen.getByText('Hover Card')).toBeInTheDocument()
    })

    it('accepts custom sx prop', () => {
      render(
        <StyledCard sx={{ marginTop: 2 }}>
          <div>Custom Styled</div>
        </StyledCard>
      )

      expect(screen.getByText('Custom Styled')).toBeInTheDocument()
    })
  })

  describe('Variants', () => {
    it('supports white variant', () => {
      render(
        <StyledCard variant="white">
          <div>White Card</div>
        </StyledCard>
      )

      expect(screen.getByText('White Card')).toBeInTheDocument()
    })

    it('supports accent variant', () => {
      render(
        <StyledCard variant="accent">
          <div>Accent Card</div>
        </StyledCard>
      )

      expect(screen.getByText('Accent Card')).toBeInTheDocument()
    })
  })
})
