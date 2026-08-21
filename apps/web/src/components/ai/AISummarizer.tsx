import {
  Card,
  CardContent,
  Select,
  MenuItem,
  FormLabel,
  Typography,
  Box,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Copy, Check, Quote } from 'lucide-react';

import { AIGenerateModal } from './AIGenerateModal';
import { useAIHelper } from '../../hooks/useAIHelper';
import type { SummarizeRequest, SummarizeResponse } from '@/types/ai';

interface AISummarizerProps {
  isOpen: boolean;
  onClose: () => void;
  summarizeRequest: SummarizeRequest;
  onSummaryGenerated: (_summary: string) => void;
}

const summaryTypeConfig = {
  short: {
    label: i18n.t('components.ai_summarizer.k0'),
    description: i18n.t('components.ai_summarizer.100_0'),
  },
  medium: {
    label: i18n.t('components.ai_summarizer.k1'),
    description: i18n.t('components.ai_summarizer.200300_1'),
  },
  detailed: {
    label: i18n.t('components.ai_summarizer.k2'),
    description: i18n.t('components.ai_summarizer.400_2'),
  },
};

export function AISummarizer({
  isOpen,
  onClose,
  summarizeRequest,
  onSummaryGenerated,
}: AISummarizerProps) {
  const [summaryType, setSummaryType] = useState<'short' | 'medium' | 'detailed'>('medium');
  const [copied, setCopied] = useState(false);

  const { isLoading, summarize, result } = useAIHelper<SummarizeResponse>({
    featureType: 'document',
    onSuccess: () => {
      // Summary will be available in result
    },
  });

  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      handleSummarize();
    }
  }, [isOpen]);

  const handleSummarize = async () => {
    await summarize({
      ...summarizeRequest,
      type: summaryType,
    });
  };

  const handleTypeChange = async (type: 'short' | 'medium' | 'detailed') => {
    setSummaryType(type);
    await summarize({
      ...summarizeRequest,
      type,
    });
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = () => {
    if (result?.summary) {
      onSummaryGenerated(result.summary);
      onClose();
    }
  };

  const hasSummary = !!result?.summary;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title={i18n.t('components.ai_summarizer.ai_3')}
      description={i18n.t('components.ai_summarizer.k3')}
      isLoading={isLoading}
      onConfirm={hasSummary ? handleApply : undefined}
      confirmText={i18n.t('components.ai_summarizer.k4')}
      extraActions={
        hasSummary ? (
          <Button
            variant='outlined'
            size='small'
            onClick={handleCopy}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            {copied ? (
              <Check style={{ width: 16, height: 16 }} />
            ) : (
              <Copy style={{ width: 16, height: 16 }} />
            )}
            {copied ? i18n.t('components.ai_summarizer.k6') : i18n.t('components.ai_summarizer.k5')}
          </Button>
        ) : null
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <FormLabel>{i18n.t('components.ai_summarizer.k7')}</FormLabel>
          <Select
            value={summaryType}
            onChange={(e) => handleTypeChange(e.target.value as 'short' | 'medium' | 'detailed')}
            size='small'
          >
            {(
              Object.entries(summaryTypeConfig) as [
                keyof typeof summaryTypeConfig,
                typeof summaryTypeConfig.short,
              ][]
            ).map(([key, config]) => (
              <MenuItem
                key={key}
                value={key}
              >
                {config.label} - {config.description}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {hasSummary ? (
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Quote style={{ width: 20, height: 20, color: 'purple.600' }} />
                <FormLabel sx={{ color: 'secondary.dark', fontWeight: 500 }}>
                  {i18n.t('components.ai_summarizer.k8')}
                </FormLabel>
              </Box>
              <Box
                sx={{
                  bgcolor: 'secondary.light',
                  border: '1px solid var(--color-secondary-200)',
                  borderRadius: 1,
                  p: 2,
                }}
              >
                <Typography
                  sx={{
                    color: 'grey.700',
                    lineHeight: 1.7,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {result.summary}
                </Typography>
              </Box>
              <Button
                variant='outlined'
                size='small'
                sx={{ mt: 1.5, width: '100%' }}
                onClick={handleSummarize}
              >
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
                {i18n.t('components.ai_summarizer.k4')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
              <Sparkles
                style={{
                  width: 40,
                  height: 40,
                  margin: '0 auto 12px',
                  opacity: 0.5,
                }}
              />
              <Typography>{i18n.t('components.ai_summarizer.k5')}</Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </AIGenerateModal>
  );
}
