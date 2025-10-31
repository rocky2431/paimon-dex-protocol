'use client';

import { useEffect, useState, useRef } from 'react';
import { ANIMATION_CONFIG } from './constants';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * AnimatedNumber Component
 * OlympusDAO-style counter animation (400-1600ms duration)
 *
 * Features:
 * - Smooth number transitions with easing
 * - Thousand separators (e.g., 1,000.00)
 * - Configurable decimal places
 * - Prefix/suffix support (e.g., "$" or "USDC")
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    // Cancel previous animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }

    const startValue = displayValue;
    const endValue = value;
    const duration = ANIMATION_CONFIG.COUNTER_DURATION; // 800ms
    const startTime = performance.now();

    // OlympusDAO easing function: cubic-bezier(0.16, 1, 0.3, 1)
    // Approximation: easeOutExpo
    const easeOutExpo = (t: number): number => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Format number with thousand separators and decimals
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <span className={className}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
};
