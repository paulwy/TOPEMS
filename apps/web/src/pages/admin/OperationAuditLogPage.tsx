import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Search,
  RefreshCw,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  X,
  Server,
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
import { operationAuditApi, type OperationLog } from '@/api/admin/operationAudit';
import { extractErrorMessage } from '@/utils/errors';

const MODULE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'iam', label: '身份权限' },
  { value: 'tenant', label: '租户' },
  { value: 'workflow', label: '工作流' },
  { value: 'file', label: '文件' },
  { value: 'master', label: '主数据' },
  { value: 'erp', label: 'ERP' },
  { value: 'crm', label: 'CRM' },
  { value: 'pm', label: '项目管理' },
  { value: 'hrm', label: '人力资源' },
  { value: 'mes', label: '制造执行' },
  { value: 'wms', label: '仓储' },
  { value: 'pdm', label: '产品数据' },
  { value: 'qms', label: '质量管理' },
  { value: 'lims', label: '实验室' },
  { value: 'ehs', label: '环安卫' },
  { value: 'srm', label: '供应商' },
  { value: 'finance', label: '财务' },
  { value: 'ai', label: 'AI 智能' },
  { value: 'core', label: '核心服务' },
  { value: 'unknown', label: '未识别' },
];

const OPERATION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'create', label: '创建' },
  { value: 'update', label: '更新' },
  { value: 'patch', label: '局部更新' },
  { value: 'delete', label: '删除' },
  { value: 'unknown', label: '未识别' },
];

const formatDateTimeForApi = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  try {
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch {
    return dateTimeString;
  }
};

const OperationAuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [traceIdFilter, setTraceIdFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<'' | 'true' | 'false'>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<OperationLog | null>(null);

  const queryKey = useMemo(
    () => [
      'admin',
      'operation-audit-logs',
      page + 1,
      rowsPerPage,
      userFilter,
      moduleFilter,
      operationFilter,
      resourceTypeFilter,
      traceIdFilter,
      successFilter,
      startDate,
      endDate,
    ],
    [
      page,
      rowsPerPage,
      userFilter,
      moduleFilter,
      operationFilter,
      resourceTypeFilter,
      traceIdFilter,
      successFilter,
      startDate,
      endDate,
    ]
  );

  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
        user_name: userFilter || undefined,
        module: moduleFilter || undefined,
        operation: operationFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
        trace_id: traceIdFilter || undefined,
        success: successFilter === '' ? undefined : successFilter === 'true',
        start_time: startDate ? formatDateTimeForApi(startDate) : undefined,
        end_time: endDate ? formatDateTimeForApi(endDate) : undefined,
      };
      apiLogger.debug('加载操作审计日志参数', params);
      const response = await operationAuditApi.list(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || '加载操作审计日志失败');
    },
    staleTime: 30 * 1000,
  });

  const logs = logsData?.items || [];
  const totalCount = logsData?.total || 0;

  if (error) {
    apiLogger.error('加载操作审计日志失败', error);
    addNotification({
      title: '加载失败',
      message: extractErrorMessage(error, '加载操作审计日志失败'),
      type: 'error',
    });
  }

  const getModuleLabel = (code: string): string => {
    return MODULE_OPTIONS.find((m) => m.value === code)?.label || code || '-';
  };

  const getOperationLabel = (code: string): string => {
    return OPERATION_OPTIONS.find((m) => m.value === code)?.label || code || '-';
  };

  const getResponseStatusBadge = (status?: number) => {
    if (status === undefined || status === null) {
      return (
        <Chip
          size='small'
          label='未记录'
          variant='outlined'
        />
      );
    }
    if (status >= 200 && status < 300) {
      return (
        <Chip
          size='small'
          color='success'
          label={String(status)}
          icon={<CheckCircle size={14} />}
        />
      );
    }
    if (status >= 400 && status < 500) {
      return (
        <Chip
          size='small'
          color='warning'
          label={String(status)}
          icon={<XCircle size={14} />}
        />
      );
    }
    if (status >= 500) {
      return (
        <Chip
          size='small'
          color='error'
          label={String(status)}
          icon={<XCircle size={14} />}
        />
      );
    }
    return (
      <Chip
        size='small'
        label={String(status)}
      />
    );
  };

  const handleViewDetail = (log: OperationLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    setUserFilter('');
    setModuleFilter('');
    setOperationFilter('');
    setResourceTypeFilter('');
    setTraceIdFilter('');
    setSuccessFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  const stats = useMemo(
    () => ({
      total: totalCount,
      success: logs.filter((l) => l.response_status !== undefined && l.response_status < 400)
        .length,
      failed: logs.filter((l) => l.response_status !== undefined && l.response_status >= 400)
        .length,
      showing: logs.length,
    }),
    [logs, totalCount]
  );

  return (
    <PageContainer
      title='操作审计日志'
      subtitle='记录所有业务写操作（POST/PUT/PATCH/DELETE），区别于登录日志与系统审计日志'
      maxWidth='xl'
      headerProps={{
        actions: [
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
            label: '总记录数',
            value: stats.total,
            icon: <FileText size={20} />,
            color: 'primary',
            bg: 'primary.100',
          },
          {
            label: '成功（当前页）',
            value: stats.success,
            icon: <CheckCircle size={20} />,
            color: 'success',
            bg: 'success.100',
          },
          {
            label: '失败（当前页）',
            value: stats.failed,
            icon: <XCircle size={20} />,
            color: 'error',
            bg: 'error.100',
          },
          {
            label: '当前页展示',
            value: stats.showing,
            icon: <Server size={20} />,
            color: 'info',
            bg: 'info.100',
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
            placeholder='按用户名筛选'
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
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
            sx={{ minWidth: 180 }}
          />

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
              {MODULE_OPTIONS.map((m) => (
                <MenuItem
                  key={m.value}
                  value={m.value}
                >
                  {m.label}
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
              value={operationFilter}
              label='操作类型'
              onChange={(e) => {
                setOperationFilter(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value=''>全部操作</MenuItem>
              {OPERATION_OPTIONS.map((m) => (
                <MenuItem
                  key={m.value}
                  value={m.value}
                >
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size='small'
            placeholder='资源类型'
            value={resourceTypeFilter}
            onChange={(e) => {
              setResourceTypeFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 160 }}
          />

          <TextField
            size='small'
            placeholder='按 Trace ID 筛选'
            value={traceIdFilter}
            onChange={(e) => {
              setTraceIdFilter(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 220 }}
          />

          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>状态</InputLabel>
            <Select
              value={successFilter}
              label='状态'
              onChange={(e) => {
                setSuccessFilter(e.target.value as '' | 'true' | 'false');
                setPage(0);
              }}
            >
              <MenuItem value=''>全部状态</MenuItem>
              <MenuItem value='true'>成功</MenuItem>
              <MenuItem value='false'>失败</MenuItem>
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
              时间范围
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
            moduleFilter ||
            operationFilter ||
            resourceTypeFilter ||
            traceIdFilter ||
            successFilter) && (
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
                    <TableCell sx={{ fontWeight: 'bold', width: 80 }}>详情</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>时间</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>用户</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>模块</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>资源类型</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>资源 ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>响应状态</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Trace ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        sx={{ py: 8, textAlign: 'center' }}
                      >
                        <FileText
                          sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }}
                        />
                        <Typography
                          variant='body1'
                          sx={{ color: 'text.secondary' }}
                        >
                          暂无操作审计日志
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
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
                            label={getModuleLabel(log.module)}
                            size='small'
                            color='primary'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getOperationLabel(log.operation)}
                            size='small'
                            color='secondary'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {log.resource_type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.resource_id || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>{getResponseStatusBadge(log.response_status)}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.trace_id || '-'}
                          </Typography>
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
            <Typography variant='h6'>操作审计日志详情</Typography>
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
                    基础信息
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
                          日志 ID
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
                          模块
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {getModuleLabel(currentLog.module)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          操作
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {getOperationLabel(currentLog.operation)}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          资源类型
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                        >
                          {currentLog.resource_type || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          资源 ID
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                        >
                          {currentLog.resource_id || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          响应状态
                        </Typography>
                        {getResponseStatusBadge(currentLog.response_status)}
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          创建时间
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {new Date(currentLog.created_at).toLocaleString('zh-CN')}
                        </Typography>
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
                    用户与请求信息
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
                          用户 ID
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, fontFamily: 'monospace' }}
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
                          用户名
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
                          IP 地址
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, fontFamily: 'monospace' }}
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
                          User Agent
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 500,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {currentLog.user_agent || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          Trace ID
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, fontFamily: 'monospace' }}
                        >
                          {currentLog.trace_id || '-'}
                        </Typography>
                      </Box>
                    </Grid>
                    {currentLog.description && (
                      <Grid size={{ xs: 12 }}>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          gutterBottom
                        >
                          描述
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {currentLog.description}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
              {currentLog.request_data && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography
                      variant='subtitle2'
                      color='text.secondary'
                      gutterBottom
                    >
                      请求数据快照
                    </Typography>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        fontSize: '0.875rem',
                        color: 'grey.700',
                        margin: 0,
                        maxHeight: 320,
                        overflow: 'auto',
                      }}
                    >
                      {typeof currentLog.request_data === 'string'
                        ? currentLog.request_data
                        : JSON.stringify(currentLog.request_data, null, 2)}
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

export default OperationAuditLogPage;
