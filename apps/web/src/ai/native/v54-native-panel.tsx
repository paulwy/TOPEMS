import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Cpu } from 'lucide-react';
import i18n from '@/i18n';
import type { AICapability, PlatformConfig, MiddlewareContext } from './ai-first-architecture';
import type { RouteRecommendation, RouteIntent, RouterStats } from './intelligent-router';
import type { UserProfile, AdaptedLayout, AdaptationStats } from './adaptive-ui';

const V54NativePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Cpu size={20} />
          <Typography variant="h6">{i18n.t('ai.v54-native-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v54-native-panel.disabled')}
      </Typography>
    </Box>
  );
};

export { V54NativePanel };
export default V54NativePanel;
