import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Zap, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Grid } from '@/components/common';
import type { ChartData } from '@/components/charts/AreaChart';
import { usageData, modelUsageData } from '../hooks/useAiModelSettings';
import { LazyChart } from '@/components/charts';

interface TotalUsage {
  tokens: number;
  cost: number;
  requests: number;
}

interface AiModelUsageStatsProps {
  totalUsage: TotalUsage;
}

export const AiModelUsageStats: React.FC<AiModelUsageStatsProps> = ({ totalUsage }) => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* Usage summary cards */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Grid
          item
          xs={12}
          sm={4}
        >
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main' }}>
                <Zap size={22} />
              </Avatar>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {Math.round(totalUsage.tokens / 1000)}K
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('ai.model_settings.usage.total_tokens')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid
          item
          xs={12}
          sm={4}
        >
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.50', color: 'success.main' }}>
                <TrendingUp size={22} />
              </Avatar>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {totalUsage.requests}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('ai.model_settings.usage.total_requests')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid
          item
          xs={12}
          sm={4}
        >
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.50', color: 'warning.main' }}>
                <DollarSign size={22} />
              </Avatar>
              <Box>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  ${totalUsage.cost.toFixed(2)}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('ai.model_settings.usage.total_cost')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Grid
        container
        spacing={3}
      >
        <Grid
          item
          xs={12}
          md={8}
        >
          <Paper
            variant='outlined'
            sx={{ p: 3, borderRadius: 3 }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('ai.model_settings.usage.trend_7days')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <LazyChart type='line'
                data={usageData as unknown as ChartData[]}
                xKey='date'
                yKey='tokens'
              />
            </Box>
          </Paper>
        </Grid>
        <Grid
          item
          xs={12}
          md={4}
        >
          <Paper
            variant='outlined'
            sx={{ p: 3, borderRadius: 3 }}
          >
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {t('ai.model_settings.usage.model_ratio')}
            </Typography>
            <Box sx={{ height: 300 }}>
              <LazyChart type='pie' data={modelUsageData} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Paper
          variant='outlined'
          sx={{ borderRadius: 3, overflow: 'hidden' }}
        >
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {t('ai.model_settings.usage.daily_detail')}
            </Typography>
          </Box>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('ai.model_settings.field.date')}</TableCell>
                  <TableCell align='right'>{t('ai.model_settings.field.request_count')}</TableCell>
                  <TableCell align='right'>{t('ai.model_settings.field.token_usage')}</TableCell>
                  <TableCell align='right'>{t('ai.model_settings.field.cost_estimate')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usageData.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell align='right'>{row.requests}</TableCell>
                    <TableCell align='right'>{row.tokens.toLocaleString()}</TableCell>
                    <TableCell align='right'>${row.cost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </Box>
  );
};
