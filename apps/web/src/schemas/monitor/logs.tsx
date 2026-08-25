/**
 * 系统日志 Schema — 驱动 MonitorLogsPage 的 CrudPage
 *
 * 使用 CrudPage 组件实现 schema 驱动的日志查看管理，
 * 支持列表展示、详情查看、批量删除、导出等操作。
 */

import React from 'react';
import { Box, Chip, Typography, Paper, Stack, Tooltip } from '@mui/material';
import { Clock, AlertCircle, AlertTriangle, Info, Bug, Server } from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogType = 'access' | 'error' | 'application' | 'slow_query';

const getLevelLabels = (): Record<LogLevel, string> => ({
  error: i18n.t('shared.logs.k0'),
  warn: i18n.t('shared.logs.k1'),
  info: i18n.t('shared.logs.k2'),
  debug: i18n.t('shared.logs.k3'),
});

const getTypeLabels = (): Record<LogType, string> => ({
  access: i18n.t('shared.logs.k4'),
  error: i18n.t('shared.logs.k5'),
  application: i18n.t('shared.logs.k6'),
  slow_query: i18n.t('shared.logs.k7'),
});

const LEVEL_COLORS: Record<LogLevel, { bg: string; color: string; border: string }> = {
  error: { bg: 'error.100', color: 'error.700', border: ct.error.light },
  warn: { bg: ct.orange[100], color: 'warning.600', border: ct.orange[300] },
  info: { bg: 'primary.100', color: 'primary.dark', border: ct.primary[300] },
  debug: { bg: 'grey.100', color: 'grey.500', border: ct.grey[300] },
};

const getServices = (): string[] => [
  i18n.t('shared.logs.k8'),
  i18n.t('shared.logs.k9'),
  i18n.t('shared.logs.k10'),
  i18n.t('shared.logs.k11'),
  i18n.t('shared.logs.k12'),
  i18n.t('shared.logs.k13'),
  i18n.t('shared.logs.k14'),
  i18n.t('shared.logs.k15'),
];

const formatTimeWithMs = (isoString: string): string => {
  const date = new Date(isoString);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

const getLevelChip = (level: LogLevel): React.ReactNode => {
  const colors = LEVEL_COLORS[level];
  const icons = {
    error: <AlertCircle size={14} />,
    warn: <AlertTriangle size={14} />,
    info: <Info size={14} />,
    debug: <Bug size={14} />,
  };
  return (
    <Chip
      size='small'
      label={getLevelLabels()[level]}
      icon={icons[level]}
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontWeight: 500,
        height: 24,
        '& .MuiChip-icon': { ml: 0.5, color: colors.color },
      }}
      variant='outlined'
    />
  );
};

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword) return text;
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <Box
        component='span'
        sx={{ bgcolor: 'warning.light', px: 0.25, borderRadius: 0.5 }}
      >
        {text.slice(index, index + keyword.length)}
      </Box>
      {text.slice(index + keyword.length)}
    </>
  );
};

const getLogFields = (): SchemaField[] => [
  {
    name: 'timestamp',
    label: i18n.t('shared.logs.k16'),
    type: 'datetime',
    sortable: true,
    listWidth: 180,
    renderCell: (row: Record<string, unknown>) => {
      const ts = row.timestamp as string;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock
            size={14}
            color='text.disabled'
          />
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            }}
          >
            {formatTimeWithMs(ts)}
          </Typography>
        </Box>
      );
    },
  },
  {
    name: 'level',
    label: i18n.t('shared.logs.k17'),
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => getLevelChip(row.level as LogLevel),
  },
  {
    name: 'service',
    label: i18n.t('shared.logs.k18'),
    type: 'text',
    listWidth: 140,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Server
            size={12}
            color='primary.main'
          />
        </Box>
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.service as string}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'message',
    label: i18n.t('shared.logs.k19'),
    type: 'textarea',
    listWidth: 400,
    renderCell: (row: Record<string, unknown>) => {
      const msg = row.message as string;
      const keyword = (row._searchQuery as string) || '';
      return (
        <Tooltip
          title={msg}
          placement='top-start'
        >
          <Typography
            variant='body2'
            sx={{
              maxWidth: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlightText(truncateText(msg, 80), keyword)}
          </Typography>
        </Tooltip>
      );
    },
  },
  {
    name: 'trace_id',
    label: 'Trace ID',
    type: 'text',
    listWidth: 160,
    renderCell: (row: Record<string, unknown>) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant='body2'
          sx={{
            fontFamily: 'monospace',
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            color: 'text.secondary',
          }}
        >
          {row.trace_id as string}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'duration_ms',
    label: i18n.t('shared.logs.k20'),
    type: 'number',
    listWidth: 80,
    renderCell: (row: Record<string, unknown>) => {
      const dur = row.duration_ms as number | undefined;
      if (!dur)
        return (
          <Typography
            variant='body2'
            color='text.disabled'
          >
            -
          </Typography>
        );
      const isSlow = dur > 1000;
      return (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500, color: isSlow ? 'error.main' : 'text.secondary' }}
        >
          {dur}ms
        </Typography>
      );
    },
  },
  {
    name: 'type',
    label: i18n.t('shared.logs.k21'),
    type: 'select',
    listWidth: 110,
    renderCell: (row: Record<string, unknown>) => {
      const t = row.type as LogType;
      return (
        <Chip
          size='small'
          label={getTypeLabels()[t]}
          variant='outlined'
        />
      );
    },
  },
];

