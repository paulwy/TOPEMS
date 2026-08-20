import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Wrench } from 'lucide-react';
import i18n from '@/i18n';
import type { DebugSession, DebugSuggestion, StateAnalysis } from './smart-debugger';
import type { PerfSnapshot, PerfIssue, PerformanceBudget, TrendPoint } from './performance-analyzer';
import type { RefactoringPlan, CodeIssue, ImpactEstimate } from './code-refactor';

export const V59DevExPanel: React.FC<{
  onClose: () => void;
  activeFile?: string;
}> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wrench size={20} />
          <Typography variant="h6">{i18n.t('ai.v59-devex-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v59-devex-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V59DevExPanel;
