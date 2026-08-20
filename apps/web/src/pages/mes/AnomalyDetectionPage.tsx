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
import i18n from '@/i18n';
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
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';
const getSeverityConfig = () => ({
  critical: {
    color: 'error' as const,
    icon: <AlertCircle size={16} />,
    label: i18n.t('mes.anomaly_detection_page.k0'),
  },
  warning: {
    color: 'warning' as const,
    icon: <AlertTriangle size={16} />,
    label: i18n.t('mes.anomaly_detection_page.k1'),
  },
  info: {
    color: 'info' as const,
    icon: <CheckCircle size={16} />,
    label: i18n.t('mes.anomaly_detection_page.k2'),
  },
});
type SeverityKey = keyof ReturnType<typeof getSeverityConfig>;
const getAnomalyTypeLabels = (): Record<string, string> => ({
  equipment_overheat: i18n.t('mes.anomaly_detection_page.k3'),
  equipment_vibration: i18n.t('mes.anomaly_detection_page.k4'),
  equipment_noise: i18n.t('mes.anomaly_detection_page.k5'),
  equipment_oee_drop: i18n.t('pages.anomaly_detection_page.oee_0'),
  equipment_maintenance_overdue: i18n.t('mes.anomaly_detection_page.k6'),
  quality_defect_rate: i18n.t('mes.anomaly_detection_page.k7'),
  quality_batch_failure: i18n.t('mes.anomaly_detection_page.k8'),
  production_delay: i18n.t('mes.anomaly_detection_page.k9'),
  production_output_drop: i18n.t('mes.anomaly_detection_page.k10'),
  wip_backlog: i18n.t('mes.anomaly_detection_page.k11'),
});
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
    queryKey: QUERY_KEYS.AD_HOC.ANOMALY_SUMMARY_BASE,
    queryFn: () => anomalyDetectionApi.getSummary(),
    refetchInterval: 30000,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  // Alerts query
  const alertsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.ANOMALY_ALERTS_BASE, severityFilter, typeFilter],
    queryFn: () =>
      anomalyDetectionApi.getAlerts({
        severity: severityFilter || undefined,
        anomaly_type: typeFilter || undefined,
      }),
    refetchInterval: 30000,

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  // Rules query
  const rulesQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ANOMALY_RULES_BASE,
    queryFn: () => anomalyDetectionApi.getRules(),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  // Trend query
  const trendQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ANOMALY_TREND_BASE,
    queryFn: () => anomalyDetectionApi.getTrend(),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: () => anomalyDetectionApi.triggerScan(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ANOMALY_SUMMARY_BASE,
        exact: false,
        refetchType: 'active',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ANOMALY_ALERTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('mes.anomaly_detection_page.k13'),
        message: i18n.t('mes.anomaly_detection_page.k12'),
        type: 'success',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('mes.anomaly_detection_page.k15'),
        message: i18n.t('mes.anomaly_detection_page.k14'),
        type: 'error',
      });
    },
  });
  // Rule update mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, req }: { ruleId: string; req: Record<string, unknown> }) =>
      anomalyDetectionApi.updateRule(req),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ANOMALY_RULES_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('mes.anomaly_detection_page.k17'),
        message: i18n.t('mes.anomaly_detection_page.k16'),
        type: 'success',
      });
      setEditingRule(null);
    },
    onError: () => {
      addNotification({
        title: i18n.t('mes.anomaly_detection_page.k19'),
        message: i18n.t('mes.anomaly_detection_page.k18'),
        type: 'error',
      });
    },
  });
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ANOMALY_SUMMARY_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ANOMALY_ALERTS_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ANOMALY_TREND_BASE,
      exact: false,
      refetchType: 'active',
    });
    addNotification({
      title: i18n.t('mes.anomaly_detection_page.k21'),
      message: i18n.t('mes.anomaly_detection_page.k20'),
      type: 'success',
    });
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
            color='colors.error.main'
          />
        );
      case 'falling':
        return (
          <TrendingDown
            size={14}
            color={designTokens.colors.success.main}
          />
        );
      default:
        return (
          <Minus
            size={14}
            color='colors.grey.500'
          />
        );
    }
  };
  const maxTrendCount = Math.max(...trend.map((t) => t.count), 1);
  return (
    <PageContainer title={i18n.t('mes.anomaly_detection_page.k22')}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography
            variant='h5'
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AlertTriangle size={24} />
            {i18n.t('pages.anomaly_detection_page.k0')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant='outlined'
              startIcon={<RefreshCw size={16} />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {i18n.t('pages.anomaly_detection_page.k1')}
            </Button>
            <Button
              variant='contained'
              startIcon={<ScanLine size={16} />}
              onClick={handleScan}
              disabled={scanMutation.isPending}
            >
              {scanMutation.isPending
                ? i18n.t('pages.anomaly_detection_page.k1')
                : i18n.t('mes.anomaly_detection_page.k23')}
            </Button>
          </Box>
        </Box>
        {isLoading && <LinearProgress sx={{ mb: 2 }} />}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 3 }}
        >
          <Tab label={i18n.t('mes.anomaly_detection_page.k24')} />
          <Tab label={`${i18n.t('pages.anomaly_detection_page.k2')}${alerts.length})`} />
          <Tab label={i18n.t('mes.anomaly_detection_page.k25')} />
          <Tab label={i18n.t('mes.anomaly_detection_page.k26')} />
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
                      color='colors.error.main'
                      size={20}
                    />
                    <Typography
                      color='textSecondary'
                      variant='body2'
                    >
                      {i18n.t('pages.anomaly_detection_page.k2')}
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
                      color={designTokens.colors.warning.main}
                      size={20}
                    />
                    <Typography
                      color='textSecondary'
                      variant='body2'
                    >
                      {i18n.t('pages.anomaly_detection_page.k3')}
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
                      color={designTokens.colors.primary[500]}
                      size={20}
                    />
                    <Typography
                      color='textSecondary'
                      variant='body2'
                    >
                      {i18n.t('pages.anomaly_detection_page.k4')}
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
                      color={designTokens.colors.purple['500']}
                      size={20}
                    />
                    <Typography
                      color='textSecondary'
                      variant='body2'
                    >
                      {i18n.t('pages.anomaly_detection_page.k5')}
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
                <CardHeader title={i18n.t('mes.anomaly_detection_page.k27')} />
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
                        <Typography variant='body2'>
                          {getAnomalyTypeLabels()[type] || type}
                        </Typography>
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
                      <AlertTitle>{i18n.t('mes.anomaly_detection_page.k28')}</AlertTitle>
                      {i18n.t('pages.anomaly_detection_page.k6')}
                    </Alert>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader title={i18n.t('mes.anomaly_detection_page.k29')} />
                <CardContent>
                  {summary && summary.by_equipment.length > 0 ? (
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>{i18n.t('mes.anomaly_detection_page.k30')}</TableCell>
                          <TableCell align='center'>
                            {i18n.t('mes.anomaly_detection_page.k31')}
                          </TableCell>
                          <TableCell align='center'>
                            {i18n.t('mes.anomaly_detection_page.k32')}
                          </TableCell>
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
                                    getSeverityConfig()[eq.highest_severity as SeverityKey]
                                      ?.label || eq.highest_severity
                                  }
                                  size='small'
                                  color={
                                    getSeverityConfig()[eq.highest_severity as SeverityKey]
                                      ?.color || 'default'
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Alert severity='success'>
                      <AlertTitle>{i18n.t('mes.anomaly_detection_page.k33')}</AlertTitle>
                      {i18n.t('pages.anomaly_detection_page.k7')}
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
                label={i18n.t('mes.anomaly_detection_page.k34')}
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                sx={{ minWidth: 120 }}
                slotProps={{ select: { native: true } }}
              >
                <option value=''>{i18n.t('mes.anomaly_detection_page.k35')}</option>
                <option value='critical'>{i18n.t('mes.anomaly_detection_page.k36')}</option>
                <option value='warning'>{i18n.t('mes.anomaly_detection_page.k37')}</option>
                <option value='info'>{i18n.t('mes.anomaly_detection_page.k38')}</option>
              </TextField>
              <TextField
                select
                size='small'
                label={i18n.t('mes.anomaly_detection_page.k39')}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                sx={{ minWidth: 150 }}
                slotProps={{ select: { native: true } }}
              >
                <option value=''>{i18n.t('mes.anomaly_detection_page.k40')}</option>
                {Object.entries(getAnomalyTypeLabels()).map(([value, label]) => (
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
                <AlertTitle>{i18n.t('mes.anomaly_detection_page.k41')}</AlertTitle>
                {i18n.t('pages.anomaly_detection_page.k8')}
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {alerts.map((alert) => {
                  const config =
                    getSeverityConfig()[alert.severity as SeverityKey] || getSeverityConfig().info;
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
                              sx={{
                                display: 'flex',
                                gap: 2,
                                flexWrap: 'wrap',
                                alignItems: 'center',
                              }}
                            >
                              <Chip
                                label={
                                  getAnomalyTypeLabels()[alert.anomaly_type] || alert.anomaly_type
                                }
                                size='small'
                                variant='outlined'
                              />
                              <Typography
                                variant='caption'
                                color='textSecondary'
                              >
                                [i18n.t('pages.anomaly_detection_page.k9')]: {alert.source_name}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='textSecondary'
                              >
                                [i18n.t('pages.anomaly_detection_page.k10')]: {alert.metric_name} ={' '}
                                {alert.metric_value.toFixed(2)} ({i18n.t('pages.anomaly_detection_page.k0')}: {alert.threshold_value})
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                  variant='caption'
                                  color='textSecondary'
                                >
                                  [i18n.t('pages.anomaly_detection_page.k11')]:
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
                                {i18n.t('pages.anomaly_detection_page.strongstrong_0')}{' '}
                                {alert.recommendation}
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
            <CardHeader title={i18n.t('mes.anomaly_detection_page.7_42')} />
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
                      <Typography variant='caption'>
                        {i18n.t('mes.anomaly_detection_page.k43')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: 0.5 }}
                      />
                      <Typography variant='caption'>
                        {i18n.t('mes.anomaly_detection_page.k44')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Alert severity='info'>
                  <AlertTitle>{i18n.t('mes.anomaly_detection_page.k45')}</AlertTitle>
                  {i18n.t('pages.anomaly_detection_page.k12')}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        {/* Tab 4: Rules */}
        {activeTab === 3 && (
          <Card>
            <CardHeader title={i18n.t('mes.anomaly_detection_page.k46')} />
            <CardContent>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('mes.anomaly_detection_page.k47')}</TableCell>
                    <TableCell>{i18n.t('mes.anomaly_detection_page.k48')}</TableCell>
                    <TableCell align='center'>{i18n.t('mes.anomaly_detection_page.k49')}</TableCell>
                    <TableCell align='center'>{i18n.t('mes.anomaly_detection_page.k50')}</TableCell>
                    <TableCell align='center'>{i18n.t('mes.anomaly_detection_page.k51')}</TableCell>
                    <TableCell align='center'>{i18n.t('mes.anomaly_detection_page.k52')}</TableCell>
                    <TableCell align='center'>{i18n.t('mes.anomaly_detection_page.k53')}</TableCell>
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
                      <TableCell align='center'>
                        {i18n.t('pages.anomaly_detection_page.rulewindowsize_0')}
                      </TableCell>
                      <TableCell align='center'>
                        <Switch
                          checked={rule.enabled}
                          size='small'
                          color='success'
                        />
                      </TableCell>
                      <TableCell align='center'>
                        <Tooltip title={i18n.t('mes.anomaly_detection_page.k54')}>
                          <IconButton
                            size='small'
                            onClick={() => handleEditRule(rule)}
                            aria-label={i18n.t('mes.anomaly_detection_page.k55')}
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
          <DialogTitle>{i18n.t('mes.anomaly_detection_page.k56')}</DialogTitle>
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
                  label={i18n.t('mes.anomaly_detection_page.k57')}
                  type='number'
                  value={editForm.warning_threshold}
                  onChange={(e) => setEditForm({ ...editForm, warning_threshold: e.target.value })}
                  fullWidth
                />
                <TextField
                  label={i18n.t('mes.anomaly_detection_page.k58')}
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
                  <Typography>{i18n.t('mes.anomaly_detection_page.k59')}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditingRule(null)}>
              {i18n.t('mes.anomaly_detection_page.k60')}
            </Button>
            <Button
              variant='contained'
              onClick={handleSaveRule}
              disabled={updateRuleMutation.isPending}
            >
              {updateRuleMutation.isPending
                ? i18n.t('pages.anomaly_detection_page.k3')
                : i18n.t('mes.anomaly_detection_page.k61')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};
export default AnomalyDetectionPage;
