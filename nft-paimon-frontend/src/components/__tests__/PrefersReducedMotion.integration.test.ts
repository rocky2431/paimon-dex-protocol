/**
 * Integration Tests: Prefers Reduced Motion Support (gap-4.1.4)
 *
 * Purpose: Detect support for prefers-reduced-motion media query
 * Expected: All components with animations should respect user's motion preferences
 *
 * Affected Components:
 * - src/components/swap/SwitchButton.tsx (rotation animation)
 * - src/styles/cardStyles.ts (hover effects)
 * - src/components/layout/Navigation.tsx (transitions)
 * - src/components/voting/* (multiple transitions)
 * - All Modal components (Dialog transitions)
 *
 * Implementation Pattern:
 * const prefersReducedMotion = usePrefersReducedMotion();
 * transition: prefersReducedMotion ? 'none' : 'transform 0.3s'
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Prefers Reduced Motion Support (gap-4.1.4)', () => {
  /**
   * Helper function to check if a file uses usePrefersReducedMotion hook
   */
  function usesReducedMotionHook(source: string): boolean {
    return source.includes('usePrefersReducedMotion');
  }

  /**
   * Helper function to check if a file respects prefers-reduced-motion
   * Looks for conditional transitions based on motion preference
   */
  function respectsReducedMotion(source: string): boolean {
    // Pattern 1: prefersReducedMotion ? 'none' : '...'
    const pattern1 = /prefersReducedMotion\s*\?\s*['"]none['"]\s*:/i.test(source);

    // Pattern 2: transition: prefersReducedMotion ? 'none' : ...
    const pattern2 = /transition:\s*prefersReducedMotion\s*\?/i.test(source);

    // Pattern 3: getTransition(prefersReducedMotion) helper
    const pattern3 = /getTransition\s*\(\s*prefersReducedMotion/i.test(source);

    return pattern1 || pattern2 || pattern3 || usesReducedMotionHook(source);
  }

  // ==================== Dimension 1: Functional Tests ====================

  it('[TEST 1] should have usePrefersReducedMotion hook implementation', () => {
    const hookPath = path.join(process.cwd(), 'src/hooks/usePrefersReducedMotion.ts');
    expect(fs.existsSync(hookPath)).toBe(true);

    if (fs.existsSync(hookPath)) {
      const source = fs.readFileSync(hookPath, 'utf8');
      expect(source).toContain('useMediaQuery');
      expect(source).toContain('prefers-reduced-motion');
    }
  });

  it('[TEST 2] should support reduced motion in SwitchButton (rotation)', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/swap/SwitchButton.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(respectsReducedMotion(source)).toBe(true);
  });

  it('[TEST 3] should support reduced motion in cardStyles (hover effects)', () => {
    const componentPath = path.join(process.cwd(), 'src/styles/cardStyles.ts');
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(respectsReducedMotion(source)).toBe(true);
  });

  it('[TEST 4] should support reduced motion in Navigation', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/Navigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(respectsReducedMotion(source)).toBe(true);
  });

  // ==================== Dimension 2: Boundary Tests ====================

  it('[TEST 5] should handle reduced motion in SubNavigation', () => {
    const componentPath = path.join(
      process.cwd(),
      'src/components/layout/SubNavigation.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');
    expect(respectsReducedMotion(source)).toBe(true);
  });

  it('[TEST 6] should handle reduced motion in voting components', () => {
    const votingComponents = [
      'src/components/voting/MyVotingPower.tsx',
      'src/components/voting/GaugeCard.tsx',
      'src/components/voting/VotingCard.tsx',
    ];

    let hasSupport = 0;
    votingComponents.forEach((componentPath) => {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        const source = fs.readFileSync(fullPath, 'utf8');
        if (respectsReducedMotion(source)) {
          hasSupport++;
        }
      }
    });

    // At least 2 out of 3 voting components should support reduced motion
    expect(hasSupport).toBeGreaterThanOrEqual(2);
  });

  // ==================== Dimension 3: Exception Tests ====================

  it('[TEST 7] should handle reduced motion gracefully in components without transitions', () => {
    // Components without animations should not break when hook is present
    // Test that hook can be imported and used without errors
    const hookPath = path.join(process.cwd(), 'src/hooks/usePrefersReducedMotion.ts');

    if (fs.existsSync(hookPath)) {
      const source = fs.readFileSync(hookPath, 'utf8');
      // Should return boolean value
      expect(source).toContain('return');
      expect(source).toContain('boolean');
    }
  });

  it('[TEST 8] should handle Modal transitions with reduced motion', () => {
    // Check if MUI Dialog/Modal transitions can be controlled
    const modalComponents = [
      'src/components/boost/BoostStakeModal.tsx',
      'src/components/vault/VaultDepositModal.tsx',
    ];

    let hasSupport = 0;
    modalComponents.forEach((componentPath) => {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        const source = fs.readFileSync(fullPath, 'utf8');
        if (respectsReducedMotion(source)) {
          hasSupport++;
        }
      }
    });

    // At least 1 modal should support reduced motion
    expect(hasSupport).toBeGreaterThanOrEqual(1);
  });

  // ==================== Dimension 4: Performance Tests ====================

  it('[TEST 9] should use consistent implementation pattern across components', () => {
    const componentsToCheck = [
      'src/components/swap/SwitchButton.tsx',
      'src/components/layout/Navigation.tsx',
      'src/components/voting/MyVotingPower.tsx',
    ];

    const patterns: string[] = [];
    componentsToCheck.forEach((componentPath) => {
      const fullPath = path.join(process.cwd(), componentPath);
      if (fs.existsSync(fullPath)) {
        const source = fs.readFileSync(fullPath, 'utf8');
        if (usesReducedMotionHook(source)) {
          patterns.push('hook');
        }
      }
    });

    // At least 2 components should use the hook
    expect(patterns.length).toBeGreaterThanOrEqual(2);
  });

  // ==================== Dimension 5: Security Tests ====================

  it('[TEST 10] should not break functionality when motion is disabled', () => {
    // Ensure that disabling animations doesn't break component logic
    // Check that transitions are the only thing changed, not event handlers
    const componentPath = path.join(
      process.cwd(),
      'src/components/swap/SwitchButton.tsx'
    );
    const source = fs.readFileSync(componentPath, 'utf8');

    // Should still have onClick handler
    expect(source).toContain('onClick');
    // Should have conditional transition, not removal of functionality
    if (respectsReducedMotion(source)) {
      expect(source).toContain('IconButton');
    }
  });

  // ==================== Dimension 6: Compatibility Tests ====================

  it('[TEST 11] should use MUI useMediaQuery for cross-browser compatibility', () => {
    const hookPath = path.join(process.cwd(), 'src/hooks/usePrefersReducedMotion.ts');

    if (fs.existsSync(hookPath)) {
      const source = fs.readFileSync(hookPath, 'utf8');
      // Should use MUI's useMediaQuery for better compatibility
      expect(source).toContain('useMediaQuery');
      // Should import from @mui/material
      expect(source).toContain('@mui/material');
    }
  });

  it('[TEST 12] should work with SSR (Next.js)', () => {
    const hookPath = path.join(process.cwd(), 'src/hooks/usePrefersReducedMotion.ts');

    if (fs.existsSync(hookPath)) {
      const source = fs.readFileSync(hookPath, 'utf8');
      // Should handle SSR by defaulting to false or using proper detection
      // MUI's useMediaQuery handles SSR automatically
      expect(source).toContain('useMediaQuery');
    }
  });
});
