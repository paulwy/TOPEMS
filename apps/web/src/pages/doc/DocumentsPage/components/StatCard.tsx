import React from 'react';
import { Card, CardContent, Box, Typography } from '@mui/material';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  value: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => {
  const colors: Record<string, string> = {
    blue: 'primary.main',
    purple: 'secondary.main',
    yellow: 'warning.main',
    green: 'success.dark',
  };

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600', mb: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'grey.900' }}
            >
              {value}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
              bgcolor: colors[color as keyof typeof colors],
            }}
          >
            <Icon size={24} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;
