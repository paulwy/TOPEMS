import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  Tooltip,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Brain as BrainIcon,
  AlertTriangle as AlertIcon,
  TrendingUp as TrendingUpIcon,
  Activity as ActivityIcon,
  Layers as LayersIcon,
  Zap as ZapIcon,
  Clock as ClockIcon,
  CheckCircle as CheckCircleIcon,
  RefreshCw as RefreshIcon,
  Download as DownloadIcon,
  X as XIcon,
  Plus as PlusIcon,
  ArrowUp as ArrowUpIcon,
  ArrowDown as ArrowDownIcon,
  Minus as MinusIcon,
  Target as TargetIcon,
  Gauge as GaugeIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
} from 'lucide-react';
import { anomalyDetector, type AnomalyEvent, type MetricBaseline } from './anomaly-detector';
import {
  smartAlertManager,
  type Alert as AlertType,
  type AlertRule,
  type AlertStats,
} from './smart-alerting';
import { metricPredictor, type PredictedAnomaly } from './predictor';
import {
  autoScaler,
  type ScalingEvent,
  type ScalingPolicy,
  type ModuleInstanceInfo,
} from './auto-scaler';
import { moduleRegistry, type ModuleRegistration } from '../registry/module-registry';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabType = 'overview' | 'anomaly' | 'alert' | 'prediction' | 'autoscale';

