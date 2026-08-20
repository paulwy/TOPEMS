import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, ShieldCheck } from 'lucide-react';
import i18n from '@/i18n';
import type { SecurityAudit, AuditType, AuditSeverity, AuditResult } from './ai-security-audit';
import type { AttackVector, AttackType, AttackSeverity, RobustnessTest } from './adversarial-robustness';
import type { PrivacyConfig, PrivacyReport, NoiseStrategy } from './privacy-enhancement';

export const V59SecurityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldCheck size={20} />
          <Typography variant="h6">{i18n.t('ai.v59-security-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v59-security-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V59SecurityPanel;
