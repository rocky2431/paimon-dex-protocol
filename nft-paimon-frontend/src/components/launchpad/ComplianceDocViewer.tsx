'use client';

import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Alert,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import VerifiedIcon from '@mui/icons-material/Verified';
import type { ComplianceDocument } from '@/types/launchpad';

interface ComplianceDocViewerProps {
  complianceDocURI: string;
  auditReportURI: string;
  disclosureURI: string;
}

/**
 * ComplianceDocViewer Component
 *
 * Display and download compliance documents (CRITICAL FEATURE)
 * Priority: Highest - Must be above-the-fold and prominent
 */
export function ComplianceDocViewer({
  complianceDocURI,
  auditReportURI,
  disclosureURI,
}: ComplianceDocViewerProps) {
  const documents: ComplianceDocument[] = [
    {
      name: 'Offering Memorandum',
      uri: complianceDocURI,
      type: 'offering_memo' as const,
    },
    {
      name: 'Asset Audit Report',
      uri: auditReportURI,
      type: 'audit_report' as const,
    },
    {
      name: 'Risk Disclosure',
      uri: disclosureURI,
      type: 'risk_disclosure' as const,
    },
  ].filter((doc) => doc.uri && doc.uri !== '');

  const handleDownload = (uri: string, name: string) => {
    window.open(uri, '_blank');
  };

  if (documents.length === 0) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        No compliance documents available for this project
      </Alert>
    );
  }

  return (
    <Card
      sx={{
        mb: 4,
        border: '2px solid #FF6B35',
        backgroundColor: '#FFF8F0',
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <VerifiedIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold" color="#FF6B35">
            Compliance Documents
          </Typography>
          <Chip
            label="REQUIRED READING"
            size="small"
            sx={{ backgroundColor: '#FF6B35', color: 'white', ml: 1 }}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Review all compliance documents before participating. These documents contain
          important legal and risk information.
        </Typography>

        <Stack spacing={2}>
          {documents.map((doc) => (
            <Box
              key={doc.type}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                backgroundColor: 'white',
                borderRadius: 2,
                border: '1px solid #FFE0B2',
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <DescriptionIcon sx={{ color: '#FF6B35', fontSize: 32 }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight="600">
                    {doc.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {doc.uri.startsWith('ipfs://') ? 'IPFS' : 'HTTP'} Link
                  </Typography>
                </Box>
              </Box>

              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(doc.uri, doc.name)}
                sx={{
                  backgroundColor: '#FF6B35',
                  '&:hover': { backgroundColor: '#FF8A65' },
                }}
              >
                View
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
