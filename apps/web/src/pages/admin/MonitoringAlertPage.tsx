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
  Grid,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Settings,
  TrendingUp,
  Server,
  Cpu,
  HardDrive,
  Wifi,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { monitoringApi } from '@/api/admin/monitoring';
import type {
  Alert,
  AlertRule,
  SystemHealth,
  AlertStats,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@/api/admin/monitoring';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';

interface MonitoringAlertPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'alerts' | 'rules' | 'health';

const MonitoringAlertPage: React.FC<MonitoringAlertPageProps> = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  const PER_PAGE = 20;

  const alertsQuery = useQuery<{ items: Alert[]; total: number }>({
    queryKey: ['admin-monitoring-alerts', currentPage, searchQuery, filterLevel, filterStatus],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (searchQuery) params.query = searchQuery;
      if (filterLevel !== 'all') params.level = filterLevel;
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await monitoringApi.listAlerts(params as never);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'alerts',
    staleTime: 5 * 60 * 1000,
  });

  const rulesQuery = useQuery<{ items: AlertRule[]; total: number }>({
    queryKey: ['admin-monitoring-rules'],
    queryFn: async () => {
      const response = await monitoringApi.listAlertRules();
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'rules',
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery<SystemHealth | null>({
    queryKey: ['admin-monitoring-health'],
    queryFn: async () => {
      const response = await monitoringApi.getSystemHealth();
      return response.success && response.data ? response.data : null;
    },
    enabled: activeTab === 'health',
    staleTime: 5 * 60 * 1000,
  });

  const alertStatsQuery = useQuery<AlertStats | null>({
    queryKey: ['admin-monitoring-alert-stats'],
    queryFn: async () => {
      const response = await monitoringApi.getAlertStats();
      return response.success && response.data ? response.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loading =
    activeTab === 'alerts'
      ? alertsQuery.isLoading
      : activeTab === 'rules'
        ? rulesQuery.isLoading
        : healthQuery.isLoading;
  const alerts = alertsQuery.data?.items ?? [];
  const rules = rulesQuery.data?.items ?? [];
  const systemHealth = healthQuery.data ?? null;
  const alertStats = alertStatsQuery.data ?? null;
  const total =
    activeTab === 'alerts' ? (alertsQuery.data?.total ?? 0) : (rulesQuery.data?.total ?? 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterLevel, filterStatus]);

  useEffect(() => {
    if (alertsQuery.isError) {
      apiLogger.error('Failed to load alerts:', alertsQuery.error);
      addNotification({
        type: 'error',
        message: `加载告警列表失败: ${extractErrorMessage(alertsQuery.error)}`,
      });
    }
  }, [alertsQuery.isError, alertsQuery.error, addNotification]);

  useEffect(() => {
    if (rulesQuery.isError) {
      apiLogger.error('Failed to load rules:', rulesQuery.error);
      addNotification({
        type: 'error',
        message: `加载告警规则失败: ${extractErrorMessage(rulesQuery.error)}`,
      });
    }
  }, [rulesQuery.isError, rulesQuery.error, addNotification]);

  useEffect(() => {
    if (healthQuery.isError) {
      apiLogger.error('Failed to load system health:', healthQuery.error);
      addNotification({
        type: 'error',
        message: `加载系统健康状态失败: ${extractErrorMessage(healthQuery.error)}`,
      });
    }
  }, [healthQuery.isError, healthQuery.error, addNotification]);

  useEffect(() => {
    if (alertStatsQuery.isError) {
      apiLogger.error('Failed to load alert stats:', alertStatsQuery.error);
    }
  }, [alertStatsQuery.isError, alertStatsQuery.error]);

  const invalidateAlerts = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-monitoring-alerts'] });
  const invalidateRules = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-monitoring-rules'] });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      addNotification({ type: 'success', message: '告警已确认' });
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `确认告警失败: ${extractErrorMessage(err)}` });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.resolveAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      addNotification({ type: 'success', message: '告警已解决' });
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `解决告警失败: ${extractErrorMessage(err)}` });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.escalateAlert(alertId),
    onSuccess: () => {
      invalidateAlerts();
      addNotification({ type: 'success', message: '告警已升级' });
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `升级告警失败: ${extractErrorMessage(err)}` });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (params: { ruleId: string; enabled: boolean }) =>
      params.enabled
        ? monitoringApi.enableAlertRule(params.ruleId)
        : monitoringApi.disableAlertRule(params.ruleId),
    onSuccess: (_data, params) => {
      invalidateRules();
      addNotification({ type: 'success', message: params.enabled ? '规则已启用' : '规则已禁用' });
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `更新规则状态失败: ${extractErrorMessage(err)}` });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => monitoringApi.deleteAlertRule(ruleId),
    onSuccess: () => {
      invalidateRules();
      addNotification({ type: 'success', message: '规则已删除' });
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `删除规则失败: ${extractErrorMessage(err)}` });
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: (params: { id?: string; data: CreateAlertRuleRequest | UpdateAlertRuleRequest }) =>
      params.id
        ? monitoringApi.updateAlertRule(params.id, params.data as UpdateAlertRuleRequest)
        : monitoringApi.createAlertRule(params.data as CreateAlertRuleRequest),
    onSuccess: (_data, params) => {
      invalidateRules();
      addNotification({
        type: 'success',
        message: params.id ? '规则已更新' : '规则已创建',
      });
      setRuleDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({ type: 'error', message: `保存规则失败: ${extractErrorMessage(err)}` });
    },
  });

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  const handleResolve = (alertId: string) => {
    resolveMutation.mutate(alertId);
  };

  const handleEscalate = (alertId: string) => {
    escalateMutation.mutate(alertId);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    toggleRuleMutation.mutate({ ruleId, enabled });
  };

  const handleExport = () => {
    monitoringApi.exportAlerts({ format: 'excel' });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className='w-5 h-5 text-red-600' />;
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-yellow-600' />;
      case 'info':
        return <InfoIcon className='w-5 h-5 text-blue-600' />;
      default:
        return <Bell className='w-5 h-5 text-gray-600' />;
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      critical: '严重',
      warning: '警告',
      info: '信息',
      error: '错误',
    };
    return labels[level] || level;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待处理',
      acknowledged: '已确认',
      resolved: '已解决',
      escalated: '已升级',
      dismissed: '已忽略',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'acknowledged':
        return 'info';
      case 'resolved':
        return 'success';
      case 'escalated':
        return 'error';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  const getHealthStatus = (value: number, type: 'cpu' | 'memory' | 'disk' | 'network') => {
    if (type === 'network') {
      return value > 0 ? 'success' : 'error';
    }
    if (value >= 90) return 'error';
    if (value >= 70) return 'warning';
    return 'success';
  };

  const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <div className={className}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle
          cx='12'
          cy='12'
          r='10'
        ></circle>
        <line
          x1='12'
          y1='16'
          x2='12'
          y2='12'
        ></line>
        <line
          x1='12'
          y1='8'
          x2='12.01'
          y2='8'
        ></line>
      </svg>
    </div>
  );

  return (
    <PageContainer
      title='监控告警'
      subtitle='管理系统告警和监控规则'
      headerActions={
        activeTab === 'alerts'
          ? [
              <Button
                key='refresh'
                onClick={() => alertsQuery.refetch()}
                startIcon={<RefreshCw className='w-4 h-4' />}
                variant='outlined'
              >
                刷新
              </Button>,
              <Button
                key='export'
                onClick={handleExport}
                startIcon={<Download className='w-4 h-4' />}
                variant='contained'
              >
                导出
              </Button>,
            ]
          : activeTab === 'rules'
            ? [
                <Button
                  key='add'
                  onClick={() => {
                    setEditingRule(null);
                    setRuleDialogOpen(true);
                  }}
                  startIcon={<Settings className='w-4 h-4' />}
                  variant='contained'
                >
                  添加规则
                </Button>,
              ]
            : [
                <Button
                  key='refresh'
                  onClick={() => healthQuery.refetch()}
                  startIcon={<RefreshCw className='w-4 h-4' />}
                  variant='outlined'
                >
                  刷新状态
                </Button>,
              ]
      }
    >
      <Grid spacing={3}>
        {alertStats && activeTab === 'alerts' && (
          <>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlertCircle className='w-6 h-6 text-red-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        待处理告警
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='error'
                      >
                        {alertStats.pending_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AlertTriangle className='w-6 h-6 text-yellow-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        今日告警
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='warning'
                      >
                        {alertStats.today_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircle className='w-6 h-6 text-green-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        已解决
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                        color='success'
                      >
                        {alertStats.resolved_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Bell className='w-6 h-6 text-blue-600' />
                    <div>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        告警规则数
                      </Typography>
                      <Typography
                        variant='h4'
                        sx={{ fontWeight: 'bold' }}
                      >
                        {alertStats.rule_count}
                      </Typography>
                    </div>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Button
                  onClick={() => setActiveTab('alerts')}
                  variant={activeTab === 'alerts' ? 'contained' : 'outlined'}
                  startIcon={<AlertTriangle className='w-4 h-4' />}
                >
                  告警列表
                </Button>
                <Button
                  onClick={() => setActiveTab('rules')}
                  variant={activeTab === 'rules' ? 'contained' : 'outlined'}
                  startIcon={<Settings className='w-4 h-4' />}
                >
                  告警规则
                </Button>
                <Button
                  onClick={() => setActiveTab('health')}
                  variant={activeTab === 'health' ? 'contained' : 'outlined'}
                  startIcon={<Server className='w-4 h-4' />}
                >
                  系统健康
                </Button>
              </Box>

              {activeTab === 'alerts' && (
                <>
                  <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                    <TextField
                      fullWidth
                      label='搜索'
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder='搜索告警内容'
                      slotProps={{
                        input: {
                          startAdornment: <Search className='w-4 h-4 mr-2 text-gray-400' />,
                        },
                      }}
                    />
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>级别</InputLabel>
                      <Select
                        value={filterLevel}
                        onChange={(e) => setFilterLevel(e.target.value)}
                        label='级别'
                      >
                        <MenuItem value='all'>全部级别</MenuItem>
                        <MenuItem value='critical'>严重</MenuItem>
                        <MenuItem value='warning'>警告</MenuItem>
                        <MenuItem value='info'>信息</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>状态</InputLabel>
                      <Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        label='状态'
                      >
                        <MenuItem value='all'>全部状态</MenuItem>
                        <MenuItem value='pending'>待处理</MenuItem>
                        <MenuItem value='acknowledged'>已确认</MenuItem>
                        <MenuItem value='resolved'>已解决</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>级别</TableCell>
                          <TableCell>标题</TableCell>
                          <TableCell>内容</TableCell>
                          <TableCell>来源</TableCell>
                          <TableCell>时间</TableCell>
                          <TableCell>状态</TableCell>
                          <TableCell>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <Typography
                                  variant='body1'
                                  color='textSecondary'
                                >
                                  加载中...
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : alerts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7}>
                              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                                <Typography
                                  variant='body1'
                                  color='textSecondary'
                                >
                                  暂无告警记录
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : (
                          alerts.map((alert) => (
                            <TableRow key={alert.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {getLevelIcon(alert.level)}
                                  <Chip
                                    label={getLevelLabel(alert.level)}
                                    size='small'
                                    color={getLevelColor(alert.level)}
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontWeight: 'medium' }}>{alert.title}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  variant='body2'
                                  sx={{
                                    maxWidth: 300,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                  title={alert.message}
                                >
                                  {alert.message}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={alert.source}
                                  size='small'
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Clock className='w-4 h-4' />
                                  <Typography variant='body2'>
                                    {new Date(alert.created_at).toLocaleString('zh-CN')}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={getStatusLabel(alert.status)}
                                  size='small'
                                  color={getStatusColor(alert.status)}
                                />
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  {alert.status === 'pending' && (
                                    <Button
                                      size='small'
                                      onClick={() => handleAcknowledge(alert.id)}
                                      variant='outlined'
                                    >
                                      确认
                                    </Button>
                                  )}
                                  {alert.status === 'acknowledged' && (
                                    <Button
                                      size='small'
                                      onClick={() => handleResolve(alert.id)}
                                      variant='contained'
                                    >
                                      解决
                                    </Button>
                                  )}
                                  {alert.status !== 'escalated' && alert.status !== 'resolved' && (
                                    <Button
                                      size='small'
                                      onClick={() => handleEscalate(alert.id)}
                                      variant='outlined'
                                      color='error'
                                    >
                                      升级
                                    </Button>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination
                      count={Math.ceil(total / PER_PAGE)}
                      page={currentPage}
                      onChange={(_, page) => setCurrentPage(page)}
                      siblingCount={1}
                      boundaryCount={2}
                    />
                  </Box>
                </>
              )}

              {activeTab === 'rules' && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>名称</TableCell>
                        <TableCell>级别</TableCell>
                        <TableCell>触发条件</TableCell>
                        <TableCell>通知方式</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>创建时间</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                              <Typography
                                variant='body1'
                                color='textSecondary'
                              >
                                加载中...
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : rules.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                              <Typography
                                variant='body1'
                                color='textSecondary'
                              >
                                暂无告警规则
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell>
                              <Typography sx={{ fontWeight: 'medium' }}>{rule.name}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getLevelLabel(rule.level)}
                                size='small'
                                color={getLevelColor(rule.level)}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>{rule.condition}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {rule.notification_channels?.includes('email') && (
                                  <Chip
                                    label='邮件'
                                    size='small'
                                  />
                                )}
                                {rule.notification_channels?.includes('sms') && (
                                  <Chip
                                    label='短信'
                                    size='small'
                                  />
                                )}
                                {rule.notification_channels?.includes('internal') && (
                                  <Chip
                                    label='站内信'
                                    size='small'
                                  />
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Switch
                                  checked={rule.enabled}
                                  onChange={() => handleToggleRule(rule.id, !rule.enabled)}
                                  color={rule.enabled ? 'primary' : 'default'}
                                />
                                <Typography>{rule.enabled ? '启用' : '禁用'}</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant='body2'>
                                {new Date(rule.created_at).toLocaleString('zh-CN')}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  size='small'
                                  onClick={() => {
                                    setEditingRule(rule);
                                    setRuleDialogOpen(true);
                                  }}
                                  variant='outlined'
                                >
                                  编辑
                                </Button>
                                <Button
                                  size='small'
                                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                                  variant='outlined'
                                  color='error'
                                >
                                  删除
                                </Button>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {activeTab === 'health' && systemHealth && (
                <Grid spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Server className='w-5 h-5 text-blue-600' />
                          <Typography variant='h6'>服务状态</Typography>
                        </Box>
                        <Grid spacing={2}>
                          {systemHealth.services?.map((service) => (
                            <Grid
                              size={{ xs: 12 }}
                              key={service.name}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <Typography>{service.name}</Typography>
                                <Chip
                                  label={service.status === 'healthy' ? '健康' : '异常'}
                                  size='small'
                                  color={service.status === 'healthy' ? 'success' : 'error'}
                                />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <Cpu className='w-5 h-5 text-green-600' />
                          <Typography variant='h6'>系统资源</Typography>
                        </Box>
                        <Grid spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              CPU 使用率
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.cpu_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.cpu_usage ?? 0) >= 90
                                    ? '高'
                                    : (systemHealth.cpu_usage ?? 0) >= 70
                                      ? '中'
                                      : '低'
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.cpu_usage ?? 0, 'cpu')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              内存使用率
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.memory_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.memory_usage ?? 0) >= 90
                                    ? '高'
                                    : (systemHealth.memory_usage ?? 0) >= 70
                                      ? '中'
                                      : '低'
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.memory_usage ?? 0, 'memory')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              磁盘使用率
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.disk_usage ?? 0}%
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.disk_usage ?? 0) >= 90
                                    ? '高'
                                    : (systemHealth.disk_usage ?? 0) >= 70
                                      ? '中'
                                      : '低'
                                }
                                size='small'
                                color={getHealthStatus(systemHealth.disk_usage ?? 0, 'disk')}
                              />
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              网络延迟
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography
                                variant='h4'
                                sx={{ fontWeight: 'bold' }}
                              >
                                {systemHealth.network_latency ?? 0}ms
                              </Typography>
                              <Chip
                                label={
                                  (systemHealth.network_latency ?? 0) > 100
                                    ? '高'
                                    : (systemHealth.network_latency ?? 0) > 50
                                      ? '中'
                                      : '低'
                                }
                                size='small'
                                color={
                                  (systemHealth.network_latency ?? 0) > 100
                                    ? 'error'
                                    : (systemHealth.network_latency ?? 0) > 50
                                      ? 'warning'
                                      : 'success'
                                }
                              />
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                          <TrendingUp className='w-5 h-5 text-purple-600' />
                          <Typography variant='h6'>性能指标</Typography>
                        </Box>
                        <Grid spacing={2}>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              API 请求数
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.api_requests ?? 0}
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              平均响应时间
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.average_response_time ?? 0}ms
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              错误率
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                              color={(systemHealth.error_rate ?? 0) > 1 ? 'error' : 'success'}
                            >
                              {systemHealth.error_rate ?? 0}%
                            </Typography>
                          </Grid>
                          <Grid size={{ xs: 3 }}>
                            <Typography
                              variant='body2'
                              color='textSecondary'
                            >
                              在线用户数
                            </Typography>
                            <Typography
                              variant='h4'
                              sx={{ fontWeight: 'bold' }}
                            >
                              {systemHealth.online_users ?? 0}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        maxWidth='md'
      >
        <DialogTitle>{editingRule ? '编辑告警规则' : '添加告警规则'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              fullWidth
              label='规则名称'
              defaultValue={editingRule?.name}
              placeholder='输入规则名称'
            />
            <TextField
              fullWidth
              label='触发条件'
              defaultValue={editingRule?.condition}
              placeholder='例如: cpu_usage > 90'
            />
            <FormControl fullWidth>
              <InputLabel>告警级别</InputLabel>
              <Select
                defaultValue={editingRule?.level || 'warning'}
                label='告警级别'
              >
                <MenuItem value='info'>信息</MenuItem>
                <MenuItem value='warning'>警告</MenuItem>
                <MenuItem value='critical'>严重</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>通知方式</InputLabel>
              <Select
                defaultValue={editingRule?.notification_channels?.[0] || 'internal'}
                label='通知方式'
              >
                <MenuItem value='internal'>站内信</MenuItem>
                <MenuItem value='email'>邮件</MenuItem>
                <MenuItem value='sms'>短信</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>取消</Button>
          <Button
            onClick={() => {
              if (editingRule) {
                saveRuleMutation.mutate({ id: editingRule.id, data: {} });
              } else {
                saveRuleMutation.mutate({ data: {} as CreateAlertRuleRequest });
              }
            }}
            variant='contained'
          >
            {editingRule ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MonitoringAlertPage;
