import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Typography,
  Alert,
  AlertTitle,
  LinearProgress,
  Switch,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ScanLine,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings as SettingsIcon,
  Activity,
} from 'lucide-react';
import { anomalyDetectionApi } from '../../api/mes/anomalyDetection';
import type { AnomalyAlert, AnomalyRule } from '../../api/mes/anomalyDetection';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { PageContainer } from '@/components/common';

const SEVERITY_CONFIG = {
  critical: { color: 'error' as const, icon: <AlertCircle size={16} />, label: '严重' },
  warning: { color: 'warning' as const, icon: <AlertTriangle size={16} />, label: '警告' },
  info: { color: 'info' as const, icon: <CheckCircle size={16} />, label: '提示' },
};

const ANOMALY_TYPE_LABELS: Record<string, string> = {
  equipment_overheat: '设备过热',
  equipment_vibration: '设备振动异常',
  equipment_noise: '设备噪音异常',
  equipment_oee_drop: 'OEE 偏低',
  equipment_maintenance_overdue: '维护逾期',
  quality_defect_rate: '缺陷率偏高',
  quality_batch_failure: '批次不合格',
  production_delay: '生产延期',
  production_output_drop: '产量下降',
  wip_backlog: '在制品积压',
};

const AnomalyDetectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [editingRule, setEditingRule] = useState<AnomalyRule | null>(null);
  const [editForm, setEditForm] = useState({
    warning_threshold: '',
    critical_threshold: '',
    enabled: true,
  });

  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Summary query
  const summaryQuery = useQuery({
    queryKey: ['anomaly-summary'],
    queryFn: () => anomalyDetectionApi.getSummary(),
    refetchInterval: 30000,
  });

  // Alerts query
  const alertsQuery = useQuery({
    queryKey: ['anomaly-alerts', severityFilter, typeFilter],
    queryFn: () =>
      anomalyDetectionApi.getAlerts({
        severity: severityFilter || undefined,
        anomaly_type: typeFilter || undefined,
      }),
    refetchInterval: 30000,
  });

  // Rules query
  const rulesQuery = useQuery({
    queryKey: ['anomaly-rules'],
    queryFn: () => anomalyDetectionApi.getRules(),
  });

  // Trend query
  const trendQuery = useQuery({
    queryKey: ['anomaly-trend'],
    queryFn: () => anomalyDetectionApi.getTrend(),
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: () => anomalyDetectionApi.triggerScan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-summary'] });
      queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
      addNotification({ title: '扫描完成', message: '异常扫描已触发', type: 'success' });
    },
    onError: () => {
      addNotification({ title: '错误', message: '扫描触发失败', type: 'error' });
    },
  });

  // Rule update mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, req }: { ruleId: string; req: Record<string, unknown> }) =>
      anomalyDetectionApi.updateRule(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anomaly-rules'] });
      addNotification({ title: '成功', message: '规则已更新', type: 'success' });
      setEditingRule(null);
    },
    onError: () => {
      addNotification({ title: '错误', message: '规则更新失败', type: 'error' });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['anomaly-summary'] });
    queryClient.invalidateQueries({ queryKey: ['anomaly-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['anomaly-trend'] });
    addNotification({ title: '成功', message: '数据已刷新', type: 'success' });
  };

  const handleScan = () => {
    scanMutation.mutate();
  };

  const handleEditRule = (rule: AnomalyRule) => {
    setEditingRule(rule);
    setEditForm({
      warning_threshold: rule.warning_threshold.toString(),
      critical_threshold: rule.critical_threshold.toString(),
      enabled: rule.enabled,
    });
  };

  const handleSaveRule = () => {
    if (!editingRule) return;
    const req: Record<string, unknown> = {
      warning_threshold: parseFloat(editForm.warning_threshold),
      critical_threshold: parseFloat(editForm.critical_threshold),
      enabled: editForm.enabled,
    };
    updateRuleMutation.mutate({ ruleId: editingRule.id, req });
  };

  const summary = summaryQuery.data?.data;
  const alerts = alertsQuery.data?.data || [];
  const rules = rulesQuery.data?.data || [];
  const trend = trendQuery.data?.data || [];

  const isLoading = summaryQuery.isPending || alertsQuery.isPending;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return (
          <TrendingUp
            size={14}
            color='#f44336'
          />
        );
      case 'falling':
        return (
          <TrendingDown
            size={14}
            color='#4caf50'
          />
        );
      default:
        return (
          <Minus
            size={14}
            color='#9e9e9e'
          />
        );
    }
  };

  const maxTrendCount = Math.max(...trend.map((t) => t.count), 1);

  return (
    <PageContainer title='异常检测'>
      <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant='h5'
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AlertTriangle size={24} />
          生产异常预警
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            刷新
          </Button>
          <Button
            variant='contained'
            startIcon={<ScanLine size={16} />}
            onClick={handleScan}
            disabled={scanMutation.isPending}
          >
            {scanMutation.isPending ? '扫描中...' : '手动扫描'}
          </Button>
        </Box>
      </Box>

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab label='预警总览' />
        <Tab label={`预警列表 (${alerts.length})`} />
        <Tab label='趋势分析' />
        <Tab label='预警规则' />
      </Tabs>

      {/* Tab 1: Summary */}
      {activeTab === 0 && (
        <Box>
          <Grid
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AlertCircle
                    color='#f44336'
                    size={20}
                  />
                  <Typography
                    color='textSecondary'
                    variant='body2'
                  >
                    严重预警
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  color='error'
                >
                  {summary?.critical_count ?? 0}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <AlertTriangle
                    color='#ff9800'
                    size={20}
                  />
                  <Typography
                    color='textSecondary'
                    variant='body2'
                  >
                    警告预警
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  color='warning.main'
                >
                  {summary?.warning_count ?? 0}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle
                    color='#2196f3'
                    size={20}
                  />
                  <Typography
                    color='textSecondary'
                    variant='body2'
                  >
                    提示信息
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  color='info.main'
                >
                  {summary?.info_count ?? 0}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Activity
                    color='#9c27b0'
                    size={20}
                  />
                  <Typography
                    color='textSecondary'
                    variant='body2'
                  >
                    预警总数
                  </Typography>
                </Box>
                <Typography variant='h4'>{summary?.total_alerts ?? 0}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <Card>
              <CardHeader title='按类型分布' />
              <CardContent>
                {summary && Object.entries(summary.byType).length > 0 ? (
                  Object.entries(summary.byType).map(([type, count]) => (
                    <Box
                      key={type}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant='body2'>{ANOMALY_TYPE_LABELS[type] || type}</Typography>
                      <Chip
                        label={count}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                    </Box>
                  ))
                ) : (
                  <Alert severity='success'>
                    <AlertTitle>暂无异常</AlertTitle>
                    当前没有检测到异常预警
                  </Alert>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title='设备预警排行' />
              <CardContent>
                {summary && summary.by_equipment.length > 0 ? (
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>设备名称</TableCell>
                        <TableCell align='center'>预警数</TableCell>
                        <TableCell align='center'>最高级别</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.by_equipment
                        .sort((a, b) => b.alert_count - a.alert_count)
                        .slice(0, 10)
                        .map((eq) => (
                          <TableRow key={eq.equipment_id}>
                            <TableCell>{eq.equipment_name}</TableCell>
                            <TableCell align='center'>{eq.alert_count}</TableCell>
                            <TableCell align='center'>
                              <Chip
                                label={
                                  SEVERITY_CONFIG[
                                    eq.highest_severity as keyof typeof SEVERITY_CONFIG
                                  ]?.label || eq.highest_severity
                                }
                                size='small'
                                color={
                                  SEVERITY_CONFIG[
                                    eq.highest_severity as keyof typeof SEVERITY_CONFIG
                                  ]?.color || 'default'
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert severity='success'>
                    <AlertTitle>暂无设备异常</AlertTitle>
                    所有设备运行正常
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Box>
      )}

      {/* Tab 2: Alert List */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              select
              size='small'
              label='严重程度'
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              sx={{ minWidth: 120 }}
              slotProps={{ select: { native: true } }}
            >
              <option value=''>全部</option>
              <option value='critical'>严重</option>
              <option value='warning'>警告</option>
              <option value='info'>提示</option>
            </TextField>
            <TextField
              select
              size='small'
              label='异常类型'
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              sx={{ minWidth: 150 }}
              slotProps={{ select: { native: true } }}
            >
              <option value=''>全部</option>
              {Object.entries(ANOMALY_TYPE_LABELS).map(([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ))}
            </TextField>
          </Box>

          {alerts.length === 0 ? (
            <Alert severity='success'>
              <AlertTitle>暂无预警</AlertTitle>
              当前没有检测到符合筛选条件的异常预警
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {alerts.map((alert) => {
                const config =
                  SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ||
                  SEVERITY_CONFIG.info;
                return (
                  <Card
                    key={alert.id}
                    sx={{ borderLeft: 4, borderColor: `${config.color}.main` }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        {config.icon}
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mb: 0.5,
                            }}
                          >
                            <Typography variant='subtitle2'>{alert.title}</Typography>
                            <Chip
                              label={config.label}
                              size='small'
                              color={config.color}
                            />
                          </Box>
                          <Typography
                            variant='body2'
                            color='textSecondary'
                            sx={{ mb: 1 }}
                          >
                            {alert.description}
                          </Typography>
                          <Box
                            sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
                          >
                            <Chip
                              label={ANOMALY_TYPE_LABELS[alert.anomaly_type] || alert.anomaly_type}
                              size='small'
                              variant='outlined'
                            />
                            <Typography
                              variant='caption'
                              color='textSecondary'
                            >
                              来源: {alert.source_name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='textSecondary'
                            >
                              指标: {alert.metric_name} = {alert.metric_value.toFixed(2)} (阈值:{' '}
                              {alert.threshold_value})
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography
                                variant='caption'
                                color='textSecondary'
                              >
                                趋势:
                              </Typography>
                              {getTrendIcon(alert.trend)}
                            </Box>
                            <Typography
                              variant='caption'
                              color='textSecondary'
                            >
                              {new Date(alert.detected_at).toLocaleString('zh-CN')}
                            </Typography>
                          </Box>
                          <Alert
                            severity='info'
                            sx={{ mt: 1 }}
                            icon={<SettingsIcon size={16} />}
                          >
                            <Typography variant='caption'>
                              <strong>建议:</strong> {alert.recommendation}
                            </Typography>
                          </Alert>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* Tab 3: Trend */}
      {activeTab === 2 && (
        <Card>
          <CardHeader title='异常趋势（近7天）' />
          <CardContent>
            {trend.length > 0 ? (
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 1,
                    height: 200,
                    mb: 2,
                    mt: 2,
                  }}
                >
                  {trend.map((item) => (
                    <Box
                      key={item.date}
                      sx={{ flex: 1, textAlign: 'center' }}
                    >
                      <Box
                        sx={{
                          height: `${(item.count / maxTrendCount) * 100}%`,
                          minHeight: 4,
                          bgcolor: 'primary.main',
                          borderRadius: '4px 4px 0 0',
                          mb: 0.5,
                          position: 'relative',
                        }}
                      >
                        {item.critical > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              width: '100%',
                              height: `${(item.critical / item.count) * 100}%`,
                              bgcolor: 'error.main',
                              borderRadius: '4px 4px 0 0',
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                      >
                        {item.date.slice(5)}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ display: 'block', fontWeight: 'bold' }}
                      >
                        {item.count}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{ width: 12, height: 12, bgcolor: 'primary.main', borderRadius: 0.5 }}
                    />
                    <Typography variant='caption'>总预警</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: 0.5 }} />
                    <Typography variant='caption'>严重预警</Typography>
                  </Box>
                </Box>
              </Box>
            ) : (
              <Alert severity='info'>
                <AlertTitle>暂无趋势数据</AlertTitle>
                近期没有异常记录
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Rules */}
      {activeTab === 3 && (
        <Card>
          <CardHeader title='预警规则配置' />
          <CardContent>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>规则名称</TableCell>
                  <TableCell>指标</TableCell>
                  <TableCell align='center'>警告阈值</TableCell>
                  <TableCell align='center'>严重阈值</TableCell>
                  <TableCell align='center'>窗口</TableCell>
                  <TableCell align='center'>启用</TableCell>
                  <TableCell align='center'>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Typography variant='body2'>{rule.description}</Typography>
                      <Typography
                        variant='caption'
                        color='textSecondary'
                      >
                        {rule.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={rule.metric_name}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell align='center'>{rule.warning_threshold}</TableCell>
                    <TableCell align='center'>{rule.critical_threshold}</TableCell>
                    <TableCell align='center'>{rule.window_size}天</TableCell>
                    <TableCell align='center'>
                      <Switch
                        checked={rule.enabled}
                        size='small'
                        color='success'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Tooltip title='编辑规则'>
                        <IconButton
                          size='small'
                          onClick={() => handleEditRule(rule)}
                        >
                          <SettingsIcon size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Rule Dialog */}
      <Dialog
        open={!!editingRule}
        onClose={() => setEditingRule(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑预警规则</DialogTitle>
        <DialogContent>
          {editingRule && (
            <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                {editingRule.description}
              </Typography>
              <TextField
                label='警告阈值'
                type='number'
                value={editForm.warning_threshold}
                onChange={(e) => setEditForm({ ...editForm, warning_threshold: e.target.value })}
                fullWidth
              />
              <TextField
                label='严重阈值'
                type='number'
                value={editForm.critical_threshold}
                onChange={(e) => setEditForm({ ...editForm, critical_threshold: e.target.value })}
                fullWidth
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch
                  checked={editForm.enabled}
                  onChange={(e) => setEditForm({ ...editForm, enabled: e.target.checked })}
                  color='success'
                />
                <Typography>启用此规则</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRule(null)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveRule}
            disabled={updateRuleMutation.isPending}
          >
            {updateRuleMutation.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AnomalyDetectionPage;
