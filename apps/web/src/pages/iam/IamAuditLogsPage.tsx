/**
 * IAM 审计日志页面 - V4.0 标准化改造
 *
 * 改造要点：
 * 1. 使用 ListPageTemplate 统一列表页布局
 * 2. PageContainer autoTitle + autoBreadcrumbs
 * 3. 支持搜索、筛选、分页
 * 4. 详情弹窗展示完整日志信息
 * 5. 支持导出功能
 *
 * @module pages/iam
 * @path /iam/audit-logs
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
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Eye,
  Download,
  User,
  Clock,
  Activity,
  X,
} from 'lucide-react';

import { authApi, type AccessLog } from '@/api/iam';
import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';

/**
 * 操作类型映射
 */
const ACTION_LABELS: Record<string, string> = {
  login: '登录',
  logout: '登出',
  create: '创建',
  update: '更新',
  delete: '删除',
  read: '查询',
  export: '导出',
  import: '导入',
  batch_create: '批量创建',
  batch_delete: '批量删除',
  password_reset: '重置密码',
  permission_change: '权限变更',
};

/**
 * 资源类型映射
 */
const RESOURCE_LABELS: Record<string, string> = {
  user: '用户',
  role: '角色',
  permission: '权限',
  department: '部门',
  account: '账号',
  dictionary: '字典',
  system: '系统',
};

