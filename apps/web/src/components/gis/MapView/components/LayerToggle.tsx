import React from 'react';
import { Box as MuiBox, Typography } from '@mui/material';
import { designTokens } from '@topems/tokens';

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
      padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
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
      sx={{ color: 'grey.700', fontSize: designTokens.typography.fontSize.scale['0.875rem'] }}
    >
      {label}
    </Typography>
  </MuiBox>
);

export default LayerToggle;
