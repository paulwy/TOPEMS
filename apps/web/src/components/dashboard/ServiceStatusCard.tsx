import React from 'react';
import { Box, Typography } from '@mui/material';

interface ServiceStatusCardProps {
  name: string;
  service: string;
  port: number;
  status: boolean;
  icon: React.ComponentType<any>;
}

const statusColors = {
  online: {
    bg: 'success.light',
    iconBg: 'success.dark',
    iconColor: 'white',
    dot: 'success.dark',
    border: 'success.light',
    textColor: '#166534',
  },
  offline: {
    bg: 'error.light',
    iconBg: 'error.main',
    iconColor: 'white',
    dot: 'error.main',
    border: 'error.light',
    textColor: '#991b1b',
  },
};

export const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({
  name,
  service,
  port,
  status,
  icon: Icon,
}) => {
  const colors = status ? statusColors.online : statusColors.offline;

  return (
    <Box
      sx={{
        padding: 1.5,
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          margin: '0 0 1 0',
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            backgroundColor: colors.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <Icon style={{ width: 16, height: 16, color: colors.iconColor }} />
        </Box>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: colors.dot,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 600,
          color: colors.textColor,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          margin: '0 0 0.5 0',
        }}
      >
        {name}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: 10, fontWeight: 500, color: 'grey.600' }}>{service}</Typography>
        <Typography sx={{ fontSize: 10, color: 'grey.600' }}>:{port}</Typography>
      </Box>
    </Box>
  );
};
