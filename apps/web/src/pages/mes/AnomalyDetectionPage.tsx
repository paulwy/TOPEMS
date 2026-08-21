import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Minus,
  ScanLine,
  Settings as SettingsIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { anomalyDetectionApi } from '@/api/mes/anomalyDetection';
import type { AnomalyAlert, AnomalyRule } from '@/api/mes/anomalyDetection';
import { useNotificationStore } from '@/store/notificationStore';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@topems/tokens';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  ChartConfig,
  DataTable,
  StatCard,
  TabItem,
} from '@/components/templates/StatsPageTemplate';

const ct = designTokens.colors;

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

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'rising':
      return (
        <TrendingUp
          size={14}
          color={ct.error.main}
        />
      );
    case 'falling':
      return (
        <TrendingDown
          size={14}
          color={ct.success.main}
        />
      );
    default:
      return (
        <Minus
          size={14}
          color={ct.grey[500]}
        />
      );
  }
};

const TYPE_COLORS = [
  ct.primary.main,
  ct.success.main,
  ct.warning.main,
  ct.error.main,
  ct.info.main,
  ct.secondary.main,
];

type TabValue = 'summary' | 'alerts' | 'trend' | 'rules';

const AnomalyDetectionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('summary');
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
    mutationFn: ({ _ruleId, req }: { _ruleId: string; req: Record<string, unknown> }) =>
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

  const handleRefresh = useCallback(() => {
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
  }, [queryClient, addNotification]);

  const handleScan = useCallback(() => {
    scanMutation.mutate();
  }, [scanMutation]);

  const handleEditRule = useCallback((rule: AnomalyRule) => {
    setEditingRule(rule);
    setEditForm({
      warning_threshold: rule.warning_threshold.toString(),
      critical_threshold: rule.critical_threshold.toString(),
      enabled: rule.enabled,
    });
  }, []);

  const handleSaveRule = useCallback(() => {
    if (!editingRule) return;
    const req: Record<string, unknown> = {
      warning_threshold: parseFloat(editForm.warning_threshold),
      critical_threshold: parseFloat(editForm.critical_threshold),
      enabled: editForm.enabled,
    };
    updateRuleMutation.mutate({ _ruleId: editingRule.id, req });
  }, [editingRule, editForm, updateRuleMutation]);

  const summary = useMemo(() => summaryQuery.data?.data, [summaryQuery.data]);
  const alerts = useMemo(() => alertsQuery.data?.data || [], [alertsQuery.data]);
  const rules = useMemo(() => rulesQuery.data?.data || [], [rulesQuery.data]);
  const trend = useMemo(() => trendQuery.data?.data || [], [trendQuery.data]);

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'summary':
        return summaryQuery.isPending;
      case 'alerts':
        return alertsQuery.isPending;
      case 'trend':
        return trendQuery.isPending;
      case 'rules':
        return rulesQuery.isPending;
      default:
        return false;
    }
  }, [
    activeTab,
    summaryQuery.isPending,
    alertsQuery.isPending,
    trendQuery.isPending,
    rulesQuery.isPending,
  ]);

  const tabItems: TabItem[] = useMemo(
    () => [
      { value: 'summary', label: i18n.t('mes.anomaly_detection_page.k24') },
      {
        value: 'alerts',
        label: `${i18n.t('pages.anomaly_detection_page.k2')}${alerts.length})`,
      },
      { value: 'trend', label: i18n.t('mes.anomaly_detection_page.k25') },
      { value: 'rules', label: i18n.t('mes.anomaly_detection_page.k26') },
    ],
    [alerts.length]
  );

  const statCards = useMemo<StatCard[]>(() => {
    if (activeTab !== 'summary') return [];
    return [
      {
        id: 'critical',
        title: i18n.t('pages.anomaly_detection_page.k2'),
        value: summary?.critical_count ?? 0,
        icon: <AlertCircle size={18} />,
        color: 'error',
      },
      {
        id: 'warning',
        title: i18n.t('pages.anomaly_detection_page.k3'),
        value: summary?.warning_count ?? 0,
        icon: <AlertTriangle size={18} />,
        color: 'warning',
      },
      {
        id: 'info',
        title: i18n.t('pages.anomaly_detection_page.k4'),
        value: summary?.info_count ?? 0,
        icon: <CheckCircle size={18} />,
        color: 'info',
      },
      {
        id: 'total',
        title: i18n.t('pages.anomaly_detection_page.k5'),
        value: summary?.total_alerts ?? 0,
        icon: <Activity size={18} />,
        color: 'primary',
      },
    ];
  }, [activeTab, summary]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (activeTab === 'summary') {
      const byType = summary?.byType;
      if (!byType || Object.entries(byType).length === 0) return [];
      const typeLabels = getAnomalyTypeLabels();
      const data = Object.entries(byType).map(([type, count], index) => ({
        name: typeLabels[type] || type,
        value: count as number,
        color: TYPE_COLORS[index % TYPE_COLORS.length],
      }));
      return [
        {
          id: 'summary-by-type',
          title: i18n.t('mes.anomaly_detection_page.k27'),
          type: 'pie',
          dataKey: 'value',
          nameKey: 'name',
          data,
        },
      ];
    }

    if (activeTab === 'trend') {
      if (trend.length === 0) return [];
      return [
        {
          id: 'trend-bar',
          title: i18n.t('mes.anomaly_detection_page.7_42'),
          type: 'bar',
          dataKey: 'value',
          nameKey: 'name',
          data: trend.map((item) => ({
            name: item.date.slice(5),
            value: item.count,
            critical: item.critical,
          })),
          comparisonData: trend.map((item) => ({
            name: item.date.slice(5),
            value: item.critical,
          })),
          comparisonLabel: i18n.t('mes.anomaly_detection_page.k44'),
        },
      ];
    }

    return [];
  }, [activeTab, summary, trend]);

  const tables = useMemo<DataTable[]>(() => {
    switch (activeTab) {
      case 'summary': {
        const data = (summary?.by_equipment || [])
          .slice()
          .sort((a, b) => b.alert_count - a.alert_count)
          .slice(0, 10)
          .map((eq) => ({
            equipment_name: eq.equipment_name,
            alert_count: eq.alert_count,
            highest_severity: eq.highest_severity,
          }));
        return [
          {
            id: 'by-equipment-table',
            title: i18n.t('mes.anomaly_detection_page.k29'),
            columns: [
              {
                id: 'equipment_name',
                label: i18n.t('mes.anomaly_detection_page.k30'),
                field: 'equipment_name',
              },
              {
                id: 'alert_count',
                label: i18n.t('mes.anomaly_detection_page.k31'),
                field: 'alert_count',
                align: 'center',
              },
              {
                id: 'highest_severity',
                label: i18n.t('mes.anomaly_detection_page.k32'),
                field: 'highest_severity',
                align: 'center',
                render: (value) => {
                  const cfg = getSeverityConfig()[value as SeverityKey];
                  return (
                    <Chip
                      label={cfg?.label || String(value)}
                      size='small'
                      color={cfg?.color || 'default'}
                    />
                  );
                },
              },
            ],
            data,
          },
        ];
      }

      case 'alerts': {
        const data: Record<string, unknown>[] = alerts.map(
          (alert) => alert as unknown as Record<string, unknown>
        );
        return [
          {
            id: 'alerts-table',
            title: i18n.t('pages.anomaly_detection_page.k2'),
            columns: [
              {
                id: 'title',
                label: i18n.t('pages.anomaly_detection_page.k0'),
                field: 'title',
                render: (_value, row) => {
                  const alert = row as unknown as AnomalyAlert;
                  const cfg = getSeverityConfig()[alert.severity as SeverityKey];
                  return (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        {cfg?.icon}
                        <strong>{alert.title}</strong>
                        <Chip
                          label={cfg?.label || alert.severity}
                          size='small'
                          color={cfg?.color || 'default'}
                        />
                      </Box>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mb: 0.5 }}
                      >
                        {alert.description}
                      </Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('pages.anomaly_detection_page.strongstrong_0')}{' '}
                        {alert.recommendation}
                      </Typography>
                    </Box>
                  );
                },
              },
              {
                id: 'severity',
                label: i18n.t('mes.anomaly_detection_page.k34'),
                field: 'severity',
                align: 'center',
                render: (value) => {
                  const cfg = getSeverityConfig()[value as SeverityKey];
                  return (
                    <Chip
                      icon={cfg?.icon}
                      label={cfg?.label || String(value)}
                      size='small'
                      color={cfg?.color || 'default'}
                    />
                  );
                },
              },
              {
                id: 'type',
                label: i18n.t('mes.anomaly_detection_page.k39'),
                field: 'anomaly_type',
                align: 'center',
                render: (value) => (
                  <Chip
                    label={getAnomalyTypeLabels()[String(value)] || String(value)}
                    size='small'
                    variant='outlined'
                  />
                ),
              },
              {
                id: 'source',
                label: i18n.t('pages.anomaly_detection_page.k9'),
                field: 'source_name',
                align: 'center',
              },
              {
                id: 'metric',
                label: i18n.t('pages.anomaly_detection_page.k10'),
                field: 'metric_name',
                align: 'center',
                render: (_value, row) => {
                  const alert = row as unknown as AnomalyAlert;
                  return `${alert.metric_name} = ${alert.metric_value.toFixed(2)} (${i18n.t('pages.anomaly_detection_page.k0')}: ${alert.threshold_value.toFixed(2)})`;
                },
              },
              {
                id: 'trend',
                label: i18n.t('pages.anomaly_detection_page.k11'),
                field: 'trend',
                align: 'center',
                render: (value) => getTrendIcon(String(value)),
              },
              {
                id: 'detected_at',
                label: i18n.t('pages.anomaly_detection_page.k11'),
                field: 'detected_at',
                align: 'center',
                render: (value) => new Date(String(value)).toLocaleString('zh-CN'),
              },
            ],
            data,
          },
        ];
      }

      case 'rules': {
        const data: Record<string, unknown>[] = rules.map(
          (rule) => rule as unknown as Record<string, unknown>
        );
        return [
          {
            id: 'rules-table',
            title: i18n.t('mes.anomaly_detection_page.k46'),
            columns: [
              {
                id: 'description',
                label: i18n.t('mes.anomaly_detection_page.k47'),
                field: 'description',
              },
              {
                id: 'metric_name',
                label: i18n.t('mes.anomaly_detection_page.k48'),
                field: 'metric_name',
                align: 'center',
                render: (value) => (
                  <Chip
                    label={String(value)}
                    size='small'
                    variant='outlined'
                  />
                ),
              },
              {
                id: 'warning_threshold',
                label: i18n.t('mes.anomaly_detection_page.k49'),
                field: 'warning_threshold',
                align: 'center',
              },
              {
                id: 'critical_threshold',
                label: i18n.t('mes.anomaly_detection_page.k50'),
                field: 'critical_threshold',
                align: 'center',
              },
              {
                id: 'window_size',
                label: i18n.t('mes.anomaly_detection_page.k51'),
                field: 'window_size',
                align: 'center',
                render: (_value, row) => {
                  const rule = row as unknown as AnomalyRule;
                  return i18n.t('pages.anomaly_detection_page.rulewindowsize_0', {
                    rule: { window_size: rule.window_size },
                  });
                },
              },
              {
                id: 'enabled',
                label: i18n.t('mes.anomaly_detection_page.k52'),
                field: 'enabled',
                align: 'center',
                render: (value) => (
                  <Switch
                    checked={Boolean(value)}
                    size='small'
                    color='success'
                  />
                ),
              },
              {
                id: 'operations',
                label: i18n.t('mes.anomaly_detection_page.k53'),
                align: 'center',
                render: (_value, row) => {
                  const rule = row as unknown as AnomalyRule;
                  return (
                    <Tooltip title={i18n.t('mes.anomaly_detection_page.k54')}>
                      <IconButton
                        size='small'
                        onClick={() => handleEditRule(rule)}
                        aria-label={i18n.t('mes.anomaly_detection_page.k55')}
                      >
                        <SettingsIcon size={16} />
                      </IconButton>
                    </Tooltip>
                  );
                },
              },
            ],
            data,
          },
        ];
      }

      default:
        return [];
    }
  }, [activeTab, summary, alerts, rules, handleEditRule]);

  const customToolbar = useMemo(
    () => (
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          {activeTab === 'alerts' && (
            <>
              <FormControl
                size='small'
                sx={{ minWidth: 120 }}
              >
                <InputLabel>{i18n.t('mes.anomaly_detection_page.k34')}</InputLabel>
                <Select
                  value={severityFilter}
                  label={i18n.t('mes.anomaly_detection_page.k34')}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <MenuItem value=''>{i18n.t('mes.anomaly_detection_page.k35')}</MenuItem>
                  <MenuItem value='critical'>{i18n.t('mes.anomaly_detection_page.k36')}</MenuItem>
                  <MenuItem value='warning'>{i18n.t('mes.anomaly_detection_page.k37')}</MenuItem>
                  <MenuItem value='info'>{i18n.t('mes.anomaly_detection_page.k38')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{i18n.t('mes.anomaly_detection_page.k39')}</InputLabel>
                <Select
                  value={typeFilter}
                  label={i18n.t('mes.anomaly_detection_page.k39')}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <MenuItem value=''>{i18n.t('mes.anomaly_detection_page.k40')}</MenuItem>
                  {Object.entries(getAnomalyTypeLabels()).map(([value, label]) => (
                    <MenuItem
                      key={value}
                      value={value}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </Box>
        <Button
          variant='contained'
          size='small'
          startIcon={<ScanLine size={16} />}
          onClick={handleScan}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending
            ? i18n.t('pages.anomaly_detection_page.k1')
            : i18n.t('mes.anomaly_detection_page.k23')}
        </Button>
      </Box>
    ),
    [activeTab, severityFilter, typeFilter, scanMutation.isPending, handleScan]
  );

  return (
    <>
      <StatsPageTemplate
        title={i18n.t('mes.anomaly_detection_page.k22')}
        tabs={tabItems}
        tabValue={activeTab}
        onTabChange={(value) => setActiveTab(value as TabValue)}
        statCards={statCards}
        statColumns={4}
        charts={charts}
        tables={tables}
        loading={loading}
        onRefresh={handleRefresh}
        customToolbar={customToolbar}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
      />

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
                color='text.secondary'
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
                <Typography variant='body2'>{i18n.t('mes.anomaly_detection_page.k59')}</Typography>
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
    </>
  );
};

export default AnomalyDetectionPage;