export const IamAuditLogsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 分页状态
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  // 详情弹窗
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  /**
   * 加载审计日志
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };

      if (actionFilter !== 'all') {
        params.action = actionFilter;
      }
      if (statusFilter !== 'all') {
        params.success = statusFilter === 'success';
      }

      const res = await authApi.listAccessLogs(pageSize, (page - 1) * pageSize);
      if (res.success && res.data) {
        let filtered = res.data;

        // 状态过滤
        if (statusFilter !== 'all') {
          filtered = filtered.filter((log) =>
            statusFilter === 'success' ? log.success : !log.success
          );
        }

        // 操作过滤
        if (actionFilter !== 'all') {
          filtered = filtered.filter((log) => log.action === actionFilter);
        }

        setLogs(filtered);
        setTotal(filtered.length);
      } else {
        setLogs([]);
        setTotal(0);
      }
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '加载审计日志失败');
      setError(errorMsg);
      addNotification({
        title: '加载失败',
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification, page, actionFilter, statusFilter]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * 格式化操作名称
   */
  const formatAction = useCallback((action: string) => {
    return ACTION_LABELS[action] || action;
  }, []);

  /**
   * 格式化资源名称
   */
  const formatResource = useCallback((resource: string) => {
    return RESOURCE_LABELS[resource] || resource;
  }, []);

  /**
   * 获取状态徽章
   */
  const getStatusBadge = useCallback((success: boolean) => {
    return (
      <Chip
        size='small'
        color={success ? 'success' : 'error'}
        label={success ? '成功' : '失败'}
        variant='outlined'
      />
    );
  }, []);

  /**
   * 导出日志
   */
  const handleExport = useCallback(async () => {
    try {
      const exportData = logs.map((log) => ({
        时间: new Date(log.created_at).toLocaleString('zh-CN'),
        用户: log.username,
        操作: formatAction(log.action),
        资源: formatResource(log.resource),
        资源ID: log.resource_id || '-',
        IP地址: log.ip_address || '-',
        状态: log.success ? '成功' : '失败',
        错误信息: log.error_message || '-',
      }));

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addNotification({
        title: '成功',
        message: '审计日志导出成功',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(_err, '导出失败'),
        type: 'error',
      });
    }
  }, [logs, addNotification, formatAction, formatResource]);

  /**
   * 查看详情
   */
  const handleViewDetail = useCallback((log: AccessLog) => {
    setSelectedLog(log);
  }, []);

  /**
   * 过滤后的数据（搜索）
   */
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.username.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.resource.toLowerCase().includes(query) ||
        log.ip_address?.toLowerCase().includes(query) ||
        log.error_message?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  // 统计数据
  const stats = useMemo(() => {
    const successCount = logs.filter((l) => l.success).length;
    const failCount = logs.filter((l) => !l.success).length;
    return [
      { id: 'total', title: '日志总数', value: total, icon: <FileText size={20} />, color: 'primary' as const },
      { id: 'success', title: '成功', value: successCount, icon: <Activity size={20} />, color: 'success' as const },
      { id: 'failed', title: '失败', value: failCount, icon: <X size={20} />, color: 'error' as const },
    ];
  }, [logs, total]);

  // 表格列定义
  const columns: ColumnDef<AccessLog>[] = useMemo(
    () => [
      {
        id: 'created_at',
        label: '时间',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock size={14} color='text.disabled' />
            <Typography variant='body2' color='text.secondary'>
              {new Date(row.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'user',
        label: '用户',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={14} color='primary.main' />
            </Box>
            <Typography variant='body2' sx={{ fontWeight: 500 }}>
              {row.username}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'action',
        label: '操作',
        render: (row) => (
          <Chip
            size='small'
            label={formatAction(row.action)}
            variant='outlined'
          />
        ),
      },
      {
        id: 'resource',
        label: '资源',
        render: (row) => (
          <Typography variant='body2'>
            {formatResource(row.resource)}
            {row.resource_id && (
              <Typography component='span' variant='caption' color='text.secondary' sx={{ ml: 1 }}>
                ({row.resource_id})
              </Typography>
            )}
          </Typography>
        ),
      },
      {
        id: 'ip_address',
        label: 'IP地址',
        render: (row) => (
          <Typography variant='body2' color='text.secondary'>
            {row.ip_address || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.success),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
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
    [formatAction, formatResource, getStatusBadge, handleViewDetail]
  );

  // 筛选选项
  const filterOptions = useMemo(
    () => [
      {
        id: 'action',
        label: '操作类型',
        type: 'select' as const,
        options: [
          { label: '全部操作', value: 'all' },
          ...Object.entries(ACTION_LABELS).map(([value, label]) => ({
            label,
            value,
          })),
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '成功', value: 'success' },
          { label: '失败', value: 'failed' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.action === 'string') {
      setActionFilter(filters.action);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FileText size={20} />,
        backButton: {
          href: '/iam/dashboard',
        },
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredLogs}
        loading={loading}
        error={error}
        searchable
        searchPlaceholder='搜索用户名、操作、资源、IP地址...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterOptions}
        filtersValue={{
          action: actionFilter,
          status: statusFilter,
        }}
        onFilterChange={handleFilterChange}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: handlePageChange,
        }}
        actions={[
          {
            label: '导出',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无审计日志'
        stats={stats}
      />

      {/* 详情弹窗 */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Activity size={24} color='primary.main' />
            <Typography variant='h6'>审计日志详情</Typography>
          </Box>
          <IconButton onClick={() => setSelectedLog(null)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                      基本信息
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>日志ID</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>{selectedLog.id}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>操作时间</Typography>
                        <Typography variant='body2'>{new Date(selectedLog.created_at).toLocaleString('zh-CN')}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>操作类型</Typography>
                        <Chip size='small' label={formatAction(selectedLog.action)} variant='outlined' />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>操作状态</Typography>
                        {getStatusBadge(selectedLog.success)}
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                      用户信息
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>用户ID</Typography>
                        <Typography variant='body2'>{selectedLog.user_id}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>用户名</Typography>
                        <Typography variant='body2' sx={{ fontWeight: 500 }}>{selectedLog.username}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>IP地址</Typography>
                        <Typography variant='body2'>{selectedLog.ip_address || '-'}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                      资源信息
                    </Typography>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>资源类型</Typography>
                        <Typography variant='body2'>{formatResource(selectedLog.resource)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant='body2' color='text.secondary'>资源ID</Typography>
                        <Typography variant='body2'>{selectedLog.resource_id || '-'}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
                {selectedLog.error_message && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                      <Typography variant='subtitle2' color='error.main' gutterBottom>
                        错误信息
                      </Typography>
                      <Typography variant='body2' color='error.main'>
                        {selectedLog.error_message}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {selectedLog.user_agent && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant='subtitle2' color='text.secondary' gutterBottom>
                        User Agent
                      </Typography>
                      <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {selectedLog.user_agent}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedLog(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default IamAuditLogsPage;
