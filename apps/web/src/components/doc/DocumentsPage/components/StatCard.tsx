import React from 'react';
import { Card, CardContent, Box, Typography, type Theme } from '@mui/material';

interface StatCardProps {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  value: string;
  color: string;
}

// 实底瓦片：颜色走调色板键 + 色阶，前景由 getContrastText 现算
// （原写法固定 common.white，琥珀 #f59e0b 上只有 2.17:1）
const tileColors: Record<string, { key: string; shade: 'main' | 'dark' }> = {
  blue: { key: 'primary', shade: 'main' },
  purple: { key: 'secondary', shade: 'main' },
  yellow: { key: 'warning', shade: 'main' },
  green: { key: 'success', shade: 'dark' },
};

const tileEntry = (theme: Theme, color: string) => {
  const conf = tileColors[color] ?? tileColors.blue;
  const palette = theme.palette as unknown as Record<
    string,
    { main: string; light: string; dark: string }
  >;
  return palette[conf.key][conf.shade];
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => {
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
              sx={{ color: 'text.secondary', mb: 0.5 }}
            >
              {title}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: 'text.primary' }}
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
              bgcolor: (theme: Theme) => tileEntry(theme, color),
              color: (theme: Theme) => theme.palette.getContrastText(tileEntry(theme, color)),
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
