import { Container } from '@mui/material';
import { Navigation } from '@/components/layout/Navigation';
import { SettlementPage } from '@/components/presale/SettlementPage';

interface SettlePageProps {
  params: {
    tokenId: string;
  };
}

/**
 * Settlement Page Route
 * Dynamic route for settling Bond NFT by token ID
 *
 * Route: /presale/settle/[tokenId]
 *
 * Features:
 * - Display bond settlement options
 * - veNFT vs Cash comparison
 * - Lock duration selector
 * - Settlement execution
 */
export default function SettlePage({ params }: SettlePageProps) {
  const tokenId = parseInt(params.tokenId, 10);

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <SettlementPage tokenId={tokenId} />
      </Container>
    </>
  );
}
