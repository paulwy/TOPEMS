import React from 'react';
import { Paper } from '@mui/material';
import { designTokens, semanticTokens } from '@topems/tokens';

const MeasureTooltip: React.FC<{
  position: [number, number];
  content: string;
}> = ({ position, content }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        backgroundColor: 'text.primary',
        color: 'common.white',
        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
        padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
        borderRadius: 1,
        boxShadow: designTokens.shadows.lg,
        pointerEvents: 'none',
        zIndex: 50,
        left: position[1] + 10,
        top: position[0] - 20,
        transform: 'translateX(-50%)',
      }}
    >
      {content}
    </Paper>
  );
};

export default MeasureTooltip;
