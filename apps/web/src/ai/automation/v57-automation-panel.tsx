import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Bot } from 'lucide-react';
import i18n from '@/i18n';
import type { TestScenario, TestResult, SmartTestEvent } from './smart-testing';
import type { CIConfig, CIResult, CIStatus, CIEvent } from './ci-integration';
import type { GateCriteria, GateResult, GateStatus, GateEvent } from './quality-gate';

export const V57AutomationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bot size={20} />
          <Typography variant='h6'>{i18n.t('ai.v57-automation-panel.title')}</Typography>
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
        {i18n.t('ai.v57-automation-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V57AutomationPanel;
