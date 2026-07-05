import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Monitor,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronLeft,
  Eye,
} from 'lucide-react';
import { PageContainer, StatusBadge, ActionButton } from '@/components/common';
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
  Alert,
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
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';

export interface AuditLog {
  id: string;
  operator_id: string;
  operator_name: string;
  operation_type: string;
  operation_module: string;
  operation_content: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed' | 'warning';
  created_at: string;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    operator_id: 'u001',
    operator_name: '张三',
    operation_type: '创建',
    operation_module: '凭证管理',
    operation_content: '创建凭证记-202406001',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0 / Windows 10',
    status: 'success',
    created_at: '2024-06-15T10:30:00',
  },
  {
    id: '2',
    operator_id: 'u002',
    operator_name: '李四',
    operation_type: '修改',
    operation_module: '用户管理',
    operation_content: '修改用户信息：王五',
    ip_address: '192.168.1.101',
    user_agent: 'Firefox 121.0 / macOS',
    status: 'success',
    created_at: '2024-06-15T09:45:00',
  },
  {
    id: '3',
    operator_id: 'u001',
    operator_name: '张三',
    operation_type: '删除',
    operation_module: '凭证管理',
    operation_content: '删除凭证记-202405099',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0 / Windows 10',
    status: 'failed',
    created_at: '2024-06-14T16:20:00',
  },
  {
    id: '4',
    operator_id: 'u003',
    operator_name: '王五',
    operation_type: '登录',
    operation_module: '系统登录',
    operation_content: '用户登录系统',
    ip_address: '10.0.0.50',
    user_agent: 'Safari 17.0 / iOS 17',
    status: 'success',
    created_at: '2024-06-14T08:00:00',
  },
  {
    id: '5',
    operator_id: 'u002',
    operator_name: '李四',
    operation_type: '审核',
    operation_module: '凭证管理',
    operation_content: '审核凭证记-202406005',
    ip_address: '192.168.1.101',
    user_agent: 'Firefox 121.0 / macOS',
    status: 'success',
    created_at: '2024-06-13T14:30:00',
  },
  {
    id: '6',
    operator_id: 'u001',
    operator_name: '张三',
    operation_type: '导出',
    operation_module: '报表中心',
    operation_content: '导出资产负债表 2024年5月',
    ip_address: '192.168.1.100',
    user_agent: 'Chrome 120.0 / Windows 10',
    status: 'success',
    created_at: '2024-06-12T11:15:00',
  },
  {
    id: '7',
    operator_id: 'u004',
    operator_name: '赵六',
    operation_type: '备份',
    operation_module: '系统管理',
    operation_content: '创建数据库备份',
    ip_address: '192.168.1.1',
    user_agent: 'Chrome 120.0 / Windows Server',
    status: 'warning',
    created_at: '2024-06-11T02:00:00',
  },
  {
    id: '8',
    operator_id: 'u003',
    operator_name: '王五',
    operation_type: '修改',
    operation_module: '字典管理',
    operation_content: '修改字典项：凭证类型',
    ip_address: '10.0.0.50',
    user_agent: 'Safari 17.0 / iOS 17',
    status: 'success',
    created_at: '2024-06-10T15:45:00',
  },
];

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage, operatorFilter, moduleFilter, typeFilter, statusFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLogs(mockAuditLogs);
      setTotalCount(mockAuditLogs.length);
    } catch (err: unknown) {
      apiLogger.error('加载审计日志失败:', err);
      addNotification({
        title: '错误',
        message: '加载审计日志失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !searchQuery ||
        log.operator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.operation_content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ip_address.includes(searchQuery);
      const matchesOperator = !operatorFilter || log.operator_name === operatorFilter;
      const matchesModule = !moduleFilter || log.operation_module === moduleFilter;
      const matchesType = !typeFilter || log.operation_type === typeFilter;
      const matchesStatus = !statusFilter || log.status === statusFilter;
      return matchesSearch && matchesOperator && matchesModule && matchesType && matchesStatus;
    });
  }, [logs, searchQuery, operatorFilter, moduleFilter, typeFilter, statusFilter]);

  const operators = useMemo(() => {
    const unique = new Set(logs.map((l) => l.operator_name));
    return Array.from(unique);
  }, [logs]);

  const modules = useMemo(() => {
    const unique = new Set(logs.map((l) => l.operation_module));
    return Array.from(unique);
  }, [logs]);

  const operationTypes = useMemo(() => {
    const unique = new Set(logs.map((l) => l.operation_type));
    return Array.from(unique);
  }, [logs]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: 'success' | 'error' | 'warning' | 'default'; label: string; icon: React.ReactNode }> = {
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
    const colorMap: Record<string, any> = {
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
          onClick: () => navigate('/erp/dashboard'),
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
            onClick: loadLogs,
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
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size='small'
            label='结束日期'
            type='date'
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
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
                            <Typography sx={{ fontWeight: 500 }}>{log.operator_name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Monitor
                              size={14}
                              style={{ opacity: 0.5 }}
                            />
                            {log.operation_module}
                          </Box>
                        </TableCell>
                        <TableCell>{getTypeChip(log.operation_type)}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              maxWidth: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.operation_content}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {log.ip_address}
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
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.operator_name}</Typography>
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
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.operation_module}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    操作类型
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getTypeChip(currentLog.operation_type)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  操作内容
                </Typography>
                <Typography>{currentLog.operation_content}</Typography>
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
                  <Typography sx={{ fontFamily: 'monospace' }}>{currentLog.ip_address}</Typography>
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
                <Typography>{currentLog.user_agent}</Typography>
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
