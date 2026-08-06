import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { User, FileText, FlaskConical, Database, Download, Calendar, X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { ColumnDef } from '@/components/templates/list/types';
import { auditLogSchema } from '@/schemas/monitor';
import { apiClient } from '@/api/client';
import { auditLimsApi } from '@/api/lims';
import { auditRdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;
type AuditLogSource = 'lims' | 'rd' | 'core';

const formatDateTimeForApi = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  try {
    return new Date(dateTimeString).toISOString();
  } catch {
    return dateTimeString;
  }
};

const formatAction = (action: string): string => {
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

const getStatusChip = (status: string | null | undefined): React.ReactNode => {
  const configs: Record<
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
  const config = configs[status ?? ''] || {
    color: 'default' as const,
    label: status || '-',
  };
  return (
    <Chip
      size='small'
      color={config.color}
      label={config.label}
    />
  );
};

const DetailContent: React.FC<{ row: Record<string, unknown> }> = ({ row }) => {
  const formatDate = (val: unknown) =>
    val ? new Date(val as string).toLocaleString('zh-CN') : '-';

  const renderJson = (val: unknown) => {
    if (!val) return '-';
    if (typeof val === 'string') return val;
    return JSON.stringify(val, null, 2);
  };

  return (
    <Grid
      container
      spacing={3}
    >
      <Grid size={{ xs: 6 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
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
                  {row.id as string}
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
                  {formatAction(row.action as string)}
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
                  {(row.entity_type as string) || (row.resource as string) || '-'}
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
                  {(row.entity_id as string) || '-'}
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
                {getStatusChip(row.status as string)}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      <Grid size={{ xs: 6 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
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
                  {(row.user_id as string) || '-'}
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
                  {(row.user_name as string) || (row.username as string) || '-'}
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
                  {(row.ip_address as string) || '-'}
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
                  {formatDate(row.created_at)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
      {row.error_message ? (
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
              {row.error_message as string}
            </Typography>
          </Paper>
        </Grid>
      ) : null}
      {row.request_details ? (
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
                margin: 0,
              }}
            >
              {renderJson(row.request_details)}
            </pre>
          </Paper>
        </Grid>
      ) : null}
      {row.response_details ? (
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
                margin: 0,
              }}
            >
              {renderJson(row.response_details)}
            </pre>
          </Paper>
        </Grid>
      ) : null}
    </Grid>
  );
};

const AuditLogPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [source, setSource] = useState<AuditLogSource>('core');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [currentSearch, setCurrentSearch] = useState('');

  const handleClearDateFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
  }, []);

  const dateRangeError = useMemo(() => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return '开始时间不能晚于结束时间';
    }
    return '';
  }, [startDate, endDate]);

  const switchSource = useCallback((newSource: AuditLogSource) => {
    setSource(newSource);
    setEntityTypeFilter('all');
    setStartDate('');
    setEndDate('');
  }, []);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params?: Record<string, unknown>) => {
        const queryParams: Record<string, unknown> = {
          page: params?.page ?? 1,
          pagesize: Math.min(200, Math.max(1, (params?.pageSize as number) ?? 20)),
        };

        if (params?.status && params.status !== 'all') {
          queryParams.status = params.status;
        }
        if (params?.action && params.action !== 'all') {
          queryParams.action = params.action;
        }
        if (params?.entity_type && params.entity_type !== 'all') {
          queryParams.entity_type = params.entity_type;
        }
        if (params?.start_date) {
          queryParams.start_date = formatDateTimeForApi(params.start_date as string);
        }
        if (params?.end_date) {
          queryParams.end_date = formatDateTimeForApi(params.end_date as string);
        }
        if (params?.search) {
          queryParams.search = params.search;
        }

        apiLogger.debug('加载审计日志参数:', { source, queryParams });

        if (source === 'core') {
          queryParams.source = 'audit_logs';
          try {
            const response = await apiClient.core.get<{
              items: Record<string, unknown>[];
              total: number;
            }>('/iam/v1/audit/logs', { params: queryParams });
            if (response.success && response.data) {
              const items = (response.data.items || []).map((item) => ({
                ...item,
                source: 'core',
              }));
              return { data: items, total: response.data.total || 0 };
            }
            return { data: [], total: 0 };
          } catch (error) {
            apiLogger.error('加载核心审计日志失败:', error);
            throw new Error(extractErrorMessage(error, '加载审计日志失败'));
          }
        }

        const api = source === 'lims' ? auditLimsApi : auditRdApi;
        try {
          const response = await api.listAuditLogs(queryParams);
          apiLogger.debug('审计日志响应:', response);
          if (response.success && response.data) {
            const items = (response.data.audit_logs || []).map((item) => ({
              ...item,
              source,
            }));
            return { data: items, total: response.data.total || 0 };
          }
          if (response.message) {
            addNotification({
              title: '提示',
              message: response.message,
              type: 'info',
            });
          }
          return { data: [], total: 0 };
        } catch (error) {
          apiLogger.error(`加载${source}审计日志失败:`, error);
          throw new Error(extractErrorMessage(error, '加载审计日志失败'));
        }
      },
      create: async () => {
        throw new Error('审计日志为只读数据，不支持创建');
      },
      update: async () => {
        throw new Error('审计日志为只读数据，不支持更新');
      },
      delete: async () => {
        throw new Error('审计日志为只读数据，不支持删除');
      },
    }),
    [source, addNotification]
  );

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params: Record<string, unknown> = {};
      if (startDate) params.start_date = formatDateTimeForApi(startDate);
      if (endDate) params.end_date = formatDateTimeForApi(endDate);
      if (entityTypeFilter !== 'all') params.entity_type = entityTypeFilter;
      if (currentSearch) params.search = currentSearch;

      if (source === 'core') {
        params.format = 'csv';
        params.source = 'audit_logs';
        const response = await apiClient.core.get<unknown>('/iam/v1/audit/logs/export', {
          params,
          responseType: 'blob' as never,
        });
        return response;
      }
      const api = source === 'lims' ? auditLimsApi : auditRdApi;
      return api.exportAuditLogs(params);
    },
    onSuccess: (blob: unknown) => {
      apiLogger.debug('导出审计日志成功，blob size:', (blob as Blob)?.size);
      const url = window.URL.createObjectURL(blob as Blob);
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

  const handleExport = useCallback(() => {
    exportMutation.mutate();
  }, [exportMutation]);

  const customColumns: ColumnDef[] = useMemo(
    () => [
      {
        id: 'created_at',
        label: '时间',
        width: 180,
        sortable: true,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {new Date((row.created_at as string) || '').toLocaleString('zh-CN')}
          </Typography>
        ),
      },
      {
        id: 'user',
        label: '用户',
        width: 160,
        render: (row) => {
          const name = (row.user_name || row.username || row.user_id || '-') as string;
          return (
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
                {name}
              </Typography>
            </Box>
          );
        },
      },
      {
        id: 'action',
        label: '操作',
        width: 110,
        render: (row) => (
          <Typography variant='body2'>{formatAction(row.action as string)}</Typography>
        ),
      },
      {
        id: 'entity_type',
        label: '实体类型',
        width: 120,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {(row.entity_type as string) || (row.resource as string) || '-'}
          </Typography>
        ),
      },
      {
        id: 'ip_address',
        label: 'IP地址',
        width: 130,
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {(row.ip_address as string) || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => {
          const status =
            (row.status as string) ||
            (row.success === true ? 'success' : row.success === false ? 'error' : '');
          return getStatusChip(status);
        },
      },
      {
        id: '_detail_summary',
        label: '详情',
        width: 200,
        render: (row) => (
          <Box sx={{ maxWidth: 200 }}>
            {(row.error_message as string) && (
              <Typography
                variant='body2'
                sx={{ fontSize: '0.75rem', color: 'error.main' }}
              >
                {row.error_message as string}
              </Typography>
            )}
            {!row.error_message && (row.request_details as string) && (
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
                  ? (row.request_details as string)
                  : JSON.stringify(row.request_details)}
              </Typography>
            )}
            {!row.error_message && !row.request_details && '-'}
          </Box>
        ),
      },
    ],
    []
  );

  const headerContent = useCallback(
    (rows: Record<string, unknown>[], _total: number, search: string) => {
      // 同步 CrudPage 内部搜索状态，供导出使用
      if (search !== currentSearch) setCurrentSearch(search);
      const uniqueEntityTypes = Array.from(
        new Set(
          rows
            .map((r) => (r.entity_type || r.resource) as string)
            .filter((v): v is string => Boolean(v))
        )
      ).sort();

      return (
        <Box sx={{ mb: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
                  variant={source === 'core' ? 'contained' : 'text'}
                  onClick={() => switchSource('core')}
                  startIcon={<Database size={16} />}
                >
                  统一审计
                </Button>
                <Button
                  size='small'
                  variant={source === 'lims' ? 'contained' : 'text'}
                  onClick={() => switchSource('lims')}
                  startIcon={<FileText size={16} />}
                >
                  LIMS
                </Button>
                <Button
                  size='small'
                  variant={source === 'rd' ? 'contained' : 'text'}
                  onClick={() => switchSource('rd')}
                  startIcon={<FlaskConical size={16} />}
                >
                  RD
                </Button>
              </Box>

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
                onChange={(e) => setStartDate(e.target.value)}
                sx={{ width: 220 }}
                slotProps={{ inputLabel: { shrink: true } } as const}
                size='small'
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
                onChange={(e) => setEndDate(e.target.value)}
                sx={{ width: 220 }}
                slotProps={{ inputLabel: { shrink: true } } as const}
                size='small'
              />
              {(startDate || endDate) && (
                <Button
                  variant='text'
                  color='error'
                  onClick={handleClearDateFilters}
                  startIcon={<X size={14} />}
                  size='small'
                >
                  清除
                </Button>
              )}
              {dateRangeError && (
                <Typography
                  variant='caption'
                  color='error'
                >
                  {dateRangeError}
                </Typography>
              )}

              <FormControl
                size='small'
                sx={{ minWidth: 140 }}
              >
                <InputLabel>实体类型</InputLabel>
                <Select
                  value={entityTypeFilter}
                  label='实体类型'
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                >
                  <MenuItem value='all'>全部实体</MenuItem>
                  {uniqueEntityTypes.map((type) => (
                    <MenuItem
                      key={type}
                      value={type}
                    >
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flexGrow: 1 }} />

              <Button
                variant='contained'
                startIcon={<Download size={16} />}
                onClick={handleExport}
                disabled={exportMutation.isPending}
                size='small'
              >
                {exportMutation.isPending ? '导出中...' : '导出'}
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    },
    [
      source,
      startDate,
      endDate,
      entityTypeFilter,
      currentSearch,
      dateRangeError,
      handleClearDateFilters,
      switchSource,
      handleExport,
      exportMutation.isPending,
    ]
  );

  const extraQueryParams = useMemo(
    () => ({
      source,
      start_date: startDate,
      end_date: endDate,
      entity_type: entityTypeFilter,
    }),
    [source, startDate, endDate, entityTypeFilter]
  );

  return (
    <CrudPage
      key={source}
      schema={auditLogSchema}
      apiAdapter={apiAdapter}
      customColumns={customColumns}
      extraQueryParams={extraQueryParams}
      detailContent={(row) => <DetailContent row={row} />}
      detailMaxWidth='lg'
      headerContent={headerContent}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: '系统管理' },
        { label: '审计日志' },
      ]}
    />
  );
};

export default AuditLogPage;
