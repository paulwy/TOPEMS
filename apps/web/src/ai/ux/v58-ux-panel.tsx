import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Heart } from 'lucide-react';
import i18n from '@/i18n';
import type { Recommendation, UserBehavior, RecommendationStats } from './smart-recommender';
import type { InteractionProfile, AdaptiveResponse, AdaptationRecord } from './adaptive-interaction';
import type { EmotionState, DesignResponse, EmotionProfile } from './emotional-design';

export const V58UXPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Heart size={20} />
          <Typography variant="h6">{i18n.t('ai.v58-ux-panel.title')}</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {i18n.t('ai.v58-ux-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V58UXPanel;
