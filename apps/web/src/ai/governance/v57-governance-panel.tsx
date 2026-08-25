import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Scale } from 'lucide-react';
import i18n from '@/i18n';
import type { ComplianceRule, ComplianceReport, Severity } from './compliance-automation';
import type { RiskAlert, RiskScore, RiskLevel } from './risk-alerting';
import type { Policy, PolicyDecision, EnforcementMode } from './policy-enforcement';

export const V57GovernancePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Scale size={20} />
          <Typography variant='h6'>{i18n.t('ai.v57-governance-panel.title')}</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
        >
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {i18n.t('ai.v57-governance-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V57GovernancePanel;
