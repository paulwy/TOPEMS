import React from 'react';
import { Box, Card, CardContent, CardHeader, LinearProgress, Typography } from '@mui/material';
import type { PmStatistics } from '@/api/pm';
import i18n from '@/i18n';

interface PmReportBudgetCardProps {
  stats: PmStatistics;
  budgetUtilization: number;
}
const PmReportBudgetCard: React.FC<PmReportBudgetCardProps> = ({ stats, budgetUtilization }) => {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={<Typography variant='h6'>{i18n.t('pm.pm_report_page.text_42acf5')}</Typography>}
      />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography
            variant='body2'
            sx={{ color: 'grey.600' }}
          >
            {i18n.t('pm.pm_report_page.text_0a134c')}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 'medium', color: 'grey.900' }}
          >
            {budgetUtilization.toFixed(1)}%
          </Typography>
        </Box>
        <LinearProgress
          variant='determinate'
          value={budgetUtilization}
          sx={{ height: 16 }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ color: 'blue.600' }}
            >
              {i18n.t('pm.pm_report_page.text_b91eb1')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'blue.800' }}
            >
              {stats.total_budget.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'green.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ color: 'green.600' }}
            >
              {i18n.t('pm.pm_report_page.text_b59b00')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'green.800' }}
            >
              {stats.spent_budget.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600' }}
            >
              {i18n.t('pm.pm_report_page.text_43b510')}
            </Typography>
            <Typography
              variant='h6'
              sx={{ fontWeight: 'bold', color: 'grey.800' }}
            >
              {(stats.total_budget - stats.spent_budget).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
export default PmReportBudgetCard;