interface AIOpsPanelProps {
  onClose?: () => void;
  refreshInterval?: number;
}

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
  trendUp?: boolean;
}> = ({ label, value, icon, color, trend, trendUp }) => (
  <Card sx={{ flex: '1 1 0', minWidth: 0 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 1 }}
          >
            {label}
          </Typography>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700, color, fontSize: { xs: '1.5rem', sm: '2rem' } }}
          >
            {value}
          </Typography>
          {trend && (
            <Typography
              variant='caption'
              sx={{
                mt: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: trendUp ? designTokens.colors.success.dark : designTokens.colors.error.dark,
              }}
            >
              {trendUp ? <ArrowUpIcon size={12} /> : <ArrowDownIcon size={12} />}
              {trend}
            </Typography>
          )}
        </Box>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color, flexShrink: 0 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AIOpsPanel: React.FC<AIOpsPanelProps> = ({ onClose, refreshInterval = 3000 }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats | null>(null);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [predictedAnomalies, setPredictedAnomalies] = useState<PredictedAnomaly[]>([]);
  const [scalingHistory, setScalingHistory] = useState<ScalingEvent[]>([]);
  const [scalingPolicies, setScalingPolicies] = useState<ScalingPolicy[]>([]);
  const [instances, setInstances] = useState<Record<string, ModuleInstanceInfo[]>>({});
  const [baselines, setBaselines] = useState<MetricBaseline[]>([]);
  const [registeredModules, setRegisteredModules] = useState<ModuleRegistration[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showAddRuleDialog, setShowAddRuleDialog] = useState(false);
  const [showAddPolicyDialog, setShowAddPolicyDialog] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleMetric, setNewRuleMetric] = useState('cpuUsage');
  const [newRuleOperator, setNewRuleOperator] = useState<'gt' | 'gte' | 'lt' | 'lte'>('gt');
  const [newRuleThreshold, setNewRuleThreshold] = useState(80);
  const [newRuleSeverity, setNewRuleSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>(
    'high'
  );
  const [newRuleCooldown, setNewRuleCooldown] = useState(300);
  const [selectedPredMetric, setSelectedPredMetric] = useState('cpuUsage');
  const [selectedPredModule, setSelectedPredModule] = useState<string | null>(null);
  const [selectedScaleModule, setSelectedScaleModule] = useState<string | null>(null);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyMin, setNewPolicyMin] = useState(1);
  const [newPolicyMax, setNewPolicyMax] = useState(5);
  const [newPolicyCpuUp, setNewPolicyCpuUp] = useState(80);
  const [newPolicyCpuDown, setNewPolicyCpuDown] = useState(30);

  const generateDemoData = useCallback(() => {
    const modules = moduleRegistry.listModules();
    setRegisteredModules(modules);

    const metrics = [
      'cpuUsage',
      'memoryUsage',
      'responseTime',
      'errorRate',
      'requestRate',
      'totalLoadTime',
      'fcp',
      'tti',
      'whiteScreenTime',
    ];

    const moduleIds = modules.map((m) => m.id).slice(0, 5);
    if (moduleIds.length === 0) moduleIds.push('demo-module');

    for (const moduleId of moduleIds) {
      for (const metric of metrics) {
        const baseValue = metric.includes('Time') || metric.includes('Load') ? 1000 : 50;
        const values = Array.from(
          { length: 50 },
          () => baseValue + (Math.random() - 0.5) * baseValue * 0.4
        );
        anomalyDetector.train(metric, values, moduleId);
        metricPredictor.train(metric, values, undefined, moduleId);
      }

      const policy = autoScaler.getPoliciesByModule(moduleId);
      if (policy.length === 0) {
        autoScaler.registerPolicy({
          moduleId,
          name: `${moduleId} ${i18n.t('microfrontend.ai_ops_panel.k0')}`,
          enabled: true,
          minInstances: 1,
          maxInstances: 10,
          scaleUpIncrement: 1,
          scaleDownIncrement: 1,
          scaleUpCooldown: 60000,
          scaleDownCooldown: 300000,
          metrics: [
            { name: 'cpuUsage', scaleUpThreshold: 80, scaleDownThreshold: 30, weight: 0.6 },
            { name: 'memoryUsage', scaleUpThreshold: 85, scaleDownThreshold: 40, weight: 0.4 },
          ],
          scaleUpStrategy: 'weighted',
          scaleDownStrategy: 'weighted',
        });
      }
    }

    for (let i = 0; i < 5; i++) {
      const moduleId = moduleIds[i % moduleIds.length];
      const metric = metrics[Math.floor(Math.random() * metrics.length)];
      const baseValue = metric.includes('Time') || metric.includes('Load') ? 1000 : 50;
      const anomalyValue = baseValue * (1.5 + Math.random() * 1.5);
      anomalyDetector.detect(metric, anomalyValue, moduleId);
    }

    const firingAlerts = smartAlertManager.getAlerts({ status: 'firing' });
    if (firingAlerts.length < 3) {
      smartAlertManager.addRule({
        name: i18n.t('microfrontend.ai_ops_panel.cpu_1'),
        description: i18n.t('microfrontend.ai_ops_panel.cpu_0'),
        condition: { metricName: 'cpuUsage', operator: 'gt', threshold: 80 },
        severity: 'high',
        enabled: true,
        cooldown: 300000,
      });
      smartAlertManager.addRule({
        name: i18n.t('microfrontend.ai_ops_panel.k1'),
        description: i18n.t('microfrontend.ai_ops_panel.k2'),
        condition: { metricName: 'responseTime', operator: 'gt', threshold: 2000 },
        severity: 'medium',
        enabled: true,
        cooldown: 600000,
      });
      smartAlertManager.addRule({
        name: i18n.t('microfrontend.ai_ops_panel.k3'),
        description: i18n.t('microfrontend.ai_ops_panel.k4'),
        condition: { metricName: 'errorRate', operator: 'gt', threshold: 5 },
        severity: 'critical',
        enabled: true,
        cooldown: 120000,
      });

      smartAlertManager.processMetrics([
        { metricName: 'cpuUsage', value: 85, moduleId: moduleIds[0] },
        { metricName: 'responseTime', value: 2500, moduleId: moduleIds[1] },
        { metricName: 'errorRate', value: 8, moduleId: moduleIds[2] },
      ]);
    }

    for (const moduleId of moduleIds) {
      metricPredictor.predictAnomaly('cpuUsage', 5, 2, moduleId);
      metricPredictor.predictAnomaly('responseTime', 5, 2, moduleId);
    }
  }, []);

  const refreshData = useCallback(() => {
    setAnomalies(anomalyDetector.getAnomalyHistory({ limit: 50 }));
    setAlerts(smartAlertManager.getAlerts({ limit: 50 }));
    setAlertStats(smartAlertManager.getAlertStats());
    setAlertRules(smartAlertManager.getAllRules());
    setPredictedAnomalies(metricPredictor.getPredictedAnomalies({ limit: 50 }));
    setScalingHistory(autoScaler.getScalingHistory({ limit: 50 }));
    setScalingPolicies(autoScaler.getAllPolicies());
    setInstances(autoScaler.getAllInstances());
    setBaselines(anomalyDetector.getAllBaselines());
    setRegisteredModules(moduleRegistry.listModules());
  }, []);

  useEffect(() => {
    generateDemoData();
    refreshData();
  }, [generateDemoData, refreshData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  const handleExport = () => {
    const data = {
      anomalies,
      alerts,
      alertStats,
      alertRules,
      predictedAnomalies,
      scalingHistory,
      scalingPolicies,
      baselines,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-ops-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatRelativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return i18n.t('microfrontend.ai_ops_panel.k5');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}${i18n.t('microfrontend.ai_ops_panel.k2')}`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}${i18n.t('microfrontend.ai_ops_panel.k3')}`;
    return `${Math.floor(diff / 86400000)}${i18n.t('microfrontend.ai_ops_panel.k4')}`;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return designTokens.colors.error.dark;
      case 'high':
        return '#ef6c00';
      case 'medium':
        return 'colors.orange.700';
      case 'low':
        return designTokens.colors.primary.dark;
      default:
        return designTokens.colors.grey['600'];
    }
  };

  const getAlertStatusColor = (status: string): string => {
    switch (status) {
      case 'firing':
        return designTokens.colors.error.dark;
      case 'acknowledged':
        return 'colors.orange.700';
      case 'resolved':
        return designTokens.colors.success.dark;
      case 'suppressed':
        return designTokens.colors.grey['600'];
      default:
        return designTokens.colors.grey['600'];
    }
  };

  const totalAnomalies = anomalies.length;
  const unresolvedAnomalies = anomalies.filter((a) => !a.resolved).length;
  const firingAlerts = alertStats?.firing || 0;
  const totalAlerts = alertStats?.total || 0;
  const totalPredictions = predictedAnomalies.length;
  const scalingEvents = scalingHistory.length;
  const totalInstances = Object.values(instances)
    .flat()
    .filter((i) => i.status === 'running').length;

  const severityCounts = {
    critical: anomalies.filter((a) => a.severity === 'critical').length,
    high: anomalies.filter((a) => a.severity === 'high').length,
    medium: anomalies.filter((a) => a.severity === 'medium').length,
    low: anomalies.filter((a) => a.severity === 'low').length,
  };

  const moduleAnomaliesMap: Record<string, number> = {};
  for (const a of anomalies) {
    const key = a.moduleId || 'global';
    moduleAnomaliesMap[key] = (moduleAnomaliesMap[key] || 0) + 1;
  }
  const moduleAnomalies = Object.entries(moduleAnomaliesMap).sort(([, a], [, b]) => b - a);

  const moduleInstances = selectedScaleModule
    ? instances[selectedScaleModule] || []
    : Object.values(instances).flat();
  const modulePolicies = selectedScaleModule
    ? scalingPolicies.filter((p) => p.moduleId === selectedScaleModule)
    : scalingPolicies;
  const moduleScalingHistory = selectedScaleModule
    ? scalingHistory.filter((e) => e.moduleId === selectedScaleModule)
    : scalingHistory;

  const totalRunning = Object.values(instances)
    .flat()
    .filter((i) => i.status === 'running').length;
  const totalPolicies = scalingPolicies.length;
  const enabledPolicies = scalingPolicies.filter((p) => p.enabled).length;

  const predictionHistory = metricPredictor.getMetricHistory(
    selectedPredMetric,
    selectedPredModule || registeredModules[0]?.id
  );
  const predictionResult = metricPredictor.predictWithConfidence(
    selectedPredMetric,
    10,
    0.95,
    selectedPredModule || registeredModules[0]?.id
  );

  const allPredValues = [
    ...(predictionHistory?.values || []),
    ...(predictionResult?.predictions.map((p) => p.value) || []),
  ];
  const maxPredVal = Math.max(...allPredValues, 1);
  const minPredVal = Math.min(...allPredValues, 0);

  const renderOverview = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k6')}
          value={firingAlerts}
          icon={<AlertIcon size={24} />}
          color={designTokens.colors.error.dark}
          trend={`${totalAlerts} ${i18n.t('microfrontend.ai_ops_panel.k5')}`}
          trendUp={firingAlerts > 5}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k7')}
          value={unresolvedAnomalies}
          icon={<ActivityIcon size={24} />}
          color='#ef6c00'
          trend={`${totalAnomalies} ${i18n.t('microfrontend.ai_ops_panel.k6')}`}
          trendUp={unresolvedAnomalies > 10}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k8')}
          value={totalPredictions}
          icon={<TrendingUpIcon size={24} />}
          color={designTokens.colors.purple['700']}
          trend={i18n.t('microfrontend.ai_ops_panel.24h_9')}
          trendUp
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k10')}
          value={scalingEvents}
          icon={<LayersIcon size={24} />}
          color={designTokens.colors.teal['700']}
          trend={`${totalInstances} ${i18n.t('microfrontend.ai_ops_panel.k7')}`}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '2 1 600px', minWidth: 0 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('microfrontend.ai_ops_panel.k8')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 200 }}>
              {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                const count = severityCounts[sev];
                const max = Math.max(...Object.values(severityCounts), 1);
                return (
                  <Box
                    key={sev}
                    sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 700, color: getSeverityColor(sev) }}
                    >
                      {count}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        bgcolor: getSeverityColor(sev),
                        borderRadius: 1,
                        transition: 'height 0.5s ease',
                        minHeight: 4,
                      }}
                      style={{ height: `${(count / max) * 140}px` }}
                    />
                    <Typography
                      variant='caption'
                      sx={{ mt: 1, textTransform: 'capitalize' }}
                    >
                      {sev === 'critical'
                        ? i18n.t('microfrontend.ai_ops_panel.k11')
                        : sev === 'high'
                          ? i18n.t('microfrontend.ai_ops_panel.k12')
                          : sev === 'medium'
                            ? i18n.t('microfrontend.ai_ops_panel.k13')
                            : i18n.t('microfrontend.ai_ops_panel.k14')}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('microfrontend.ai_ops_panel.k9')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(['firing', 'acknowledged', 'resolved', 'suppressed'] as const).map((status) => {
                const count = alertStats?.[status] || 0;
                const label =
                  status === 'firing'
                    ? i18n.t('microfrontend.ai_ops_panel.k15')
                    : status === 'acknowledged'
                      ? i18n.t('microfrontend.ai_ops_panel.k16')
                      : status === 'resolved'
                        ? i18n.t('microfrontend.ai_ops_panel.k17')
                        : i18n.t('microfrontend.ai_ops_panel.k18');
                return (
                  <Box key={status}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant='body2'>{label}</Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, color: getAlertStatusColor(status) }}
                      >
                        {count}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min((count / (alertStats?.total || 1)) * 100, 100)}
                      sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                      color={
                        status === 'firing'
                          ? 'error'
                          : status === 'acknowledged'
                            ? 'warning'
                            : status === 'resolved'
                              ? 'success'
                              : 'inherit'
                      }
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('microfrontend.ai_ops_panel.k10')}
            </Typography>
            {anomalies.length === 0 ? (
              <Typography color='text.secondary'>{i18n.t('microfrontend.ai_ops_panel.k19')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {anomalies.slice(0, 5).map((a) => (
                  <Paper
                    key={a.id}
                    variant='outlined'
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          <Chip
                            label={a.severity}
                            size='small'
                            sx={{ bgcolor: getSeverityColor(a.severity), color: 'common.white' }}
                          />
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {a.metricName}
                          </Typography>
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {a.moduleId || i18n.t('microfrontend.ai_ops_panel.k20')} · {formatRelativeTime(a.timestamp)}
                        </Typography>
                      </Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 700, color: getSeverityColor(a.severity) }}
                      >
                        {a.value.toFixed(2)}
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('microfrontend.ai_ops_panel.k11')}
            </Typography>
            {scalingHistory.length === 0 ? (
              <Typography color='text.secondary'>{i18n.t('microfrontend.ai_ops_panel.k21')}</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {scalingHistory.slice(0, 5).map((e) => (
                  <Paper
                    key={e.id}
                    variant='outlined'
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
                          {e.direction === 'up' ? (
                            <ArrowUpIcon
                              size={16}
                              color={designTokens.colors.success.dark}
                            />
                          ) : e.direction === 'down' ? (
                            <ArrowDownIcon
                              size={16}
                              color={designTokens.colors.error.dark}
                            />
                          ) : (
                            <MinusIcon size={16} />
                          )}
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {e.moduleId}
                          </Typography>
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {e.fromInstances} → {e.toInstances} {i18n.t('microfrontend.ai_ops_panel.k0')}{' '}
                          {formatRelativeTime(e.startedAt)}
                        </Typography>
                      </Box>
                      <Chip
                        label={e.status === 'completed' ? i18n.t('microfrontend.ai_ops_panel.k22') : e.status}
                        size='small'
                        color={
                          e.status === 'completed'
                            ? 'success'
                            : e.status === 'failed'
                              ? 'error'
                              : 'default'
                        }
                        variant='outlined'
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const renderAnomalyDetection = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k23')}
          value={anomalies.length}
          icon={<ActivityIcon size={24} />}
          color={designTokens.colors.primary.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k24')}
          value={severityCounts.critical + severityCounts.high}
          icon={<AlertIcon size={24} />}
          color={designTokens.colors.error.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k25')}
          value={anomalies.filter((a) => a.acknowledged).length}
          icon={<CheckCircleIcon size={24} />}
          color={designTokens.colors.success.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k26')}
          value={baselines.length}
          icon={<GaugeIcon size={24} />}
          color={designTokens.colors.purple['700']}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ flex: '2 1 600px', minWidth: 0 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k12')}
              </Typography>
              <FormControl
                size='small'
                sx={{ minWidth: 150 }}
              >
                <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k27')}</InputLabel>
                <Select
                  value={selectedModule || ''}
                  onChange={(e) => setSelectedModule(e.target.value || null)}
                  label={i18n.t('microfrontend.ai_ops_panel.k28')}
                >
                  <MenuItem value=''>{i18n.t('microfrontend.ai_ops_panel.k29')}</MenuItem>
                  {registeredModules.map((m) => (
                    <MenuItem
                      key={m.id}
                      value={m.id}
                    >
                      {m.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k30')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k31')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k32')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k13')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k33')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k34')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k35')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k36')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {anomalies
                    .filter((a) => !selectedModule || a.moduleId === selectedModule)
                    .slice(0, 20)
                    .map((a) => (
                      <TableRow
                        key={a.id}
                        hover
                      >
                        <TableCell>
                          <Chip
                            label={a.severity}
                            size='small'
                            sx={{ bgcolor: getSeverityColor(a.severity), color: 'common.white' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {a.metricName}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {a.moduleId || '-'}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{a.value.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={a.detectionMethod}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          {a.resolved ? (
                            <Chip
                              icon={<CheckCircleIcon size={14} />}
                              label={i18n.t('microfrontend.ai_ops_panel.k37')}
                              size='small'
                              color='success'
                              variant='outlined'
                            />
                          ) : a.acknowledged ? (
                            <Chip
                              label={i18n.t('microfrontend.ai_ops_panel.k38')}
                              size='small'
                              color='warning'
                              variant='outlined'
                            />
                          ) : (
                            <Chip
                              label={i18n.t('microfrontend.ai_ops_panel.k39')}
                              size='small'
                              color='error'
                              variant='outlined'
                            />
                          )}
                        </TableCell>
                        <TableCell>{formatRelativeTime(a.timestamp)}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {!a.acknowledged && (
                              <Button
                                size='small'
                                variant='outlined'
                                onClick={() => {
                                  anomalyDetector.acknowledgeAnomaly(a.id);
                                  refreshData();
                                }}
                              >
                                {i18n.t('microfrontend.ai_ops_panel.k14')}
                              </Button>
                            )}
                            {!a.resolved && (
                              <Button
                                size='small'
                                variant='contained'
                                onClick={() => {
                                  anomalyDetector.resolveAnomaly(a.id);
                                  refreshData();
                                }}
                              >
                                {i18n.t('microfrontend.ai_ops_panel.k15')}
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  {anomalies.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        align='center'
                      >
                        <Typography
                          color='text.secondary'
                          sx={{ py: 3 }}
                        >
                          {i18n.t('microfrontend.ai_ops_panel.k16')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        <Box
          sx={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k17')}
              </Typography>
              {baselines.slice(0, 8).map((b) => (
                <Box
                  key={`${b.moduleId || 'global'}-${b.metricName}`}
                  sx={{ mb: 2 }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {b.metricName}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {b.moduleId || i18n.t('microfrontend.ai_ops_panel.k40')}
                    </Typography>
                  </Box>
                  <Paper
                    variant='outlined'
                    sx={{ p: 1.5 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        mb: 0.5,
                      }}
                    >
                      <span>{i18n.t('microfrontend.ai_ops_panel.k0')}</span>
                      <span>P95: {b.p95.toFixed(2)}</span>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={50}
                      sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }}
                    />
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: 'text.secondary',
                        mt: 0.5,
                      }}
                    >
                      <span>{b.min.toFixed(0)}</span>
                      <span>{b.max.toFixed(0)}</span>
                    </Box>
                  </Paper>
                </Box>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k18')}
              </Typography>
              {moduleAnomalies.length === 0 ? (
                <Typography color='text.secondary'>{i18n.t('microfrontend.ai_ops_panel.k41')}</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {moduleAnomalies.slice(0, 10).map(([moduleId, count]) => {
                    const max = moduleAnomalies[0]?.[1] || 1;
                    return (
                      <Box key={moduleId}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography
                            variant='body2'
                            sx={{ fontFamily: 'monospace', fontSize: 12 }}
                          >
                            {moduleId}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {count}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={(count / max) * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );

  const renderSmartAlerting = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k42')}
          value={alertStats?.firing || 0}
          icon={<AlertIcon size={24} />}
          color={designTokens.colors.error.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k43')}
          value={alertRules.length}
          icon={<TargetIcon size={24} />}
          color={designTokens.colors.primary.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k44')}
          value={alertStats?.last24h || 0}
          icon={<ClockIcon size={24} />}
          color='colors.orange.700'
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k45')}
          value={
            alertStats?.total
              ? `${((alertStats.resolved / alertStats.total) * 100).toFixed(1)}%`
              : '0%'
          }
          icon={<CheckCircleIcon size={24} />}
          color={designTokens.colors.success.dark}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ flex: '2 1 600px', minWidth: 0 }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k19')}
              </Typography>
            </Box>
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k46')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k47')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k48')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k49')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k50')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k20')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k51')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k52')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k53')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.slice(0, 20).map((alert) => (
                    <TableRow
                      key={alert.id}
                      hover
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{alert.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          size='small'
                          sx={{ bgcolor: getSeverityColor(alert.severity), color: 'common.white' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alert.status}
                          size='small'
                          sx={{ bgcolor: getAlertStatusColor(alert.status), color: 'common.white' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {alert.metricName}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {alert.moduleId || '-'}
                      </TableCell>
                      <TableCell>{alert.value.toFixed(2)}</TableCell>
                      <TableCell>{alert.count}</TableCell>
                      <TableCell>{formatRelativeTime(alert.startedAt)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {alert.status === 'firing' && (
                            <Button
                              size='small'
                              variant='outlined'
                              onClick={() => {
                                smartAlertManager.acknowledgeAlert(alert.id);
                                refreshData();
                              }}
                            >
                              {i18n.t('microfrontend.ai_ops_panel.k21')}
                            </Button>
                          )}
                          {alert.status !== 'resolved' && (
                            <Button
                              size='small'
                              variant='contained'
                              onClick={() => {
                                smartAlertManager.resolveAlert(alert.id);
                                refreshData();
                              }}
                            >
                              {i18n.t('microfrontend.ai_ops_panel.k22')}
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {alerts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        align='center'
                      >
                        <Typography
                          color='text.secondary'
                          sx={{ py: 3 }}
                        >
                          {i18n.t('microfrontend.ai_ops_panel.k23')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
        <Box
          sx={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k24')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<PlusIcon size={16} />}
                  onClick={() => setShowAddRuleDialog(true)}
                  variant='contained'
                >
                  {i18n.t('microfrontend.ai_ops_panel.k25')}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {alertRules.map((rule) => (
                  <Paper
                    key={rule.id}
                    variant='outlined'
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            mb: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {rule.name}
                          </Typography>
                          <Chip
                            label={rule.severity}
                            size='small'
                            sx={{
                              bgcolor: getSeverityColor(rule.severity),
                              color: 'common.white',
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {rule.condition.metricName} {rule.condition.operator}{' '}
                          {rule.condition.threshold}
                        </Typography>
                      </Box>
                      <Switch
                        size='small'
                        checked={rule.enabled}
                        onChange={() => {
                          smartAlertManager.updateRule(rule.id, { enabled: !rule.enabled });
                          refreshData();
                        }}
                      />
                    </Box>
                  </Paper>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k26')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    {i18n.t('microfrontend.ai_ops_panel.24_1')} {alertStats?.last24h || 0} {i18n.t('microfrontend.ai_ops_panel.k2')}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={Math.min((alertStats?.last24h || 0) * 5, 100)}
                    color='error'
                  />
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 0.5 }}
                  >
                    {i18n.t('microfrontend.ai_ops_panel.1_3')} {alertStats?.last1h || 0} {i18n.t('microfrontend.ai_ops_panel.k4')}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={Math.min((alertStats?.last1h || 0) * 20, 100)}
                    color='warning'
                  />
                </Box>
                <Divider />
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k27')}
                </Typography>
                {(['critical', 'high', 'medium', 'low'] as const).map((sev) => (
                  <Box
                    key={sev}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: getSeverityColor(sev),
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{ flex: 1 }}
                    >
                      {sev === 'critical'
                        ? i18n.t('microfrontend.ai_ops_panel.k54')
                        : sev === 'high'
                          ? i18n.t('microfrontend.ai_ops_panel.k55')
                          : sev === 'medium'
                            ? i18n.t('microfrontend.ai_ops_panel.k56')
                            : i18n.t('microfrontend.ai_ops_panel.k57')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {alertStats?.bySeverity?.[sev] || 0}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog
        open={showAddRuleDialog}
        onClose={() => setShowAddRuleDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {i18n.t('microfrontend.ai_ops_panel.k28')}
            <IconButton
              size='small'
              onClick={() => setShowAddRuleDialog(false)}
            >
              <XIcon size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={i18n.t('microfrontend.ai_ops_panel.k58')}
              fullWidth
              size='small'
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl
                fullWidth
                size='small'
                sx={{ flex: '1 1 150px' }}
              >
                <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k59')}</InputLabel>
                <Select
                  value={newRuleMetric}
                  label={i18n.t('microfrontend.ai_ops_panel.k60')}
                  onChange={(e) => setNewRuleMetric(e.target.value)}
                >
                  <MenuItem value='cpuUsage'>{i18n.t('microfrontend.ai_ops_panel.pu_1')}</MenuItem>
                  <MenuItem value='memoryUsage'>{i18n.t('microfrontend.ai_ops_panel.k61')}</MenuItem>
                  <MenuItem value='responseTime'>{i18n.t('microfrontend.ai_ops_panel.k62')}</MenuItem>
                  <MenuItem value='errorRate'>{i18n.t('microfrontend.ai_ops_panel.k63')}</MenuItem>
                  <MenuItem value='requestRate'>{i18n.t('microfrontend.ai_ops_panel.k64')}</MenuItem>
                  <MenuItem value='totalLoadTime'>{i18n.t('microfrontend.ai_ops_panel.k65')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl
                fullWidth
                size='small'
                sx={{ flex: '1 1 150px' }}
              >
                <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k66')}</InputLabel>
                <Select
                  value={newRuleOperator}
                  label={i18n.t('microfrontend.ai_ops_panel.k67')}
                  onChange={(e) =>
                    setNewRuleOperator(e.target.value as 'gt' | 'gte' | 'lt' | 'lte')
                  }
                >
                  <MenuItem value='gt'>{i18n.t('microfrontend.ai_ops_panel.gt_68')}</MenuItem>
                  <MenuItem value='gte'>{i18n.t('microfrontend.ai_ops_panel.gte_69')}</MenuItem>
                  <MenuItem value='lt'>{i18n.t('microfrontend.ai_ops_panel.lt_70')}</MenuItem>
                  <MenuItem value='lte'>{i18n.t('microfrontend.ai_ops_panel.lte_71')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <TextField
              label={i18n.t('microfrontend.ai_ops_panel.k72')}
              type='number'
              fullWidth
              size='small'
              value={newRuleThreshold}
              onChange={(e) => setNewRuleThreshold(Number(e.target.value))}
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl
                fullWidth
                size='small'
                sx={{ flex: '1 1 150px' }}
              >
                <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k73')}</InputLabel>
                <Select
                  value={newRuleSeverity}
                  label={i18n.t('microfrontend.ai_ops_panel.k74')}
                  onChange={(e) =>
                    setNewRuleSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')
                  }
                >
                  <MenuItem value='critical'>{i18n.t('microfrontend.ai_ops_panel.k75')}</MenuItem>
                  <MenuItem value='high'>{i18n.t('microfrontend.ai_ops_panel.k29')}</MenuItem>
                  <MenuItem value='medium'>{i18n.t('microfrontend.ai_ops_panel.k30')}</MenuItem>
                  <MenuItem value='low'>{i18n.t('microfrontend.ai_ops_panel.k31')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t('microfrontend.ai_ops_panel.k76')}
                type='number'
                fullWidth
                size='small'
                value={newRuleCooldown}
                onChange={(e) => setNewRuleCooldown(Number(e.target.value))}
                sx={{ flex: '1 1 150px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddRuleDialog(false)}>{i18n.t('microfrontend.ai_ops_panel.k77')}</Button>
          <Button
            variant='contained'
            onClick={() => {
              smartAlertManager.addRule({
                name: newRuleName || i18n.t('microfrontend.ai_ops_panel.k78'),
                condition: {
                  metricName: newRuleMetric,
                  operator: newRuleOperator,
                  threshold: newRuleThreshold,
                },
                severity: newRuleSeverity,
                enabled: true,
                cooldown: newRuleCooldown * 1000,
              });
              setShowAddRuleDialog(false);
              refreshData();
            }}
          >
            {i18n.t('microfrontend.ai_ops_panel.k32')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderPrediction = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k79')}
          value={predictedAnomalies.length}
          icon={<TrendingUpIcon size={24} />}
          color={designTokens.colors.purple['700']}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k80')}
          value={
            predictedAnomalies.filter((a) => a.severity === 'critical' || a.severity === 'high')
              .length
          }
          icon={<AlertIcon size={24} />}
          color={designTokens.colors.error.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k81')}
          value='87.5%'
          icon={<TargetIcon size={24} />}
          color={designTokens.colors.success.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k82')}
          value={baselines.length}
          icon={<ZapIcon size={24} />}
          color={designTokens.colors.teal['700']}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ flex: '2 1 600px', minWidth: 0 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k5')} {selectedPredMetric}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <FormControl
                  size='small'
                  sx={{ minWidth: 150 }}
                >
                  <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k83')}</InputLabel>
                  <Select
                    value={selectedPredMetric}
                    label={i18n.t('microfrontend.ai_ops_panel.k84')}
                    onChange={(e) => setSelectedPredMetric(e.target.value)}
                  >
                    <MenuItem value='cpuUsage'>{i18n.t('microfrontend.ai_ops_panel.pu_2')}</MenuItem>
                    <MenuItem value='memoryUsage'>{i18n.t('microfrontend.ai_ops_panel.k85')}</MenuItem>
                    <MenuItem value='responseTime'>{i18n.t('microfrontend.ai_ops_panel.k86')}</MenuItem>
                    <MenuItem value='errorRate'>{i18n.t('microfrontend.ai_ops_panel.k87')}</MenuItem>
                    <MenuItem value='totalLoadTime'>{i18n.t('microfrontend.ai_ops_panel.k88')}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl
                  size='small'
                  sx={{ minWidth: 150 }}
                >
                  <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k89')}</InputLabel>
                  <Select
                    value={selectedPredModule || ''}
                    label={i18n.t('microfrontend.ai_ops_panel.k90')}
                    onChange={(e) => setSelectedPredModule(e.target.value || null)}
                  >
                    <MenuItem value=''>{i18n.t('microfrontend.ai_ops_panel.k91')}</MenuItem>
                    {registeredModules.map((m) => (
                      <MenuItem
                        key={m.id}
                        value={m.id}
                      >
                        {m.id}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Paper
              variant='outlined'
              sx={{ p: 2, height: 300, position: 'relative' }}
            >
              {!predictionHistory || predictionHistory.values.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                  }}
                >
                  <Typography color='text.secondary'>{i18n.t('microfrontend.ai_ops_panel.k92')}</Typography>
                </Box>
              ) : (
                <svg
                  width='100%'
                  height='100%'
                  viewBox='0 0 100 100'
                  preserveAspectRatio='none'
                >
                  <polyline
                    fill='none'
                    stroke={designTokens.colors.primary.dark}
                    strokeWidth='1.5'
                    points={predictionHistory.values
                      .map((v, i) => {
                        const x = (i / (allPredValues.length - 1 || 1)) * 100;
                        const y = 100 - ((v - minPredVal) / (maxPredVal - minPredVal || 1)) * 100;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {predictionResult && (
                    <polyline
                      fill='none'
                      stroke={designTokens.colors.purple['700']}
                      strokeWidth='1.5'
                      strokeDasharray='4 2'
                      points={(() => {
                        const histLen = predictionHistory.values.length;
                        const points = [
                          `${((histLen - 1) / (allPredValues.length - 1 || 1)) * 100},${100 - ((predictionHistory.values[histLen - 1] - minPredVal) / (maxPredVal - minPredVal || 1)) * 100}`,
                        ];
                        predictionResult.predictions.forEach((p, i) => {
                          const x = ((histLen + i) / (allPredValues.length - 1 || 1)) * 100;
                          const y =
                            100 - ((p.value - minPredVal) / (maxPredVal - minPredVal || 1)) * 100;
                          points.push(`${x},${y}`);
                        });
                        return points.join(' ');
                      })()}
                    />
                  )}
                </svg>
              )}

              <Box sx={{ position: 'absolute', bottom: 8, left: 16, display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 16, height: 2, bgcolor: 'info.600' }} />
                  <Typography variant='caption'>{i18n.t('microfrontend.ai_ops_panel.k93')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{ width: 16, height: 2, bgcolor: 'purple.800', borderStyle: 'dashed' }}
                  />
                  <Typography variant='caption'>{i18n.t('microfrontend.ai_ops_panel.k94')}</Typography>
                </Box>
              </Box>
            </Paper>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('microfrontend.ai_ops_panel.k33')}
            </Typography>
            {predictedAnomalies.length === 0 ? (
              <Typography color='text.secondary'>{i18n.t('microfrontend.ai_ops_panel.k95')}</Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 340,
                  overflow: 'auto',
                }}
              >
                {predictedAnomalies.slice(0, 10).map((a) => (
                  <Paper
                    key={a.id}
                    variant='outlined'
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            mb: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Chip
                            label={a.severity}
                            size='small'
                            sx={{
                              bgcolor: getSeverityColor(a.severity),
                              color: 'common.white',
                              fontSize: 10,
                              height: 20,
                            }}
                          />
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {a.metricName}
                          </Typography>
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {a.moduleId || i18n.t('microfrontend.ai_ops_panel.k96')}
                        </Typography>
                        <Box
                          component='span'
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          <Typography variant='caption'>
                            [i18n.t('microfrontend.ai_ops_panel.k34')]: {formatRelativeTime(a.expectedTime)}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 700, color: getSeverityColor(a.severity) }}
                        >
                          {a.predictedValue.toFixed(2)}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {i18n.t('microfrontend.ai_ops_panel.k6')} {(a.probability * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  const renderAutoScaling = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k97')}
          value={totalRunning}
          icon={<LayersIcon size={24} />}
          color={designTokens.colors.success.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k98')}
          value={`${enabledPolicies}/${totalPolicies}`}
          icon={<TargetIcon size={24} />}
          color={designTokens.colors.primary.dark}
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k99')}
          value={scalingHistory.filter((e) => e.direction === 'up').length}
          icon={<ArrowUpIcon size={24} />}
          color='colors.orange.700'
        />
        <StatCard
          label={i18n.t('microfrontend.ai_ops_panel.k100')}
          value={scalingHistory.filter((e) => e.direction === 'down').length}
          icon={<ArrowDownIcon size={24} />}
          color={designTokens.colors.teal['700']}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Card sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k35')}
              </Typography>
              <FormControl
                size='small'
                sx={{ minWidth: 180 }}
              >
                <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k101')}</InputLabel>
                <Select
                  value={selectedScaleModule || ''}
                  label={i18n.t('microfrontend.ai_ops_panel.k102')}
                  onChange={(e) => setSelectedScaleModule(e.target.value || null)}
                >
                  <MenuItem value=''>{i18n.t('microfrontend.ai_ops_panel.k103')}</MenuItem>
                  {Object.keys(instances).map((moduleId) => (
                    <MenuItem
                      key={moduleId}
                      value={moduleId}
                    >
                      {moduleId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {moduleInstances.slice(0, 20).map((inst) => (
                <Paper
                  key={inst.id}
                  variant='outlined'
                  sx={{ p: 2 }}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                        >
                          {inst.moduleId} #{inst.instanceNumber}
                        </Typography>
                        <Chip
                          label={inst.status === 'running' ? i18n.t('microfrontend.ai_ops_panel.k104') : inst.status}
                          size='small'
                          color={
                            inst.status === 'running'
                              ? 'success'
                              : inst.status === 'starting'
                                ? 'warning'
                                : inst.status === 'error'
                                  ? 'error'
                                  : 'default'
                          }
                          variant='outlined'
                        />
                      </Box>
                      <Box
                        component='span'
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          [i18n.t('microfrontend.ai_ops_panel.k36')]: {formatRelativeTime(inst.startedAt || inst.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
              {moduleInstances.length === 0 && (
                <Typography
                  color='text.secondary'
                  sx={{ py: 3, textAlign: 'center' }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k37')}
                </Typography>
              )}
            </Box>

            {selectedScaleModule && (
              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant='contained'
                  startIcon={<ArrowUpIcon size={16} />}
                  onClick={() => {
                    const current = moduleInstances.filter((i) => i.status === 'running').length;
                    autoScaler.scale(selectedScaleModule!, current + 1, i18n.t('microfrontend.ai_ops_panel.k105'));
                    refreshData();
                  }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k38')}
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<ArrowDownIcon size={16} />}
                  onClick={() => {
                    const current = moduleInstances.filter((i) => i.status === 'running').length;
                    autoScaler.scale(selectedScaleModule!, Math.max(1, current - 1), i18n.t('microfrontend.ai_ops_panel.k106'));
                    refreshData();
                  }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k39')}
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<MinusIcon size={16} />}
                  onClick={() => {
                    autoScaler.scaleDownToMin(selectedScaleModule!);
                    refreshData();
                  }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k40')}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
        <Box
          sx={{ flex: '1 1 400px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k41')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<PlusIcon size={16} />}
                  variant='contained'
                  onClick={() => setShowAddPolicyDialog(true)}
                >
                  {i18n.t('microfrontend.ai_ops_panel.k42')}
                </Button>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {modulePolicies.map((policy) => (
                  <Paper
                    key={policy.id}
                    variant='outlined'
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'center',
                            mb: 0.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {policy.name}
                          </Typography>
                          <Switch
                            size='small'
                            checked={policy.enabled}
                            onChange={() => {
                              autoScaler.updatePolicy(policy.id, { enabled: !policy.enabled });
                              refreshData();
                            }}
                          />
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {policy.minInstances} - {policy.maxInstances} {i18n.t('microfrontend.ai_ops_panel.k7')}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          {policy.metrics.slice(0, 2).map((m) => (
                            <Chip
                              key={m.name}
                              label={`${m.name}: ${m.scaleUpThreshold}%`}
                              size='small'
                              variant='outlined'
                            />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                ))}
                {modulePolicies.length === 0 && (
                  <Typography
                    color='text.secondary'
                    sx={{ py: 3, textAlign: 'center' }}
                  >
                    {i18n.t('microfrontend.ai_ops_panel.k43')}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.ai_ops_panel.k44')}
              </Typography>
              <TableContainer
                component={Paper}
                variant='outlined'
                sx={{ maxHeight: 250 }}
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k107')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k108')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k109')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k110')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.ai_ops_panel.k111')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {moduleScalingHistory.slice(0, 15).map((e) => (
                      <TableRow
                        key={e.id}
                        hover
                      >
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {e.moduleId}
                        </TableCell>
                        <TableCell>
                          {e.direction === 'up' ? (
                            <Chip
                              icon={<ArrowUpIcon size={14} />}
                              label={i18n.t('microfrontend.ai_ops_panel.k112')}
                              size='small'
                              color='success'
                              variant='outlined'
                            />
                          ) : e.direction === 'down' ? (
                            <Chip
                              icon={<ArrowDownIcon size={14} />}
                              label={i18n.t('microfrontend.ai_ops_panel.k113')}
                              size='small'
                              color='error'
                              variant='outlined'
                            />
                          ) : (
                            <Chip
                              label={i18n.t('microfrontend.ai_ops_panel.k114')}
                              size='small'
                              variant='outlined'
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {e.fromInstances} → {e.toInstances}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={e.status === 'completed' ? i18n.t('microfrontend.ai_ops_panel.k115') : e.status}
                            size='small'
                            color={
                              e.status === 'completed'
                                ? 'success'
                                : e.status === 'failed'
                                  ? 'error'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{formatRelativeTime(e.startedAt)}</TableCell>
                      </TableRow>
                    ))}
                    {moduleScalingHistory.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align='center'
                        >
                          <Typography
                            color='text.secondary'
                            sx={{ py: 3 }}
                          >
                            {i18n.t('microfrontend.ai_ops_panel.k45')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog
        open={showAddPolicyDialog}
        onClose={() => setShowAddPolicyDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {i18n.t('microfrontend.ai_ops_panel.k46')}
            <IconButton
              size='small'
              onClick={() => setShowAddPolicyDialog(false)}
            >
              <XIcon size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={i18n.t('microfrontend.ai_ops_panel.k116')}
              fullWidth
              size='small'
              value={newPolicyName}
              onChange={(e) => setNewPolicyName(e.target.value)}
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>{i18n.t('microfrontend.ai_ops_panel.k117')}</InputLabel>
              <Select
                value={selectedScaleModule || ''}
                label={i18n.t('microfrontend.ai_ops_panel.k118')}
                onChange={(e) => setSelectedScaleModule(e.target.value || null)}
              >
                {registeredModules.map((m) => (
                  <MenuItem
                    key={m.id}
                    value={m.id}
                  >
                    {m.id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label={i18n.t('microfrontend.ai_ops_panel.k119')}
                type='number'
                fullWidth
                size='small'
                value={newPolicyMin}
                onChange={(e) => setNewPolicyMin(Number(e.target.value))}
                sx={{ flex: '1 1 150px' }}
              />
              <TextField
                label={i18n.t('microfrontend.ai_ops_panel.k120')}
                type='number'
                fullWidth
                size='small'
                value={newPolicyMax}
                onChange={(e) => setNewPolicyMax(Number(e.target.value))}
                sx={{ flex: '1 1 150px' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                label={i18n.t('microfrontend.ai_ops_panel.cpu_47')}
                type='number'
                fullWidth
                size='small'
                value={newPolicyCpuUp}
                onChange={(e) => setNewPolicyCpuUp(Number(e.target.value))}
                sx={{ flex: '1 1 150px' }}
              />
              <TextField
                label={i18n.t('microfrontend.ai_ops_panel.cpu_48')}
                type='number'
                fullWidth
                size='small'
                value={newPolicyCpuDown}
                onChange={(e) => setNewPolicyCpuDown(Number(e.target.value))}
                sx={{ flex: '1 1 150px' }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddPolicyDialog(false)}>{i18n.t('microfrontend.ai_ops_panel.k121')}</Button>
          <Button
            variant='contained'
            onClick={() => {
              if (selectedScaleModule) {
                autoScaler.registerPolicy({
                  moduleId: selectedScaleModule,
                  name: newPolicyName || i18n.t('microfrontend.ai_ops_panel.k122'),
                  enabled: true,
                  minInstances: newPolicyMin,
                  maxInstances: newPolicyMax,
                  scaleUpIncrement: 1,
                  scaleDownIncrement: 1,
                  scaleUpCooldown: 60000,
                  scaleDownCooldown: 300000,
                  metrics: [
                    {
                      name: 'cpuUsage',
                      scaleUpThreshold: newPolicyCpuUp,
                      scaleDownThreshold: newPolicyCpuDown,
                      weight: 1,
                    },
                  ],
                  scaleUpStrategy: 'any',
                  scaleDownStrategy: 'all',
                });
                setShowAddPolicyDialog(false);
                refreshData();
              }
            }}
          >
            {i18n.t('microfrontend.ai_ops_panel.k49')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: `linear-gradient(135deg, ${designTokens.colors.purple['700']} 0%, ${designTokens.colors.primary.dark} 100%)`,
          color: 'common.white',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BrainIcon size={24} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 700 }}
          >
            {i18n.t('microfrontend.ai_ops_panel.ai_50')}
          </Typography>
          <Chip
            label='V43.0'
            size='small'
            sx={{ bgcolor: 'action.disabledBackground', color: 'common.white' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tooltip title={autoRefresh ? i18n.t('microfrontend.ai_ops_panel.k124') : i18n.t('microfrontend.ai_ops_panel.k123')}>
            <Button
              size='small'
              onClick={() => setAutoRefresh(!autoRefresh)}
              startIcon={autoRefresh ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
              sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
              variant={autoRefresh ? 'contained' : 'outlined'}
            >
              {autoRefresh ? i18n.t('microfrontend.ai_ops_panel.k126') : i18n.t('microfrontend.ai_ops_panel.k125')}
            </Button>
          </Tooltip>
          <Button
            size='small'
            onClick={refreshData}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.ai_ops_panel.k51')}
          </Button>
          <Button
            size='small'
            onClick={handleExport}
            startIcon={<DownloadIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.ai_ops_panel.k52')}
          </Button>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab
          label={i18n.t('microfrontend.ai_ops_panel.k127')}
          value='overview'
          icon={<ActivityIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.ai_ops_panel.k128')}
          value='anomaly'
          icon={<ZapIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.ai_ops_panel.k129')}
          value='alert'
          icon={<AlertIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.ai_ops_panel.k130')}
          value='prediction'
          icon={<TrendingUpIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.ai_ops_panel.k131')}
          value='autoscale'
          icon={<LayersIcon size={16} />}
          iconPosition='start'
        />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'anomaly' && renderAnomalyDetection()}
        {activeTab === 'alert' && renderSmartAlerting()}
        {activeTab === 'prediction' && renderPrediction()}
        {activeTab === 'autoscale' && renderAutoScaling()}
      </Box>
    </Box>
  );
};

export default AIOpsPanel;
