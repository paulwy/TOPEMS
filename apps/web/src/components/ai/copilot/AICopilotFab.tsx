import React from 'react';
import { Fab, Zoom } from '@mui/material';
import { Sparkles } from 'lucide-react';

interface AICopilotFabProps {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export const AICopilotFab: React.FC<AICopilotFabProps> = ({ onClick }) => (
  <Zoom in>
    <Fab
      color='primary'
      aria-label='AI助手'
      className='ai-helper-fab'
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
        boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
        '&:hover': {
          background: 'linear-gradient(135deg, primary.dark 0%, secondary.dark 100%)',
        },
      }}
      onClick={onClick}
    >
      <Sparkles style={{ width: 24, height: 24, color: 'white' }} />
    </Fab>
  </Zoom>
);

export default AICopilotFab;