export const getLogSchema = (): EntitySchema => {
  const logFields = getLogFields();
  const LEVEL_LABELS = getLevelLabels();
  const TYPE_LABELS = getTypeLabels();
  const SERVICES = getServices();

  return {
    entity: 'monitor_log',
    title: i18n.t('shared.logs.k22'),
    description: i18n.t('shared.logs.k23'),

    api: {
      module: 'monitor',
      resource: 'logs',
    },

    fields: logFields,

    list: {
      searchFields: ['message', 'service', 'trace_id'],
      pageSize: 20,
      filters: [
        {
          id: 'level',
          label: i18n.t('shared.logs.k24'),
          type: 'select',
          options: [
            { label: i18n.t('shared.logs.k25'), value: 'all' },
            ...Object.entries(LEVEL_LABELS).map(([value, label]) => ({ label, value })),
          ],
        },
        {
          id: 'service',
          label: i18n.t('shared.logs.k26'),
          type: 'select',
          options: [
            { label: i18n.t('shared.logs.k27'), value: 'all' },
            ...SERVICES.map((s) => ({ label: s, value: s })),
          ],
        },
        {
          id: 'type',
          label: i18n.t('shared.logs.k28'),
          type: 'select',
          options: [
            { label: i18n.t('shared.logs.k29'), value: 'all' },
            ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value })),
          ],
        },
        {
          id: 'timeRange',
          label: i18n.t('shared.logs.k30'),
          type: 'select',
          options: [
            { label: i18n.t('shared.logs.1_31'), value: '1h' },
            { label: i18n.t('shared.logs.6_32'), value: '6h' },
            { label: i18n.t('shared.logs.24_33'), value: '24h' },
            { label: i18n.t('shared.logs.7_34'), value: '7d' },
            { label: i18n.t('shared.logs.30_35'), value: '30d' },
          ],
        },
      ],
      selectable: true,
    },

    actions: ['detail', 'delete'],

    batchActions: [
      {
        key: 'batch-delete',
        label: i18n.t('shared.logs.k36'),
        icon: undefined,
        color: 'error',
        onClick: () => {},
        confirm: true,
        confirmMessage: i18n.t('shared.logs.k37'),
      },
    ],

    detailTitle: i18n.t('shared.logs.k38'),
    detailMaxWidth: 'lg',

    renderDetail: (row) => {
      const level = row.level as LogLevel;
      return (
        <Stack
          spacing={3}
          sx={{ pt: 1 }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
              <Paper sx={{ p: 2 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {i18n.t('schemas.logs.k0')}
                </Typography>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.id_1')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                    >
                      {row.id as string}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.k2')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {formatTimeWithMs(row.timestamp as string)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.k3')}
                    </Typography>
                    {getLevelChip(level)}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.k4')}
                    </Typography>
                    <Chip
                      size='small'
                      label={TYPE_LABELS[row.type as LogType]}
                      variant='outlined'
                    />
                  </Box>
                </Stack>
              </Paper>
            </Box>
            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
              <Paper sx={{ p: 2 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {i18n.t('schemas.logs.k5')}
                </Typography>
                <Stack spacing={1.5}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.k6')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Server
                          size={10}
                          color='primary.main'
                        />
                      </Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {row.service as string}
                      </Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      Trace ID
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                      }}
                    >
                      {row.trace_id as string}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('schemas.logs.k7')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{
                        fontWeight: 500,
                        color:
                          row.duration_ms && (row.duration_ms as number) > 1000
                            ? 'error.main'
                            : 'text.primary',
                      }}
                    >
                      {row.duration_ms ? `${row.duration_ms}ms` : '-'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Box>
            <Box sx={{ width: '100%' }}>
              <Paper
                sx={{
                  p: 2,
                  bgcolor: level === 'error' ? 'error.light' : 'grey.50',
                }}
              >
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  gutterBottom
                >
                  {i18n.t('schemas.logs.k8')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    color: level === 'error' ? 'error.main' : 'text.primary',
                  }}
                >
                  {row.message as string}
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Stack>
      );
    },
  };
};
