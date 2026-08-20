import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Sparkles } from 'lucide-react';
import i18n from '@/i18n';
import type { CompletionContext, CompletionItem } from './code-completion';
import type { TestCase, AnalysisResult } from './test-generator';
import type { ComponentRecommendation, IntentContext } from './ui-recommender';

const V53AIPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sparkles size={20} />
          <Typography variant="h6">{i18n.t('ai.v53-ai-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v53-ai-panel.disabled')}
      </Typography>
    </Box>
  );
};

export { V53AIPanel };
export default V53AIPanel;
