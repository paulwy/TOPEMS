import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  Download,
  RefreshCw,
  User,
  Monitor,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Eye,
} from 'lucide-react';
import { PageContainer, StatusBadge } from '@/components/common';
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
} from '@mui/material';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { ERP_PATHS } from '@/modules/erp/config';
import { auditApi, type AuditLog } from '@/api/erp/audit';
import { extractErrorMessage } from '@/utils/errors';

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  const logsQuery = useQuery<{ items: AuditLog[]; total: number }>({
    queryKey: [
      'erp-audit-logs',
      page,
      rowsPerPage,
      typeFilter,
      moduleFilter,
      operatorFilter,
      statusFilter,
      dateRange,
    ],
    queryFn: async () => {
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
        action: typeFilter || undefined,
        entity_type: moduleFilter || undefined,
        user_id: operatorFilter || undefined,
        status: statusFilter || undefined,
        start_date: dateRange.start || undefined,
        end_date: dateRange.end || undefined,
      };
      const res = await auditApi.list(params);
      if (res.success && res.data) {
        return { items: res.data.audit_logs || [], total: res.data.total || 0 };
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
      addNotification({
        title: '错误',
        message: extractErrorMessage(logsQuery.error, '加载审计日志失败'),
        type: 'error',
      });
    }
  }, [logsQuery.isError, logsQuery.error, addNotification]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false ||
        log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false ||
        log.entity_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        false ||
        log.ip_address?.includes(searchQuery) ||
        false;
      const matchesOperator = !operatorFilter || log.user_name === operatorFilter;
      const matchesModule = !moduleFilter || log.entity_type === moduleFilter;
      const matchesType = !typeFilter || log.action === typeFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      return matchesSearch && matchesOperator && matchesModule && matchesType && matchesStatus;
    });
  }, [logs, searchQuery, operatorFilter, moduleFilter, typeFilter, statusFilter]);

  const operators = useMemo(() => {
    const unique = new Set(logs.map((l) => l.user_name).filter(Boolean));
    return Array.from(unique);
  }, [logs]);

  const modules = useMemo(() => {
    const unique = new Set(logs.map((l) => l.entity_type));
    return Array.from(unique);
  }, [logs]);

  const operationTypes = useMemo(() => {
    const unique = new Set(logs.map((l) => l.action));
    return Array.from(unique);
  }, [logs]);

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { color: 'success' | 'error' | 'warning' | 'default'; label: string; icon: React.ReactNode }
    > = {
      success: { color: 'success', label: '成功', icon: <CheckCircle size={14} /> },
      failed: { color: 'error', label: '失败', icon: <XCircle size={14} /> },
      warning: { color: 'warning', label: '警告', icon: <AlertCircle size={14} /> },
    };
    const config = badges[status] || { color: 'default', label: status, icon: <Info size={14} /> };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        icon={config.icon}
      />
    );
  };

  const getTypeChip = (type: string) => {
    const colorMap: Record<string, 'primary' | 'warning' | 'error' | 'info' | 'success' | 'secondary' | 'default'> = {
      创建: 'primary',
      修改: 'warning',
      删除: 'error',
      查询: 'info',
      登录: 'success',
      审核: 'secondary',
      导出: 'default',
      备份: 'warning',
    };
    return (
      <Chip
        label={type}
        size='small'
        color={colorMap[type] || 'default'}
        variant='outlined'
      />
    );
  };

  const handleViewDetail = (log: AuditLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '审计日志已导出',
      type: 'success',
    });
  };

  const stats = useMemo(
    () => ({
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      warning: logs.filter((l) => l.status === 'warning').length,
    }),
    [logs]
  );

  return (
    <PageContainer
      title='审计日志'
      subtitle='操作日志列表、按用户/时间/模块筛选'
      maxWidth='xl'
      headerProps={{
        backButton: {
          onClick: () => navigate(ERP_PATHS.dashboard),
        },
        actions: [
          {
            label: '导出日志',
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: () => logsQuery.refetch(),
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

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            p: 2,
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
            placeholder='搜索操作人、内容或IP...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            sx={{ minWidth: 130 }}
          >
            <InputLabel>操作人</InputLabel>
            <Select
              value={operatorFilter}
              label='操作人'
              onChange={(e) => {
                setOperatorFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部</MenuItem>
              {operators.map((op) => (
                <MenuItem
                  key={op}
                  value={op}
                >
                  {op}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 140 }}
          >
            <InputLabel>模块</InputLabel>
            <Select
              value={moduleFilter}
              label='模块'
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部模块</MenuItem>
              {modules.map((m) => (
                <MenuItem
                  key={m}
                  value={m}
                >
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>操作类型</InputLabel>
            <Select
              value={typeFilter}
              label='操作类型'
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部类型</MenuItem>
              {operationTypes.map((t) => (
                <MenuItem
                  key={t}
                  value={t}
                >
                  {t}
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
              <MenuItem value='warning'>警告</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          <TextField
            size='small'
            label='开始日期'
            type='date'
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
          <TextField
            size='small'
            label='结束日期'
            type='date'
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } } as const}
          />
        </Box>

        {loading ? (
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
                    <TableCell sx={{ fontWeight: 'bold' }}>操作人</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>模块</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>操作类型</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>操作内容</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>IP地址</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>操作时间</TableCell>
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
                              aria-label='查看'
                            >
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Monitor
                              size={14}
                              style={{ opacity: 0.5 }}
                            />
                            {log.entity_type}
                          </Box>
                        </TableCell>
                        <TableCell>{getTypeChip(log.action)}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.action} {log.entity_type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {log.ip_address || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
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
                              {log.created_at.replace('T', ' ')}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component='div'
              count={total}
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
      </Box>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Eye size={20} />
            日志详情
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    操作人
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.user_name || '-'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    状态
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(currentLog.status)}</Box>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    操作模块
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.entity_type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    操作类型
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getTypeChip(currentLog.action)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  操作内容
                </Typography>
                <Typography>
                  {currentLog.action} {currentLog.entity_type}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    IP地址
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>
                    {currentLog.ip_address || '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    操作时间
                  </Typography>
                  <Typography>{currentLog.created_at.replace('T', ' ')}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  浏览器/系统
                </Typography>
                <Typography>{currentLog.user_agent || '-'}</Typography>
              </Box>
            </Box>
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
