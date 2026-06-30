/**
 * 系统日志页面
 *
 * @module pages/monitor
 * @path /monitor/logs
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Tabs,
  Tab,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Eye,
  Download,
  RefreshCw,
  Clock,
  Activity,
  X,
  Copy,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Zap,
  Server,
  Link as LinkIcon,
  List,
  Radio,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer, ConfirmDialog } from '@/components/common';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogType = 'access' | 'error' | 'application' | 'slow_query';
type LogTab = 'all' | 'error' | 'access' | 'application' | 'slow_query';

interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  trace_id: string;
  duration_ms?: number;
  type: LogType;
  metadata?: Record<string, unknown>;
}

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
  error: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  warn: { bg: '#ffedd5', color: '#ea580c', border: '#fdba74' },
  info: { bg: '#dbeafe', color: '#2563eb', border: '#93c5fd' },
  debug: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
};

const generateMockLogs = (): SystemLog[] => {
  const now = Date.now();
  const logs: SystemLog[] = [
    {
      id: 'log-001',
      timestamp: new Date(now - 2 * 60 * 1000).toISOString(),
      level: 'error',
      service: '订单服务',
      message: '创建订单失败：库存不足，商品ID=SKU-2024001，请求库存=10，实际库存=3',
      trace_id: 'trace-abc123def456',
      duration_ms: 1250,
      type: 'error',
    },
    {
      id: 'log-002',
      timestamp: new Date(now - 5 * 60 * 1000).toISOString(),
      level: 'warn',
      service: '用户服务',
      message: '用户登录失败次数过多，用户ID=user_10086，失败次数=5，IP=192.168.1.100',
      trace_id: 'trace-bcd234efg567',
      duration_ms: 45,
      type: 'application',
    },
    {
      id: 'log-003',
      timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
      level: 'info',
      service: '网关服务',
      message: 'GET /api/v1/users/profile 200 45ms',
      trace_id: 'trace-cde345fgh678',
      duration_ms: 45,
      type: 'access',
    },
    {
      id: 'log-004',
      timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
      level: 'error',
      service: '支付服务',
      message: '支付回调验证失败：签名不匹配，订单号=ORD20240601001',
      trace_id: 'trace-def456ghi789',
      duration_ms: 89,
      type: 'error',
    },
    {
      id: 'log-005',
      timestamp: new Date(now - 15 * 60 * 1000).toISOString(),
      level: 'info',
      service: '认证服务',
      message: '用户登录成功，用户ID=user_10001，IP=10.0.0.25',
      trace_id: 'trace-efg567hij890',
      duration_ms: 120,
      type: 'access',
    },
    {
      id: 'log-006',
      timestamp: new Date(now - 20 * 60 * 1000).toISOString(),
      level: 'warn',
      service: '数据库服务',
      message: '慢查询检测：SELECT * FROM orders WHERE created_at > ? 执行时间=2500ms',
      trace_id: 'trace-fgh678ijk901',
      duration_ms: 2500,
      type: 'slow_query',
    },
    {
      id: 'log-007',
      timestamp: new Date(now - 25 * 60 * 1000).toISOString(),
      level: 'debug',
      service: '消息服务',
      message: '消息队列消费者处理消息，topic=order-notify，offset=12345',
      trace_id: 'trace-ghi789jkl012',
      duration_ms: 15,
      type: 'application',
    },
    {
      id: 'log-008',
      timestamp: new Date(now - 30 * 60 * 1000).toISOString(),
      level: 'info',
      service: '文件服务',
      message: '文件上传成功，文件ID=file_abc123，大小=2.5MB，类型=image/png',
      trace_id: 'trace-hij890klm123',
      duration_ms: 350,
      type: 'application',
    },
    {
      id: 'log-009',
      timestamp: new Date(now - 35 * 60 * 1000).toISOString(),
      level: 'error',
      service: '库存服务',
      message: '库存扣减事务超时，事务ID=txn_xyz789，等待锁时间=30s',
      trace_id: 'trace-ijk901lmn234',
      duration_ms: 30000,
      type: 'slow_query',
    },
    {
      id: 'log-010',
      timestamp: new Date(now - 40 * 60 * 1000).toISOString(),
      level: 'info',
      service: '订单服务',
      message: 'POST /api/v1/orders 201 560ms',
      trace_id: 'trace-jkl012mno345',
      duration_ms: 560,
      type: 'access',
    },
    {
      id: 'log-011',
      timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      level: 'warn',
      service: '网关服务',
      message: '请求频率接近限流阈值，IP=10.0.0.100，当前QPS=95，阈值=100',
      trace_id: 'trace-klm123nop456',
      duration_ms: 12,
      type: 'application',
    },
    {
      id: 'log-012',
      timestamp: new Date(now - 50 * 60 * 1000).toISOString(),
      level: 'debug',
      service: '用户服务',
      message: '缓存命中：user_profile:user_10001，TTL=295s',
      trace_id: 'trace-lmn234opq567',
      duration_ms: 2,
      type: 'application',
    },
    {
      id: 'log-013',
      timestamp: new Date(now - 55 * 60 * 1000).toISOString(),
      level: 'error',
      service: '消息服务',
      message: '消息发送失败：连接超时，topic=payment-callback，重试次数=3',
      trace_id: 'trace-mno345pqr678',
      duration_ms: 5000,
      type: 'error',
    },
    {
      id: 'log-014',
      timestamp: new Date(now - 58 * 60 * 1000).toISOString(),
      level: 'info',
      service: '支付服务',
      message: '支付成功，订单号=ORD20240601002，金额=299.00，支付方式=支付宝',
      trace_id: 'trace-nop456qrs789',
      duration_ms: 450,
      type: 'application',
    },
  ];
  return logs;
};

const formatTimeWithMs = (isoString: string): string => {
  const date = new Date(isoString);
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

const highlightText = (text: string, keyword: string): React.ReactNode => {
  if (!keyword) return text;
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <Box component="span" sx={{ bgcolor: 'warning.light', px: 0.25, borderRadius: 0.5 }}>
        {text.slice(index, index + keyword.length)}
      </Box>
      {text.slice(index + keyword.length)}
    </>
  );
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

export const MonitorLogsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<LogTab>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'stream'>('table');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const pageSize = 20;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockData = generateMockLogs();
      setLogs(mockData);
      setTotal(mockData.length);
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '加载日志失败');
      setError(errorMsg);
      addNotification({
        title: '加载失败',
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (activeTab !== 'all') {
      result = result.filter((log) => {
        if (activeTab === 'error') return log.level === 'error';
        if (activeTab === 'access') return log.type === 'access';
        if (activeTab === 'application') return log.type === 'application';
        if (activeTab === 'slow_query') return log.type === 'slow_query';
        return true;
      });
    }

    if (levelFilter !== 'all') {
      result = result.filter((log) => log.level === levelFilter);
    }

    if (serviceFilter !== 'all') {
      result = result.filter((log) => log.service === serviceFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter((log) => log.type === typeFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          log.service.toLowerCase().includes(query) ||
          log.trace_id.toLowerCase().includes(query)
      );
    }

    return result;
  }, [logs, activeTab, levelFilter, serviceFilter, typeFilter, searchQuery]);

  const stats = useMemo(() => {
    const todayLogs = logs.filter((l) => {
      const logDate = new Date(l.timestamp).toDateString();
      const today = new Date().toDateString();
      return logDate === today;
    });
    const errorCount = logs.filter((l) => l.level === 'error').length;
    const warnCount = logs.filter((l) => l.level === 'warn').length;
    const slowQueryCount = logs.filter((l) => l.type === 'slow_query').length;

    return [
      { id: 'today', title: '今日日志数', value: todayLogs.length, icon: <FileText size={20} />, color: 'primary' as const },
      { id: 'error', title: '错误日志数', value: errorCount, icon: <AlertCircle size={20} />, color: 'error' as const },
      { id: 'warn', title: '警告日志数', value: warnCount, icon: <AlertTriangle size={20} />, color: 'warning' as const },
      { id: 'slow', title: '慢查询数', value: slowQueryCount, icon: <Zap size={20} />, color: 'secondary' as const },
    ];
  }, [logs]);

  const getLevelChip = useCallback((level: LogLevel) => {
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
  }, []);

  const handleViewDetail = useCallback((log: SystemLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  }, []);

  const handleCopy = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({
        title: '复制成功',
        message: `${label}已复制到剪贴板`,
        type: 'success',
      });
    }).catch(() => {
      addNotification({
        title: '复制失败',
        message: '无法复制到剪贴板',
        type: 'error',
      });
    });
  }, [addNotification]);

  const handleExport = useCallback(() => {
    try {
      const exportData = filteredLogs.map((log) => ({
        时间: formatTimeWithMs(log.timestamp),
        级别: LEVEL_LABELS[log.level],
        服务: log.service,
        类型: TYPE_LABELS[log.type],
        内容: log.message,
        TraceID: log.trace_id,
        耗时: log.duration_ms ? `${log.duration_ms}ms` : '-',
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: '成功',
        message: '日志导出成功',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '导出失败'),
        type: 'error',
      });
    }
  }, [filteredLogs, addNotification]);

  const handleRefresh = useCallback(() => {
    loadData();
    addNotification({
      title: '刷新成功',
      message: '日志数据已刷新',
      type: 'success',
    });
  }, [loadData, addNotification]);

  const handleBatchDelete = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const confirmBatchDelete = useCallback(() => {
    setLogs((prev) => prev.filter((log) => !selectedIds.includes(log.id)));
    setTotal((prev) => prev - selectedIds.length);
    setSelectedIds([]);
    setConfirmOpen(false);
    addNotification({
      title: '删除成功',
      message: `已删除 ${selectedIds.length} 条日志`,
      type: 'success',
    });
  }, [selectedIds, addNotification]);

  const columns: ColumnDef<SystemLog>[] = useMemo(
    () => [
      {
        id: 'timestamp',
        label: '时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={14} color="text.disabled" />
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {formatTimeWithMs(row.timestamp)}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'level',
        label: '级别',
        render: (row) => getLevelChip(row.level),
      },
      {
        id: 'service',
        label: '服务名',
        render: (row) => (
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
              {row.service}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'message',
        label: '日志内容',
        render: (row) => (
          <Tooltip title={row.message} placement="top-start">
            <Typography variant="body2" sx={{ maxWidth: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {highlightText(truncateText(row.message, 80), searchQuery)}
            </Typography>
          </Tooltip>
        ),
      },
      {
        id: 'trace_id',
        label: 'Trace ID',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'text.secondary',
              }}
            >
              {row.trace_id}
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(row.trace_id, 'Trace ID');
              }}
              title="复制 Trace ID"
              sx={{ width: 20, height: 20 }}
            >
              <Copy size={12} />
            </IconButton>
          </Box>
        ),
      },
      {
        id: 'duration',
        label: '耗时',
        render: (row) => {
          if (!row.duration_ms) return <Typography variant="body2" color="text.disabled">-</Typography>;
          const isSlow = row.duration_ms > 1000;
          return (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: isSlow ? 'error.main' : 'text.secondary',
              }}
            >
              {row.duration_ms}ms
            </Typography>
          );
        },
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Tooltip title="查看详情">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetail(row);
                }}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="复制日志">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(row.message, '日志内容');
                }}
              >
                <Copy size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="关联日志">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery(row.trace_id);
                  addNotification({
                    type: 'info',
                    message: '已按 Trace ID 筛选关联日志',
                  });
                }}
              >
                <LinkIcon size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [getLevelChip, handleViewDetail, handleCopy, searchQuery, addNotification]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'level',
        label: '日志级别',
        type: 'select' as const,
        options: [
          { label: '全部级别', value: 'all' },
          ...Object.entries(LEVEL_LABELS).map(([value, label]) => ({ label, value })),
        ],
      },
      {
        id: 'service',
        label: '服务',
        type: 'select' as const,
        options: [
          { label: '全部服务', value: 'all' },
          ...SERVICES.map((s) => ({ label: s, value: s })),
        ],
      },
      {
        id: 'type',
        label: '日志类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value })),
        ],
      },
      {
        id: 'timeRange',
        label: '时间范围',
        type: 'select' as const,
        options: [
          { label: '近1小时', value: '1h' },
          { label: '近6小时', value: '6h' },
          { label: '近24小时', value: '24h' },
          { label: '近7天', value: '7d' },
          { label: '近30天', value: '30d' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.level === 'string') {
      setLevelFilter(filters.level);
    }
    if (typeof filters.service === 'string') {
      setServiceFilter(filters.service);
    }
    if (typeof filters.type === 'string') {
      setTypeFilter(filters.type);
    }
    if (typeof filters.timeRange === 'string') {
      setTimeRange(filters.timeRange);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: LogTab) => {
    setActiveTab(newValue);
    setPage(1);
  }, []);

  const headerContent = (
    <Box>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{
          '& .MuiTab-root': {
            textTransform: 'none',
            minHeight: 40,
          },
        }}
      >
        <Tab label="全部" value="all" />
        <Tab label="错误日志" value="error" icon={<AlertCircle size={14} />} iconPosition="start" />
        <Tab label="访问日志" value="access" icon={<Activity size={14} />} iconPosition="start" />
        <Tab label="应用日志" value="application" icon={<FileText size={14} />} iconPosition="start" />
        <Tab label="慢查询" value="slow_query" icon={<Zap size={14} />} iconPosition="start" />
      </Tabs>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText size={20} />,
        backButton: {
          href: '/monitor/dashboard',
        },
        children: (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="table" title="表格视图">
                <List size={16} />
              </ToggleButton>
              <ToggleButton value="stream" title="流式视图">
                <Radio size={16} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ),
      }}
    >
      <ListPageTemplate
        title=""
        subtitle=""
        columns={columns}
        data={filteredLogs}
        loading={loading}
        error={error || undefined}
        searchable
        searchPlaceholder="搜索日志内容、服务名、Trace ID..."
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          level: levelFilter,
          service: serviceFilter,
          type: typeFilter,
          timeRange,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total: filteredLogs.length,
          onPageChange: handlePageChange,
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids as string[])}
        batchActions={[
          { label: '批量删除', icon: <X size={16} />, color: 'error' as const, onClick: handleBatchDelete, confirm: true },
        ]}
        actions={[
          {
            label: '导出日志',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
        ]}
        onRefresh={loadData}
        emptyMessage="暂无日志数据"
        headerContent={headerContent}
      />

      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FileText size={24} color="primary.main" />
            <Typography variant="h6">日志详情</Typography>
            {selectedLog && getLevelChip(selectedLog.level)}
          </Box>
          <IconButton onClick={() => setDetailOpen(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      基本信息
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">日志ID</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>{selectedLog.id}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">时间</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{formatTimeWithMs(selectedLog.timestamp)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">级别</Typography>
                        {getLevelChip(selectedLog.level)}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">类型</Typography>
                        <Chip size="small" label={TYPE_LABELS[selectedLog.type]} variant="outlined" />
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
                        <Typography variant="body2" color="text.secondary">服务名</Typography>
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
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{selectedLog.service}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Trace ID</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {selectedLog.trace_id}
                          </Typography>
                          <IconButton size="small" onClick={() => handleCopy(selectedLog.trace_id, 'Trace ID')}>
                            <Copy size={14} />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">耗时</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            color: selectedLog.duration_ms && selectedLog.duration_ms > 1000 ? 'error.main' : 'text.primary',
                          }}
                        >
                          {selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : '-'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
                <Box sx={{ width: '100%' }}>
                  <Paper sx={{ p: 2, bgcolor: selectedLog.level === 'error' ? 'error.light' : 'grey.50' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      日志内容
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: selectedLog.level === 'error' ? 'error.main' : 'text.primary',
                      }}
                    >
                      {selectedLog.message}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<LinkIcon size={16} />}
            onClick={() => {
              if (selectedLog) {
                setSearchQuery(selectedLog.trace_id);
                setDetailOpen(false);
                addNotification({
                  type: 'info',
                  message: '已按 Trace ID 筛选关联日志',
                });
              }
            }}
          >
            查看关联日志
          </Button>
          <Button
            startIcon={<Copy size={16} />}
            onClick={() => {
              if (selectedLog) {
                handleCopy(selectedLog.message, '日志内容');
              }
            }}
          >
            复制内容
          </Button>
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="确认删除"
        message={`确定要删除选中的 ${selectedIds.length} 条日志吗？此操作不可撤销。`}
        confirmLabel="删除"
        cancelLabel="取消"
        danger
        onConfirm={confirmBatchDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </PageContainer>
  );
};

export default MonitorLogsPage;
