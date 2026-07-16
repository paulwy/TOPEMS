import React from 'react';
import { Box, Card, CardContent, Typography, Divider, Alert } from '@mui/material';
import type { FmeaStatistics } from '@/api/qms';

interface StatisticsPanelProps {
  statistics: FmeaStatistics;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ statistics }) => {
  return (
    <Box>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}
      >
        <Card variant='outlined'>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              总项目数
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 600 }}
            >
              {statistics.totalItems}
            </Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              高风险 (RPN≥100)
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 600, color: 'error.main' }}
            >
              {statistics.highRiskCount}
            </Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              中风险 (50≤RPN{'<100'})
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 600, color: 'warning.main' }}
            >
              {statistics.mediumRiskCount}
            </Typography>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              低风险 (RPN{'<50'})
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 600, color: 'success.main' }}
            >
              {statistics.lowRiskCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Card variant='outlined'>
          <CardContent>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              风险指标
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2'>平均 RPN</Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {statistics.averageRpn.toFixed(1)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2'>最大 RPN</Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {statistics.maxRpn}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {statistics.highRiskCount > 0 && (
          <Alert severity='error'>
            有 <strong>{statistics.highRiskCount}</strong> 个高风险项需要优先处理！
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default StatisticsPanel;
