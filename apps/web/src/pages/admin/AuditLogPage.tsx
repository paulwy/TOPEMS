import {
  Card,
  CardContent,
  Chip,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Paper,
  IconButton,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Clock,
  Search,
  Shield,
  User,
  Activity,
  FileText,
  FlaskConical,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Calendar,
  X,
} from 'lucide-react';
import { BackButton, PageContainer } from '@/components/common';
import type { AuditLog as LimsAuditLog } from '@/api/lims';
import { auditLimsApi } from '@/api/lims';
import type { AuditLog as RdAuditLog } from '@/api/rd';
import { auditRdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { designTokens } from '@/theme/tokens';

import { ModeToggle } from '@/components/theme/ModeToggle';

const ct = designTokens.colors;

const formatDateTimeForApi = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  try {
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch {
    return dateTimeString;
  }
};

interface AuditLogPageProps {
  onNavigate?: (page: string) => void;
}

type AuditLogSource = 'lims' | 'rd';
type AuditLog = LimsAuditLog | RdAuditLog;

const AuditLogPage: React.FC<AuditLogPageProps> = ({ onNavigate }) => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntityType, setFilterEntityType] = useState<string>('all');
  const [source, setSource] = useState<AuditLogSource>('lims');
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 20;

  const logsQuery = useQuery<{ items: AuditLog[]; total: number }>({
    queryKey: [
      'admin-audit-logs',
      source,
      currentPage,
      filterStatus,
      filterAction,
      filterEntityType,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const api = source === 'lims' ? auditLimsApi : auditRdApi;
      const params: Record<string, unknown> = {
        page: Math.max(1, currentPage),
        pagesize: Math.min(100, Math.max(1, pageSize)),
      };
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterAction !== 'all') {
        params.action = filterAction;
      }
      if (filterEntityType !== 'all') {
        params.entity_type = filterEntityType;
      }
      if (startDate) {
        params.start_date = formatDateTimeForApi(startDate);
      }
      if (endDate) {
        params.end_date = formatDateTimeForApi(endDate);
      }
      apiLogger.debug('加载审计日志参数:', { source, params });
      const response = await api.listAuditLogs(params);
      apiLogger.debug('审计日志响应:', response);
      if (response.success && response.data) {
        return {
          items: response.data.audit_logs || [],
          total: response.data.total || 0,
        };
      }
      if (response.message) {
        addNotification({
          title: '提示',
          message: response.message,
          type: 'info',
        });
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const logs = logsQuery.data?.items ?? [];
  const total = logsQuery.data?.total ?? 0;
  const loading = logsQuery.isLoading;

  useEffect(() => {
    if (logsQuery.isError) {
      apiLogger.error('加载审计日志失败:', logsQuery.error);
      const errorMsg = extractErrorMessage(logsQuery.error, '加载审计日志失败');
      if (errorMsg.includes('401') || errorMsg.includes('未授权')) {
        addNotification({
          title: '登录失效',
          message: '登录已过期，请重新登录',
          type: 'error',
        });
      } else {
        addNotification({
          title: '加载失败',
          message: errorMsg,
          type: 'error',
        });
      }
    }
  }, [logsQuery.isError, logsQuery.error, addNotification]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const api = source === 'lims' ? auditLimsApi : auditRdApi;
      const params: Record<string, unknown> = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterAction !== 'all') {
        params.action = filterAction;
      }
      if (filterEntityType !== 'all') {
        params.entity_type = filterEntityType;
      }
      if (startDate) {
        params.start_date = formatDateTimeForApi(startDate);
      }
      if (endDate) {
        params.end_date = formatDateTimeForApi(endDate);
      }
      apiLogger.debug('导出审计日志参数:', { source, params });
      return api.exportAuditLogs(params);
    },
    onSuccess: (blob) => {
      apiLogger.debug('导出审计日志成功，blob size:', blob.size);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addNotification({
        title: '导出成功',
        message: '审计日志已导出',
        type: 'success',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('导出审计日志失败:', error);
      const errorMsg = extractErrorMessage(error, '导出审计日志失败');
      if (errorMsg.includes('401') || errorMsg.includes('未授权')) {
        addNotification({
          title: '登录失效',
          message: '登录已过期，请重新登录',
          type: 'error',
        });
      } else {
        addNotification({
          title: '导出失败',
          message: errorMsg,
          type: 'error',
        });
      }
    },
  });

  const exporting = exportMutation.isPending;

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
  };

  const clearDateFilters = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
        label: string;
      }
    > = {
      success: { color: 'success', label: '成功' },
      partial: { color: 'warning', label: '部分成功' },
      error: { color: 'error', label: '失败' },
    };
    const config = badges[status] || {
      color: 'default' as const,
      label: status,
    };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
      />
    );
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      batch_create: '批量创建',
      batch_delete: '批量删除',
      export: '导出',
      import: '导入',
      create: '创建',
      update: '更新',
      delete: '删除',
      read: '读取',
    };
    return map[action] || action;
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (log.user_name?.toLowerCase() || '').includes(query) ||
      (log.user_id?.toLowerCase() || '').includes(query) ||
      (log.action?.toLowerCase() || '').includes(query) ||
      (log.entity_type?.toLowerCase() || '').includes(query) ||
      (log.ip_address?.toLowerCase() || '').includes(query)
    );
  });

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))
    .filter((action): action is string => Boolean(action))
    .sort();
  const uniqueEntityTypes = Array.from(new Set(logs.map((log) => log.entity_type)))
    .filter((type): type is string => Boolean(type))
    .sort();

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: 'created_at',
        label: '时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date(row.created_at).toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'user',
        label: '用户',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User
                size={16}
                color={ct.primary.dark}
              />
            </Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.user_name || row.user_id || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'action',
        label: '操作',
        render: (row) => <Typography variant='body2'>{formatAction(row.action)}</Typography>,
      },
      {
        id: 'entity_type',
        label: '实体类型',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.entity_type}
          </Typography>
        ),
      },
      {
        id: 'ip_address',
        label: 'IP地址',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.ip_address || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'details',
        label: '详情',
        render: (row) => (
          <Box sx={{ maxWidth: 200 }}>
            {row.error_message && (
              <Typography
                variant='body2'
                sx={{ fontSize: '0.75rem', color: 'error.main' }}
              >
                {row.error_message}
              </Typography>
            )}
            {!row.error_message && row.request_details && (
              <Typography
                variant='body2'
                sx={{
                  fontSize: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {typeof row.request_details === 'string'
                  ? row.request_details
                  : JSON.stringify(row.request_details)}
              </Typography>
            )}
            {!row.error_message && !row.request_details && '-'}
          </Box>
        ),
      },
      {
        id: 'actions',
        label: '操作',
        render: (row) => (
          <IconButton
            size='small'
            onClick={() => handleViewDetail(row)}
            title='查看详情'
          >
            <Eye size={16} />
          </IconButton>
        ),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'success', label: '成功' },
          { value: 'partial', label: '部分成功' },
          { value: 'error', label: '失败' },
        ],
      },
      {
        id: 'action',
        label: '操作',
        options: [
          { value: 'all', label: '全部操作' },
          ...uniqueActions.map((action) => ({
            value: action,
            label: formatAction(action),
          })),
        ],
      },
      {
        id: 'entity_type',
        label: '实体',
        options: [
          { value: 'all', label: '全部实体' },
          ...uniqueEntityTypes.map((type) => ({ value: type, label: type })),
        ],
      },
    ],
    [uniqueActions, uniqueEntityTypes]
  );

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (typeof filters.status === 'string' || filters.status === null) {
      setFilterStatus(filters.status as string);
    }
    if (typeof filters.action === 'string' || filters.action === null) {
      setFilterAction(filters.action as string);
    }
    if (typeof filters.entity_type === 'string' || filters.entity_type === null) {
      setFilterEntityType(filters.entity_type as string);
    }
    setCurrentPage(1);
  };

  const customToolbar = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <ModeToggle />
      <Box
        sx={{
          display: 'flex',
          bgcolor: 'grey.100',
          borderRadius: 2,
          p: 0.5,
        }}
      >
        <Button
          size='small'
          variant={source === 'lims' ? 'contained' : 'text'}
          onClick={() => {
            setSource('lims');
            setCurrentPage(1);
          }}
          startIcon={<FileText size={16} />}
        >
          LIMS
        </Button>
        <Button
          size='small'
          variant={source === 'rd' ? 'contained' : 'text'}
          onClick={() => {
            setSource('rd');
            setCurrentPage(1);
          }}
          startIcon={<FlaskConical size={16} />}
        >
          RD
        </Button>
      </Box>
    </Box>
  );

  const headerActions = [
    {
      label: exporting ? '导出中...' : '导出',
      icon: <Download size={16} />,
      onClick: handleExport,
      variant: 'contained' as const,
      disabled: exporting,
    },
    {
      label: '刷新',
      icon: <RefreshCw size={16} />,
      onClick: () => logsQuery.refetch(),
      variant: 'contained' as const,
    },
  ];

  return (
    <PageContainer
      title='安全审计'
      subtitle='访问日志、操作审计'
      headerProps={{
        backButton: { href: '/dashboard' },
        customToolbar,
        actions: headerActions,
        pageIcon: <Shield size={20} />,
        pageColor: ct.primary.dark,
      }}
      maxWidth='xl'
    >
      {/* 时间范围筛选 */}
      <Box sx={{ mb: 3 }}>
        <Card>
          <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Calendar
                size={18}
                color={ct.grey[600]}
              />
              <Typography
                variant='body2'
                color='text.secondary'
              >
                时间范围:
              </Typography>
            </Box>
            <TextField
              label='开始时间'
              type='datetime-local'
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              sx={{ width: 220 }}
              slotProps={{ inputLabel: { shrink: true } } as any}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              至
            </Typography>
            <TextField
              label='结束时间'
              type='datetime-local'
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              sx={{ width: 220 }}
              slotProps={{ inputLabel: { shrink: true } } as any}
            />
            {(startDate || endDate) && (
              <Button
                variant='text'
                color='error'
                onClick={clearDateFilters}
                startIcon={<X size={14} />}
              >
                清除时间筛选
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          <ListPageTemplate
            title='审计日志'
            subtitle={`共 ${total} 条记录`}
            data={filteredLogs}
            columns={columns}
            loading={loading}
            searchPlaceholder='搜索用户名、操作、实体类型、IP...'
            searchValue={searchQuery}
            onSearch={setSearchQuery}
            filters={filters}
            filtersValue={{
              status: filterStatus,
              action: filterAction,
              entity_type: filterEntityType,
            }}
            onFilterChange={handleFilterChange}
            pagination={{
              page: currentPage,
              pageSize,
              total,
              onPageChange: setCurrentPage,
            }}
            emptyIcon={
              <Clock
                size={48}
                color={ct.grey[400]}
              />
            }
            emptyMessage='暂无审计日志'
          />
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Activity
              size={24}
              color={ct.primary.dark}
            />
            <Typography variant='h6'>审计日志详情</Typography>
          </Box>
          <IconButton
            onClick={() => setSelectedLog(null)}
            aria-label='关闭审计日志详情对话框'
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    gutterBottom
                  >
                    基本信息
                  </Typography>
                  <Grid
                    container
                    spacing={2}
                  >
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          ID:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.id}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          操作:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {formatAction(selectedLog.action)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          实体类型:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.entity_type}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          实体ID:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.entity_id || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          状态:
                        </Typography>
                        {getStatusBadge(selectedLog.status)}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Paper sx={{ p: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                    gutterBottom
                  >
                    用户信息
                  </Typography>
                  <Grid
                    container
                    spacing={2}
                  >
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          用户ID:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.user_id || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          用户名:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.user_name || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          IP地址:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {selectedLog.ip_address || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          创建时间:
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {new Date(selectedLog.created_at).toLocaleString('zh-CN')}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              {selectedLog.error_message && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3, bgcolor: 'error.light' }}>
                    <Typography
                      variant='subtitle2'
                      color='error.main'
                      gutterBottom
                    >
                      错误信息
                    </Typography>
                    <Typography
                      variant='body2'
                      color='error.main'
                    >
                      {selectedLog.error_message}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {selectedLog.request_details && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography
                      variant='subtitle2'
                      color='text.secondary'
                      gutterBottom
                    >
                      请求详情
                    </Typography>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '0.875rem',
                        color: ct.grey[800],
                      }}
                    >
                      {typeof selectedLog.request_details === 'string'
                        ? selectedLog.request_details
                        : JSON.stringify(selectedLog.request_details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
              {selectedLog.response_details && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography
                      variant='subtitle2'
                      color='text.secondary'
                      gutterBottom
                    >
                      响应详情
                    </Typography>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '0.875rem',
                        color: ct.grey[800],
                      }}
                    >
                      {typeof selectedLog.response_details === 'string'
                        ? selectedLog.response_details
                        : JSON.stringify(selectedLog.response_details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AuditLogPage;
