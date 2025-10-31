import { Container } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { BondDashboard } from '@/components/presale/BondDashboard';

/**
 * Bond Dashboard Page
 * Display all user's Bond NFTs with management interface
 *
 * Route: /presale/bonds
 *
 * Features:
 * - View all owned Bond NFTs
 * - Track yields and rarity tiers
 * - Monitor maturity countdown
 * - Settle matured bonds (veNFT / Cash)
 */
export default function BondsPage() {
  return (
    <>
      <Navigation activePage="presale" />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <BondDashboard />
      </Container>
    </>
  );
}
