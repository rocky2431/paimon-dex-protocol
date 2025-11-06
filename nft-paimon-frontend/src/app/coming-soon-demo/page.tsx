'use client';

import { ComingSoon } from '@/components/common';

/**
 * Demo page showing ComingSoon component usage
 *
 * This page demonstrates how to use the ComingSoon component
 * for features under development.
 */
export default function ComingSoonDemoPage() {
  return (
    <ComingSoon
      featureName="Lending Protocol"
      description="Decentralized lending and borrowing platform with competitive APY rates and flexible terms."
      estimatedRelease="Q2 2025"
      locale="en"
      returnUrl="/"
    />
  );
}
