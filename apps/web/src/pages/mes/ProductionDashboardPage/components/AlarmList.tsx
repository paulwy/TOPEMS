import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Chip, CircularProgress, Divider, Paper, Typography, Stack } from '@mui/material';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { RealtimeAlarm } from '../types';
import { ALARM_LEVEL_META } from '../constants';
import { formatRelativeTime } from '../utils';
import i18n from '@/i18n';

const AlarmList: React.FC<{ alarms: RealtimeAlarm[]; loading?: boolean }> = ({
  alarms,
  loading,
}) => {
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
          <AlertTriangle
            size={18}
            color='error.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.alarm_list.k0')}
          </Typography>
          <Chip
            size='small'
            label={`${alarms.length}`}
            color={alarms.length > 0 ? 'error' : 'default'}
            variant='outlined'
            sx={{ height: 20, fontSize: designTokens.typography.fontSize.scale['0.7rem'] }}
          />
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          {i18n.t('pages.alarm_list.k2', { count: alarms.length })}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 320, pr: 0.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : alarms.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle2
              size={32}
              color='success.main'
              style={{ marginBottom: 8 }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {i18n.t('pages.alarm_list.k1')}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {alarms.map((alarm) => {
              const meta = ALARM_LEVEL_META[alarm.level];
              return (
                <Box
                  key={alarm.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 1.5,
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.100',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 6,
                      borderRadius: 1,
                      backgroundColor: meta.bg,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={meta.label}
                        sx={{
                          height: 18,
                          fontSize: designTokens.typography.fontSize.scale['0.65rem'],
                          backgroundColor: meta.bg,
                          color: meta.color,
                          fontWeight: 600,
                        }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', fontWeight: 500 }}
                      >
                        {alarm.source}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.disabled' }}
                      >
                        {formatRelativeTime(alarm.timestamp)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.primary', wordBreak: 'break-word' }}
                    >
                      {alarm.message}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

export default AlarmList;
