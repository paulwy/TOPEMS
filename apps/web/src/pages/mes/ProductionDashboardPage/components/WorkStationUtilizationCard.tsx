import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Typography,
  Stack,
} from '@mui/material';
import { Gauge } from 'lucide-react';
import type { WorkStationUtilization } from '../types';
import { formatPercent } from '../utils';
import i18n from '@/i18n';

const WorkStationUtilizationCard: React.FC<{
  data: WorkStationUtilization[];
  loading?: boolean;
}> = ({ data, loading }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Gauge
            size={18}
            color='primary.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.work_station_utilization_card.k0')}
          </Typography>
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          TOP {data.length}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : data.length === 0 ? (
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
          >
            {i18n.t('pages.work_station_utilization_card.k1')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {data.map((item) => {
              const value = Math.min(Math.max(item.utilization, 0), 1);
              const color =
                value >= 0.85
                  ? 'error.main'
                  : value >= 0.6
                    ? 'warning.main'
                    : value >= 0.3
                      ? 'primary.main'
                      : 'grey.400';
              return (
                <Box key={item.workStation.id}>
                  <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', mb: 0.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {item.workStation.name}
                      </Typography>
                      <Chip
                        size='small'
                        label={item.workStation.code || item.workStation.status}
                        variant='outlined'
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Stack>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color }}
                    >
                      {formatPercent(value)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant='determinate'
                    value={value * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.100',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: color,
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', mt: 0.5 }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('pages.work_station_utilization_card.k2')]: {item.activeOrders}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      [i18n.t('pages.work_station_utilization_card.k3')]: {item.todayOutput}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

export default WorkStationUtilizationCard;
