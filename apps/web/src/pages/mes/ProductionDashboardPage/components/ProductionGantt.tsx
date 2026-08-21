import React, { useMemo } from 'react';
import { Box, CircularProgress, Divider, Paper, Tooltip, Typography, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Calendar } from 'lucide-react';
import type { ProductionSchedule } from '@/api/mes';
import { ct, SCHEDULE_STATUS_META } from '../constants';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

const ProductionGantt: React.FC<{
  schedules: ProductionSchedule[];
  loading?: boolean;
}> = ({ schedules, loading }) => {
  const windowData = useMemo(() => {
    if (schedules.length === 0) {
      const now = Date.now();
      return { start: now - 60 * 60 * 1000, end: now + 6 * 60 * 60 * 1000 };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    schedules.forEach((s) => {
      if (s.planned_start_time) {
        const t = new Date(s.planned_start_time).getTime();
        if (Number.isFinite(t)) {
          min = Math.min(min, t);
          max = Math.max(max, t);
        }
      }
      if (s.planned_end_time) {
        const t = new Date(s.planned_end_time).getTime();
        if (Number.isFinite(t)) max = Math.max(max, t);
      }
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const now = Date.now();
      return { start: now - 60 * 60 * 1000, end: now + 6 * 60 * 60 * 1000 };
    }
    return {
      start: min - 30 * 60 * 1000,
      end: max + 30 * 60 * 1000,
    };
  }, [schedules]);

  const totalSpan = Math.max(windowData.end - windowData.start, 60 * 60 * 1000);
  const hourLabels = useMemo(() => {
    const labels: { offset: number; label: string }[] = [];
    const startDate = new Date(windowData.start);
    startDate.setMinutes(0, 0, 0);
    let cursor = startDate.getTime();
    while (cursor <= windowData.end) {
      const offset = ((cursor - windowData.start) / totalSpan) * 100;
      const d = new Date(cursor);
      labels.push({
        offset,
        label: `${String(d.getHours()).padStart(2, '0')}:00`,
      });
      cursor += 60 * 60 * 1000;
    }
    return labels;
  }, [windowData, totalSpan]);

  const nowOffset = ((Date.now() - windowData.start) / totalSpan) * 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
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
          <Calendar
            size={18}
            color={ct.info.main}
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.production_gantt.k0')}
          </Typography>
        </Stack>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          {Object.entries(SCHEDULE_STATUS_META).map(([key, meta]) => (
            <Stack
              key={key}
              direction='row'
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 0.5,
                  backgroundColor: meta.color,
                }}
              />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {meta.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : schedules.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Calendar
            size={32}
            color='grey.400'
            style={{ marginBottom: 8 }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.production_gantt.k1')}
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box
            sx={{
              position: 'relative',
              height: 28,
              ml: '180px',
              borderBottom: '1px solid',
              borderColor: 'grey.200',
              mb: 1,
            }}
          >
            {hourLabels.map((h, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  left: `${h.offset}%`,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px dashed',
                  borderColor: 'grey.200',
                  pl: 0.5,
                }}
              >
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  {h.label}
                </Typography>
              </Box>
            ))}
            {nowOffset >= 0 && nowOffset <= 100 && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${nowOffset}%`,
                  top: -4,
                  bottom: -4,
                  width: 2,
                  backgroundColor: 'error.main',
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -6,
                    left: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: 'error.main',
                    boxShadow: (theme) => `0 0 0 4px ${alpha(theme.palette.error.main, 0.15)}`,
                  }}
                />
              </Box>
            )}
          </Box>

          <Stack spacing={0.75}>
            {schedules.slice(0, 12).map((s) => {
              const startT = s.planned_start_time ? new Date(s.planned_start_time).getTime() : null;
              const endT = s.planned_end_time ? new Date(s.planned_end_time).getTime() : null;
              if (!startT || !endT || !Number.isFinite(startT) || !Number.isFinite(endT)) {
                return null;
              }
              const left = Math.max(((startT - windowData.start) / totalSpan) * 100, 0);
              const width = Math.max(((endT - startT) / totalSpan) * 100, 1.5);
              const meta = SCHEDULE_STATUS_META[s.status] || SCHEDULE_STATUS_META.pending;
              return (
                <Stack
                  key={s.id}
                  direction='row'
                  sx={{
                    alignItems: 'center',
                    height: 36,
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'grey.50' },
                  }}
                >
                  <Stack
                    direction='row'
                    spacing={0.75}
                    sx={{ alignItems: 'center', width: 180, pr: 1.5, flexShrink: 0 }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 22,
                        borderRadius: 1,
                        backgroundColor: meta.color,
                      }}
                    />
                    <Tooltip title={`${s.order_number || ''} - ${s.id}`}>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.order_number || s.id.slice(0, 8)}
                      </Typography>
                    </Tooltip>
                  </Stack>
                  <Box
                    sx={{
                      position: 'relative',
                      flex: 1,
                      height: 24,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                    }}
                  >
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant='caption'>{s.order_number || s.id}</Typography>
                          <br />
                          <Typography variant='caption'>
                            [i18n.t('pages.production_gantt.k2')]: {s.quantity} |{' '}
                            {i18n.t('pages.production_gantt.k3')}
                            {meta.label}
                          </Typography>
                          <br />
                          <Typography variant='caption'>
                            {new Date(startT).toLocaleString('zh-CN')} ~{' '}
                            {new Date(endT).toLocaleString('zh-CN')}
                          </Typography>
                        </Box>
                      }
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          bottom: 2,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderRadius: 1,
                          backgroundColor: meta.color,
                          color: 'common.white',
                          display: 'flex',
                          alignItems: 'center',
                          px: 1,
                          cursor: 'pointer',
                          boxShadow: `0 1px 2px ${designTokens.colors.action.selected}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: `0 4px 8px ${designTokens.colors.action.selected}`,
                          },
                        }}
                      >
                        <Typography
                          variant='caption'
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {meta.label} · {s.quantity}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

export default ProductionGantt;
