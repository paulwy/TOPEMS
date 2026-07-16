import React from 'react';
import { Box as MuiBox, Typography } from '@mui/material';

const LayerToggle: React.FC<{
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
}> = ({ label, icon: _, checked, onChange, color }) => (
  <MuiBox
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: 1,
      '&:hover': {
        backgroundColor: 'grey.50',
      },
    }}
    onClick={() => onChange(!checked)}
  >
    <MuiBox
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: checked ? color : 'grey.300',
      }}
    />
    <Typography
      variant='body2'
      sx={{ color: 'grey.700', fontSize: '0.875rem' }}
    >
      {label}
    </Typography>
  </MuiBox>
);

export default LayerToggle;
