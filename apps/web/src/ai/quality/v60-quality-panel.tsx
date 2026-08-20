import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Gauge } from 'lucide-react';
import i18n from '@/i18n';
import type { TestCase, TestRun, TestResultDetail, SmartTestEvent } from './smart-testing-v2';
import type { PerfBaseline, PerfRegression, PerfAlert } from './continuous-performance';
import type { UXMetric, UXAlert, FunnelAnalysis, UXMonitorEvent } from './ux-monitor';

export const V60QualityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gauge size={20} />
          <Typography variant="h6">{i18n.t('ai.v60-quality-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v60-quality-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V60QualityPanel;
