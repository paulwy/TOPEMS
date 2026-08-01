/**
 * 系统日志 Schema — 驱动 MonitorLogsPage 的 CrudPage
 *
 * 使用 CrudPage 组件实现 schema 驱动的日志查看管理，
 * 支持列表展示、详情查看、批量删除、导出等操作。
 */

import React from 'react';
import { Box, Chip, Typography, Paper, Stack, Tooltip } from '@mui/material';
import {
  Clock,
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  Server,
} from 'lucide-react';
import type { EntitySchema, SchemaField } from '@/schema';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogType = 'access' | 'error' | 'application' | 'slow_query';

const LEVEL_LABELS: Record<LogLevel, string> = {
  error: '错误',
  warn: '警告',
  info: '信息',
  debug: '调试',
};

const TYPE_LABELS: Record<LogType, string> = {
  access: '访问日志',
  error: '错误日志',
  application: '应用日志',
  slow_query: '慢查询',
};

const LEVEL_COLORS: Record<LogLevel, { bg: string; color: string; border: string }> = {
  error: { bg: 'error.100', color: 'error.700', border: ct.error.light },
  warn: { bg: ct.orange[100], color: 'warning.600', border: ct.orange[300] },
  info: { bg: 'primary.100', color: 'primary.dark', border: ct.primary[300] },
  debug: { bg: 'grey.100', color: 'grey.500', border: ct.grey[300] },
};

const SERVICES = [
  '用户服务',
  '订单服务',
  '支付服务',
  '库存服务',
  '消息服务',
  '文件服务',
  '网关服务',
  '认证服务',
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
      size="small"
      label={LEVEL_LABELS[level]}
      icon={icons[level]}
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
        fontWeight: 500,
        height: 24,
        '& .MuiChip-icon': { ml: 0.5, color: colors.color },
      }}
      variant="outlined"
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
        component="span"
        sx={{ bgcolor: 'warning.light', px: 0.25, borderRadius: 0.5 }}
      >
        {text.slice(index, index + keyword.length)}
      </Box>
      {text.slice(index + keyword.length)}
    </>
  );
};

const logFields: SchemaField[] = [
  {
    name: 'timestamp',
    label: '时间',
    type: 'datetime',
    sortable: true,
    listWidth: 180,
    renderCell: (row: Record<string, unknown>) => {
      const ts = row.timestamp as string;
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={14} color="text.disabled" />
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            {formatTimeWithMs(ts)}
          </Typography>
        </Box>
      );
    },
  },
  {
    name: 'level',
    label: '级别',
    type: 'select',
    listWidth: 100,
    renderCell: (row: Record<string, unknown>) => getLevelChip(row.level as LogLevel),
  },
  {
    name: 'service',
    label: '服务名',
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
          <Server size={12} color="primary.main" />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {row.service as string}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'message',
    label: '日志内容',
    type: 'textarea',
    listWidth: 400,
    renderCell: (row: Record<string, unknown>) => {
      const msg = row.message as string;
      const keyword = (row._searchQuery as string) || '';
      return (
        <Tooltip title={msg} placement="top-start">
          <Typography
            variant="body2"
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
          variant="body2"
          sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}
        >
          {row.trace_id as string}
        </Typography>
      </Box>
    ),
  },
  {
    name: 'duration_ms',
    label: '耗时',
    type: 'number',
    listWidth: 80,
    renderCell: (row: Record<string, unknown>) => {
      const dur = row.duration_ms as number | undefined;
      if (!dur)
        return <Typography variant="body2" color="text.disabled">-</Typography>;
      const isSlow = dur > 1000;
      return (
        <Typography variant="body2" sx={{ fontWeight: 500, color: isSlow ? 'error.main' : 'text.secondary' }}>
          {dur}ms
        </Typography>
      );
    },
  },
  {
    name: 'type',
    label: '日志类型',
    type: 'select',
    listWidth: 110,
    renderCell: (row: Record<string, unknown>) => {
      const t = row.type as LogType;
      return <Chip size="small" label={TYPE_LABELS[t]} variant="outlined" />;
    },
  },
];

export const logSchema: EntitySchema = {
  entity: 'monitor_log',
  title: '系统日志',
  description: '查看系统运行日志，追踪服务状态和异常',

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
        label: '日志级别',
        type: 'select',
        options: [
          { label: '全部级别', value: 'all' },
          ...Object.entries(LEVEL_LABELS).map(([value, label]) => ({ label, value })),
        ],
      },
      {
        id: 'service',
        label: '服务',
        type: 'select',
        options: [
          { label: '全部服务', value: 'all' },
          ...SERVICES.map((s) => ({ label: s, value: s })),
        ],
      },
      {
        id: 'type',
        label: '日志类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value })),
        ],
      },
      {
        id: 'timeRange',
        label: '时间范围',
        type: 'select',
        options: [
          { label: '近1小时', value: '1h' },
          { label: '近6小时', value: '6h' },
          { label: '近24小时', value: '24h' },
          { label: '近7天', value: '7d' },
          { label: '近30天', value: '30d' },
        ],
      },
    ],
    selectable: true,
  },

  actions: ['detail', 'delete'],

  batchActions: [
    {
      key: 'batch-delete',
      label: '批量删除',
      icon: undefined,
      color: 'error',
      onClick: () => {},
      confirm: true,
      confirmMessage: '确定要删除选中的日志吗？此操作不可撤销。',
    },
  ],

  detailTitle: '日志详情',
  detailMaxWidth: 'lg',

  renderDetail: (row) => {
    const level = row.level as LogLevel;
    return (
      <Stack spacing={3} sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                基本信息
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    日志ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                    {row.id as string}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    时间
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatTimeWithMs(row.timestamp as string)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    级别
                  </Typography>
                  {getLevelChip(level)}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    类型
                  </Typography>
                  <Chip size="small" label={TYPE_LABELS[row.type as LogType]} variant="outlined" />
                </Box>
              </Stack>
            </Paper>
          </Box>
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                服务信息
              </Typography>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    服务名
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
                      <Server size={10} color="primary.main" />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.service as string}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Trace ID
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {row.trace_id as string}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    耗时
                  </Typography>
                  <Typography
                    variant="body2"
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
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                日志内容
              </Typography>
              <Typography
                variant="body2"
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