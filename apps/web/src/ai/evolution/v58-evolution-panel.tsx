import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, GitBranch } from 'lucide-react';
import i18n from '@/i18n';
import type { ModelVersion, VersionCompareResult } from './model-versioning';
import type { Experiment, Variant, ExperimentResult } from './ab-testing';
import type { SecurityCheckV58, ThreatModel, SecurityReport } from './security-hardening';

const V58EvolutionPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitBranch size={20} />
          <Typography variant="h6">{i18n.t('ai.v58-evolution-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v58-evolution-panel.disabled')}
      </Typography>
    </Box>
  );
};

export { V58EvolutionPanel };
export default V58EvolutionPanel;
