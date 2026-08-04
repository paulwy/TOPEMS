import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  TablePagination,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Grid,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { systemAuditApi, type AuditLog } from '@/api/system';
import { extractErrorMessage } from '@/utils/errors';
import { QUERY_KEYS } from '@/lib/reactQuery';

const AuditLogPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      QUERY_KEYS.SYSTEM.AUDIT,
      page + 1,
      rowsPerPage,
      searchQuery,
      userFilter,
      actionFilter,
      entityTypeFilter,
      statusFilter,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = {
        page: page + 1,
        pagesize: rowsPerPage,
        search: searchQuery || undefined,
        user_name: userFilter || undefined,
        action: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        status: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      apiLogger.debug('加载审计日志参数:', params);
      const response = await systemAuditApi.list(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || '加载审计日志失败');
    },
    staleTime: 5 * 60 * 1000,
  });

  const logs = logsData?.items || [];
  const totalCount = logsData?.total || 0;

  if (error) {
    apiLogger.error('加载审计日志失败:', error);
    addNotification({
      title: '错误',
      message: extractErrorMessage(error, '加载审计日志失败'),
      type: 'error',
    });
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ip_address?.includes(searchQuery);
      const matchesUser = !userFilter || log.user_name === userFilter;
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesEntityType = !entityTypeFilter || log.entity_type === entityTypeFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      return matchesSearch && matchesUser && matchesAction && matchesEntityType && matchesStatus;
    });
  }, [logs, searchQuery, userFilter, actionFilter, entityTypeFilter, statusFilter]);

  const uniqueUsers = useMemo(() => {
    const unique = new Set(logs.map((l) => l.user_name).filter(Boolean));
    return Array.from(unique);
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const unique = new Set(logs.map((l) => l.action));
    return Array.from(unique);
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    const unique = new Set(logs.map((l) => l.entity_type));
    return Array.from(unique);
  }, [logs]);

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color: 'success' | 'error' | 'warning' | 'default';
        label: string;
        icon: React.ReactElement;
      }
    > = {
      success: { color: 'success', label: '成功', icon: <CheckCircle size={14} /> },
      failed: { color: 'error', label: '失败', icon: <XCircle size={14} /> },
      error: { color: 'error', label: '失败', icon: <XCircle size={14} /> },
      warning: { color: 'warning', label: '警告', icon: <AlertCircle size={14} /> },
      partial: { color: 'warning', label: '部分成功', icon: <AlertCircle size={14} /> },
    };
    const config = badges[status] || {
      color: 'default',
      label: status,
      icon: <FileText size={14} />,
    };
    return (
      <Chip
        size='small'
        color={config.color}
        label={config.label}
        icon={config.icon}
      />
    );
  };

  const formatAction = (action: string) => {
    const map: Record<string, string> = {
      create: '创建',
      update: '更新',
      delete: '删除',
      read: '读取',
      batch_create: '批量创建',
      batch_delete: '批量删除',
      export: '导出',
      import: '导入',
      login: '登录',
      logout: '登出',
      approve: '审核',
      reject: '驳回',
    };
    return map[action] || action;
  };

  const handleViewDetail = (log: AuditLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    try {
      const params = {
        search: searchQuery || undefined,
        user_name: userFilter || undefined,
        action: actionFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        status: statusFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      };
      const blob = await systemAuditApi.export(params);
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
    } catch (err: unknown) {
      apiLogger.error('导出审计日志失败:', err);
      addNotification({
        title: '导出失败',
        message: extractErrorMessage(err, '导出审计日志失败'),
        type: 'error',
      });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setUserFilter('');
    setActionFilter('');
    setEntityTypeFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const stats = useMemo(
    () => ({
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failed: logs.filter((l) => l.status === 'failed' || l.status === 'error').length,
      warning: logs.filter((l) => l.status === 'warning' || l.status === 'partial').length,
    }),
    [logs]
  );

  return (
    <PageContainer
      title='审计日志'
      subtitle='操作日志查询、按时间范围/操作类型/用户筛选'
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: '导出日志',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'contained',
          },
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: refetch,
            variant: 'outlined',
          },
        ],
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 2, md: 4 },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          {
            label: '总操作数',
            value: stats.total,
            icon: <FileText size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: '成功',
            value: stats.success,
            icon: <CheckCircle size={20} />,
            color: 'success',
            bg: 'success.100',
          },
          {
            label: '失败',
            value: stats.failed,
            icon: <XCircle size={20} />,
            color: 'error',
            bg: 'error.100',
          },
          {
            label: '警告',
            value: stats.warning,
            icon: <AlertCircle size={20} />,
            color: 'warning',
            bg: 'warning.100',
          },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: stat.bg,
                color: `${stat.color}.main`,
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Paper
        sx={{
          borderRadius: 3,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TextField
            size='small'
            placeholder='搜索用户名、操作、实体类型、IP...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <Search
                      size={16}
                      style={{ opacity: 0.5 }}
                    />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ minWidth: 280 }}
          />

          <FormControl
            size='small'
            sx={{ minWidth: 140 }}
          >
            <InputLabel>用户</InputLabel>
            <Select
              value={userFilter}
              label='用户'
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部用户</MenuItem>
              {uniqueUsers.map((user) => (
                <MenuItem
                  key={user}
                  value={user}
                >
                  {user}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size='small'
            sx={{ minWidth: 140 }}
          >
            <InputLabel>操作类型</InputLabel>
            <Select
              value={actionFilter}
              label='操作类型'
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部类型</MenuItem>
              {uniqueActions.map((action) => (
                <MenuItem
                  key={action}
                  value={action}
                >
                  {formatAction(action)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            size='small'
            sx={{ minWidth: 140 }}
          >
            <InputLabel>实体类型</InputLabel>
            <Select
              value={entityTypeFilter}
              label='实体类型'
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部实体</MenuItem>
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

          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label='状态'
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部状态</MenuItem>
              <MenuItem value='success'>成功</MenuItem>
              <MenuItem value='failed'>失败</MenuItem>
              <MenuItem value='error'>错误</MenuItem>
              <MenuItem value='warning'>警告</MenuItem>
              <MenuItem value='partial'>部分成功</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar
              size={18}
              style={{ opacity: 0.5 }}
            />
            <Typography
              variant='body2'
              color='text.secondary'
            >
              时间范围:
            </Typography>
          </Box>

          <TextField
            size='small'
            label='开始时间'
            type='datetime-local'
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            sx={{ width: 200 }}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
          <Typography
            variant='body2'
            color='text.secondary'
          >
            至
          </Typography>
          <TextField
            size='small'
            label='结束时间'
            type='datetime-local'
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            sx={{ width: 200 }}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />

          {(startDate ||
            endDate ||
            userFilter ||
            actionFilter ||
            entityTypeFilter ||
            statusFilter) && (
            <Button
              variant='text'
              color='error'
              onClick={clearFilters}
              startIcon={<X size={14} />}
            >
              清除筛选
            </Button>
          )}
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: 80 }}>操作</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>时间</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>用户</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>操作类型</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>实体类型</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>IP地址</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>详情</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{ py: 8, textAlign: 'center' }}
                      >
                        <FileText
                          sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }}
                        />
                        <Typography
                          variant='body1'
                          sx={{ color: 'text.secondary' }}
                        >
                          暂无审计日志
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow
                        key={log.id}
                        hover
                      >
                        <TableCell>
                          <Tooltip title='查看详情'>
                            <IconButton
                              size='small'
                              onClick={() => handleViewDetail(log)}
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Clock
                              size={14}
                              style={{ opacity: 0.5 }}
                            />
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary' }}
                            >
                              {new Date(log.created_at).toLocaleString('zh-CN')}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                bgcolor: 'primary.100',
                                color: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <User size={14} />
                            </Box>
                            <Typography sx={{ fontWeight: 500 }}>{log.user_name || '-'}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={formatAction(log.action)}
                            size='small'
                            color='primary'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {log.ip_address || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.error_message ? (
                            <Typography
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'error.main',
                                fontSize: '0.875rem',
                              }}
                            >
                              {log.error_message}
                            </Typography>
                          ) : log.request_details ? (
                            <Typography
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '0.875rem',
                              }}
                            >
                              {typeof log.request_details === 'string'
                                ? log.request_details
                                : JSON.stringify(log.request_details)}
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={totalCount}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage='每页行数'
            />
          </>
        )}
      </Paper>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FileText size={24} />
            <Typography variant='h6'>审计日志详情</Typography>
          </Box>
          <IconButton onClick={() => setShowDetailModal(false)}>
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {currentLog && (
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
                          {currentLog.id}
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
                          {formatAction(currentLog.action)}
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
                          {currentLog.entity_type}
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
                          {currentLog.entity_id || '-'}
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
                        {getStatusBadge(currentLog.status)}
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
                          {currentLog.user_id || '-'}
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
                          {currentLog.user_name || '-'}
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
                          {currentLog.ip_address || '-'}
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
                          {new Date(currentLog.created_at).toLocaleString('zh-CN')}
                        </Typography>
                      </Box>
                    </Grid>
                    {currentLog.duration_ms !== undefined && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            耗时:
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {currentLog.duration_ms}ms
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
              {currentLog.error_message && (
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
                      {currentLog.error_message}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {currentLog.request_details && (
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
                        color: 'grey.700',
                      }}
                    >
                      {typeof currentLog.request_details === 'string'
                        ? currentLog.request_details
                        : JSON.stringify(currentLog.request_details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
              {currentLog.response_details && (
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
                        color: 'grey.700',
                      }}
                    >
                      {typeof currentLog.response_details === 'string'
                        ? currentLog.response_details
                        : JSON.stringify(currentLog.response_details, null, 2)}
                    </pre>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AuditLogPage;
