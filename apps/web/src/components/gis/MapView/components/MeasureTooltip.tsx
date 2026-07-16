import React from 'react';
import { Paper } from '@mui/material';

const MeasureTooltip: React.FC<{
  position: [number, number];
  content: string;
}> = ({ position, content }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        backgroundColor: 'text.primary',
        color: 'white',
        fontSize: '0.75rem',
        padding: '4px 8px',
        borderRadius: 1,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
