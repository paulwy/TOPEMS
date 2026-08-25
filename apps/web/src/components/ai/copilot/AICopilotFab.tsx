import React from 'react';
import { Fab, Zoom } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Sparkles } from 'lucide-react';
import i18n from '@/i18n';

interface AICopilotFabProps {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export const AICopilotFab: React.FC<AICopilotFabProps> = ({ onClick }) => (
  <Zoom in>
    <Fab
      color='primary'
      aria-label={i18n.t('components.ai_copilot_fab.ai_0')}
      className='ai-helper-fab'
      sx={{
        background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
        boxShadow: (theme) => `0 4px 14px ${alpha(theme.palette.primary.main, 0.4)}`,
        '&:hover': {
          background: 'linear-gradient(135deg, primary.dark 0%, secondary.dark 100%)',
        },
      }}
      onClick={onClick}
    >
      <Sparkles style={{ width: 24, height: 24, color: 'var(--color-primary-foreground)' }} />
    </Fab>
  </Zoom>
);

export default AICopilotFab;
