import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Alert,
  LinearProgress,
  Badge,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  X as XIcon,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  FileText,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  Lock,
  Scale,
  Target,
  BarChart3,
  Search,
  Bell,
  BellOff,
  Filter,
  Download,
  Plus,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { V51Card } from '../design-system/components';
import {
  complianceAutomator,
  type ComplianceCheck,
  type ComplianceReport,
  type Regulation,
  type Severity,
} from './compliance-automation';
import {
  riskAlerter,
  type RiskAlert,
  type RiskIndicator,
  type RiskScore,
  type RiskCategory,
  type RiskLevel,
} from './risk-alerting';
import {
  policyEnforcer,
  type Policy,
  type PolicyDecision,
  type EnforcementMode,
  type PolicyStatus,
} from './policy-enforcement';

type TabId = 'compliance' | 'risk' | 'policy' | 'audit';

const REGULATION_COLORS: Record<Regulation, string> = {
  GDPR: '#3b82f6',
  SOX: '#f59e0b',
  HIPAA: '#ef4444',
  PCI: '#8b5cf6',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
};

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
};

const CATEGORY_COLORS: Record<RiskCategory, string> = {
  Security: '#dc2626',
  Compliance: '#f59e0b',
  Performance: '#3b82f6',
  Financial: '#10b981',
};

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  Security: '安全',
  Compliance: '合规',
  Performance: '性能',
  Financial: '财务',
};

const LEVEL_LABELS: Record<RiskLevel, string> = {
  critical: '严重',
  high: '高危',
  medium: '中等',
  low: '低',
};

export const V57GovernancePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('compliance');
  const [compliance_checks, setComplianceChecks] = React.useState<ComplianceCheck[]>([]);
  const [compliance_status, setComplianceStatus] = React.useState<ReturnType<
    typeof complianceAutomator.get_compliance_status
  > | null>(null);
  const [compliance_report, setComplianceReport] = React.useState<ComplianceReport | null>(null);

  const [alerts, setAlerts] = React.useState<RiskAlert[]>([]);
  const [risk_score, setRiskScore] = React.useState<RiskScore | null>(null);
  const [indicators, setIndicators] = React.useState<RiskIndicator[]>([]);

  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [decisions, setDecisions] = React.useState<PolicyDecision[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = React.useState<string | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = React.useState(false);
  const [newPolicy, setNewPolicy] = React.useState<Partial<Policy>>({
    name: '',
    scope: 'global',
    enforcement_mode: 'enforce',
    status: 'draft',
    description: '',
    tags: [],
    rules: [],
  });

  const [audit_log, setAuditLog] = React.useState<PolicyDecision[]>([]);
  const [audit_filter, setAuditFilter] = React.useState<string>('all');

  const [isLoading, setIsLoading] = React.useState(false);

  const run_full_assessment = () => {
    setIsLoading(true);

    setTimeout(() => {
      const checks = complianceAutomator.run_compliance_checks();
      setComplianceChecks(checks);
      setComplianceStatus(complianceAutomator.get_compliance_status());
      setComplianceReport(complianceAutomator.generate_report());

      const newAlerts = riskAlerter.evaluate_risks();
      setAlerts(riskAlerter.get_alerts({ status: 'all' }));
      setRiskScore(riskAlerter.get_risk_score());
      setIndicators(riskAlerter.get_indicators());

      const active_policies = policyEnforcer.get_policies({ status: 'active' });
      setPolicies(active_policies);
      setAuditLog(policyEnforcer.get_audit_log({ limit: 50 }));

      setIsLoading(false);
    }, 300);
  };

  React.useEffect(() => {
    run_full_assessment();
  }, []);

  const handle_acknowledge = (alertId: string) => {
    riskAlerter.acknowledge_alert(alertId, 'admin');
    setAlerts(riskAlerter.get_alerts({ status: 'all' }));
    setRiskScore(riskAlerter.get_risk_score());
  };

  const handle_resolve = (alertId: string) => {
    riskAlerter.resolve_alert(alertId, 'admin');
    setAlerts(riskAlerter.get_alerts({ status: 'all' }));
    setRiskScore(riskAlerter.get_risk_score());
  };

  const handle_evaluate_policy = () => {
    const mock_context = {
      user: { role: 'manager', clearance: 3, has_consent: true, id: 'user-001' },
      data: { classification: 'confidential', type: 'personal' },
      action: { type: 'read' },
      transaction: { approver: 'manager', requester: 'user-001', amount: 5000 },
      project: { budget_remaining: 500000 },
      output: { harm_score: 0.15, bias_score: 0.2, contains_pii: false },
    };

    const result = policyEnforcer.enforce_policy(mock_context);
    setDecisions(result.decisions);
    setAuditLog(policyEnforcer.get_audit_log({ limit: 50 }));
  };

  const handle_create_policy = () => {
    if (!newPolicy.name) return;
    const policy = policyEnforcer.create_policy({
      name: newPolicy.name,
      scope: newPolicy.scope || 'global',
      scope_target: 'custom',
      rules: newPolicy.rules || [],
      enforcement_mode: newPolicy.enforcement_mode || 'enforce',
      status: newPolicy.status || 'draft',
      description: newPolicy.description || '',
      tags: newPolicy.tags || [],
    });
    setPolicies(policyEnforcer.get_policies());
    setPolicyDialogOpen(false);
    setNewPolicy({
      name: '',
      scope: 'global',
      enforcement_mode: 'enforce',
      status: 'draft',
      description: '',
      tags: [],
      rules: [],
    });
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1500,
          height: '94vh',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V57PanelHeader onClose={onClose} />

        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Shield size={16} />}
              iconPosition='start'
              label='合规仪表盘'
              value='compliance'
            />
            <Tab
              icon={<AlertTriangle size={16} />}
              iconPosition='start'
              label={`风险预警${alerts.some((a) => !a.resolved) ? ` (${alerts.filter((a) => !a.resolved).length})` : ''}`}
              value='risk'
            />
            <Tab
              icon={<Scale size={16} />}
              iconPosition='start'
              label={`策略管理${policies.length > 0 ? ` (${policies.length})` : ''}`}
              value='policy'
            />
            <Tab
              icon={<FileText size={16} />}
              iconPosition='start'
              label={`审计追踪${audit_log.length > 0 ? ` (${audit_log.length})` : ''}`}
              value='audit'
            />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {isLoading && (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <Stack
                direction='row'
                spacing={2}
                sx={{ alignItems: 'center' }}
              >
                <Sparkles
                  size={20}
                  className='animate-pulse'
                />
                <Typography>AI 治理分析中...</Typography>
              </Stack>
            </Box>
          )}

          {!isLoading && activeTab === 'compliance' && (
            <ComplianceTab
              checks={compliance_checks}
              status={compliance_status}
              report={compliance_report}
              onReRun={run_full_assessment}
            />
          )}

          {!isLoading && activeTab === 'risk' && (
            <RiskTab
              alerts={alerts}
              indicators={indicators}
              score={risk_score}
              onAcknowledge={handle_acknowledge}
              onResolve={handle_resolve}
              onReRun={run_full_assessment}
            />
          )}

          {!isLoading && activeTab === 'policy' && (
            <PolicyTab
              policies={policies}
              decisions={decisions}
              selectedPolicyId={selectedPolicyId}
              onSelectPolicy={setSelectedPolicyId}
              onEvaluate={handle_evaluate_policy}
              onCreatePolicy={() => setPolicyDialogOpen(true)}
              onUpdatePolicy={(id, updates) => {
                policyEnforcer.update_policy(id, updates);
                setPolicies(policyEnforcer.get_policies());
              }}
            />
          )}

          {!isLoading && activeTab === 'audit' && (
            <AuditTab
              logs={audit_log}
              filter={audit_filter}
              onFilterChange={setAuditFilter}
            />
          )}
        </Box>
      </Box>

      {policyDialogOpen && (
        <Dialog
          open={policyDialogOpen}
          onClose={() => setPolicyDialogOpen(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>创建新策略</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label='策略名称'
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                fullWidth
                size='small'
              />
              <FormControl size='small'>
                <InputLabel>作用域</InputLabel>
                <Select
                  value={newPolicy.scope}
                  label='作用域'
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, scope: e.target.value as Policy['scope'] })
                  }
                >
                  <MenuItem value='global'>全局</MenuItem>
                  <MenuItem value='module'>模块</MenuItem>
                  <MenuItem value='entity'>实体</MenuItem>
                  <MenuItem value='user'>用户</MenuItem>
                </Select>
              </FormControl>
              <FormControl size='small'>
                <InputLabel>执行模式</InputLabel>
                <Select
                  value={newPolicy.enforcement_mode}
                  label='执行模式'
                  onChange={(e) =>
                    setNewPolicy({
                      ...newPolicy,
                      enforcement_mode: e.target.value as EnforcementMode,
                    })
                  }
                >
                  <MenuItem value='enforce'>强制</MenuItem>
                  <MenuItem value='audit'>审计</MenuItem>
                  <MenuItem value='advisory'>建议</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='描述'
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                fullWidth
                size='small'
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPolicyDialogOpen(false)}>取消</Button>
            <Button
              variant='contained'
              onClick={handle_create_policy}
              disabled={!newPolicy.name}
            >
              创建
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

const V57PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #10b981 0%, #0d9488 50%, #0891b2 100%)',
      color: 'white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Shield size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          V57.0 AI 治理面板
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          合规自动化 · 风险预警 · 策略执行 · 审计追踪
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V57'
        color='secondary'
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: '#fbbf24',
            color: '#1e293b',
            fontWeight: 700,
            fontSize: 10,
          },
        }}
      >
        <Sparkles size={18} />
      </Badge>
      <IconButton
        size='small'
        onClick={onClose}
        sx={{ color: 'white' }}
      >
        <XIcon size={20} />
      </IconButton>
    </Box>
  </Box>
);

const ComplianceTab: React.FC<{
  checks: ComplianceCheck[];
  status: ReturnType<typeof complianceAutomator.get_compliance_status> | null;
  report: ComplianceReport | null;
  onReRun: () => void;
}> = ({ checks, status, report, onReRun }) => {
  const [filter, setFilter] = React.useState<Regulation | 'all'>('all');

  const filtered = React.useMemo(() => {
    if (filter === 'all') return checks;
    return checks.filter((c) => c.regulation === filter);
  }, [checks, filter]);

  if (!status) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity='info'>暂无合规数据，请点击"运行检查"开始分析</Alert>
      </Box>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    if (score >= 50) return '#ea580c';
    return '#dc2626';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Shield size={20} />
          合规自动化仪表盘
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RotateCcw size={14} />}
          onClick={onReRun}
          size='small'
        >
          重新检查
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <ScoreCard
          title='总体合规率'
          score={status.overall_pass_rate}
          color={getScoreColor(status.overall_pass_rate)}
          icon={<Gauge size={24} />}
          subtitle={`${status.total_checks} 项检查`}
        />
        {(['GDPR', 'SOX', 'HIPAA', 'PCI'] as Regulation[]).map((reg) => {
          const regData = status.regulations[reg];
          return (
            <ScoreCard
              key={reg}
              title={reg}
              score={regData.pass_rate}
              color={getScoreColor(regData.pass_rate)}
              icon={<Scale size={24} />}
              subtitle={`${regData.passed}/${regData.total} 通过`}
            />
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <BarChart3 size={16} />
            合规分布
          </Typography>
          <Stack
            direction='column'
            spacing={1.5}
          >
            {(['GDPR', 'SOX', 'HIPAA', 'PCI'] as Regulation[]).map((reg) => {
              const regData = status.regulations[reg];
              return (
                <Box key={reg}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {reg}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: getScoreColor(regData.pass_rate) }}
                    >
                      {regData.pass_rate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={regData.pass_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                  />
                </Box>
              );
            })}
          </Stack>
        </V51Card>

        {report && (
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Target size={16} />
              合规建议
            </Typography>
            <List dense>
              {report.recommendations.map((rec, idx) => (
                <ListItem
                  key={idx}
                  sx={{ px: 0, py: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Sparkles
                          size={14}
                          style={{ color: '#10b981' }}
                        />
                        <Typography
                          variant='body2'
                          sx={{ fontSize: 12 }}
                        >
                          {rec}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </V51Card>
        )}
      </Box>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Chip
          label='全部'
          size='small'
          onClick={() => setFilter('all')}
          sx={{
            bgcolor: filter === 'all' ? '#10b981' : 'grey.100',
            color: filter === 'all' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        {(['GDPR', 'SOX', 'HIPAA', 'PCI'] as Regulation[]).map((reg) => (
          <Chip
            key={reg}
            label={reg}
            size='small'
            onClick={() => setFilter(reg)}
            sx={{
              bgcolor: filter === reg ? REGULATION_COLORS[reg] : 'grey.100',
              color: filter === reg ? 'white' : 'text.secondary',
              fontWeight: 600,
            }}
          />
        ))}
      </Stack>

      <V51Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>规则</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>法规</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>实体</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>证据</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 20).map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    {check.passed ? (
                      <CheckCircle2
                        size={18}
                        color='#10b981'
                      />
                    ) : (
                      <XCircle
                        size={18}
                        color='#dc2626'
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{check.rule_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={check.regulation}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: `${REGULATION_COLORS[check.regulation]}20`,
                        color: REGULATION_COLORS[check.regulation],
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{check.entity}</TableCell>
                  <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 400 }}>
                    {check.evidence}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {filtered.length > 20 && (
          <Typography
            variant='caption'
            sx={{ p: 1, display: 'block', textAlign: 'center', color: 'text.secondary' }}
          >
            仅显示前 20 条，共 {filtered.length} 条记录
          </Typography>
        )}
      </V51Card>
    </Box>
  );
};

const RiskTab: React.FC<{
  alerts: RiskAlert[];
  indicators: RiskIndicator[];
  score: RiskScore | null;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onReRun: () => void;
}> = ({ alerts, indicators, score, onAcknowledge, onResolve, onReRun }) => {
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'active' | 'acknowledged' | 'resolved'
  >('all');
  const [categoryFilter, setCategoryFilter] = React.useState<RiskCategory | 'all'>('all');

  const filteredAlerts = React.useMemo(() => {
    let result = [...alerts];
    if (statusFilter !== 'all') {
      result = result.filter((a) => {
        if (statusFilter === 'active') return !a.acknowledged && !a.resolved;
        if (statusFilter === 'acknowledged') return a.acknowledged && !a.resolved;
        if (statusFilter === 'resolved') return a.resolved;
        return true;
      });
    }
    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    return result.sort((a, b) => b.created_at - a.created_at);
  }, [alerts, statusFilter, categoryFilter]);

  const getTrendIcon = (trend: RiskScore['trend']) => {
    switch (trend) {
      case 'improving':
        return (
          <ArrowDownRight
            size={18}
            color='#10b981'
          />
        );
      case 'deteriorating':
        return (
          <ArrowUpRight
            size={18}
            color='#dc2626'
          />
        );
      default:
        return (
          <Activity
            size={18}
            color='#6b7280'
          />
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 25) return '#10b981';
    if (score <= 50) return '#f59e0b';
    if (score <= 75) return '#ea580c';
    return '#dc2626';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AlertTriangle size={20} />
          风险预警中心
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RotateCcw size={14} />}
          onClick={onReRun}
          size='small'
        >
          重新评估
        </Button>
      </Stack>

      {score && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
          <ScoreCard
            title='总体风险分'
            score={score.overall}
            color={getScoreColor(score.overall)}
            icon={<Gauge size={24} />}
            subtitle={`趋势: ${score.trend === 'improving' ? '改善' : score.trend === 'deteriorating' ? '恶化' : '稳定'}`}
          />
          {(['Security', 'Compliance', 'Performance', 'Financial'] as RiskCategory[]).map((cat) => (
            <ScoreCard
              key={cat}
              title={CATEGORY_LABELS[cat]}
              score={Math.round(score.by_category[cat] * 2.5)}
              color={CATEGORY_COLORS[cat]}
              icon={
                cat === 'Security' ? (
                  <Lock size={24} />
                ) : cat === 'Compliance' ? (
                  <Scale size={24} />
                ) : cat === 'Performance' ? (
                  <Zap size={24} />
                ) : (
                  <TrendingUp size={24} />
                )
              }
              subtitle={`权重分: ${score.by_category[cat]}`}
            />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            风险指标状态
          </Typography>
          <Stack
            direction='column'
            spacing={1.5}
          >
            {indicators.map((ind) => {
              const breached =
                (ind.direction === 'above' && ind.current_value >= ind.threshold) ||
                (ind.direction === 'below' && ind.current_value <= ind.threshold);
              const pct = Math.min(100, (ind.current_value / Math.max(ind.threshold, 1)) * 100);
              return (
                <Box key={ind.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 12, fontWeight: 500 }}
                    >
                      {ind.name}
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Chip
                        label={CATEGORY_LABELS[ind.category]}
                        size='small'
                        sx={{
                          fontSize: 9,
                          height: 16,
                          bgcolor: `${CATEGORY_COLORS[ind.category]}20`,
                          color: CATEGORY_COLORS[ind.category],
                          fontWeight: 600,
                        }}
                      />
                      {breached ? (
                        <AlertTriangle
                          size={14}
                          color={RISK_LEVEL_COLORS[ind.severity]}
                        />
                      ) : (
                        <CheckCircle2
                          size={14}
                          color='#10b981'
                        />
                      )}
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='caption'
                      sx={{ minWidth: 60, color: 'text.secondary' }}
                    >
                      {ind.current_value}
                      {ind.unit}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant='determinate'
                        value={pct}
                        sx={{ height: 4, borderRadius: 2, bgcolor: 'grey.200' }}
                      />
                    </Box>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      阈值: {ind.threshold}
                      {ind.unit}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </V51Card>

        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Bell size={16} />
            预警统计
          </Typography>
          {score && (
            <Stack
              direction='column'
              spacing={2}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                {(['critical', 'high', 'medium', 'low'] as RiskLevel[]).map((lvl) => (
                  <Box
                    key={lvl}
                    sx={{
                      p: 1.5,
                      bgcolor: `${RISK_LEVEL_COLORS[lvl]}10`,
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant='h5'
                      sx={{ fontWeight: 700, color: RISK_LEVEL_COLORS[lvl] }}
                    >
                      {score.by_severity[lvl]}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', fontSize: 11 }}
                    >
                      {LEVEL_LABELS[lvl]}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getTrendIcon(score.trend)}
                <Typography
                  variant='body2'
                  sx={{ fontSize: 12 }}
                >
                  整体趋势:{' '}
                  {score.trend === 'improving'
                    ? '正在改善'
                    : score.trend === 'deteriorating'
                      ? '正在恶化'
                      : '保持稳定'}
                </Typography>
              </Box>
            </Stack>
          )}
        </V51Card>
      </Box>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel sx={{ fontSize: 11 }}>状态</InputLabel>
          <Select
            value={statusFilter}
            label='状态'
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value='all'>全部</MenuItem>
            <MenuItem value='active'>活跃</MenuItem>
            <MenuItem value='acknowledged'>已确认</MenuItem>
            <MenuItem value='resolved'>已解决</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel sx={{ fontSize: 11 }}>分类</InputLabel>
          <Select
            value={categoryFilter}
            label='分类'
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value='all'>全部</MenuItem>
            {(['Security', 'Compliance', 'Performance', 'Financial'] as RiskCategory[]).map(
              (cat) => (
                <MenuItem
                  key={cat}
                  value={cat}
                >
                  {CATEGORY_LABELS[cat]}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
      </Stack>

      {filteredAlerts.length === 0 ? (
        <Alert severity='info'>暂无匹配的预警</Alert>
      ) : (
        <V51Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>严重程度</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>指标</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>消息</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>状态</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Chip
                        label={LEVEL_LABELS[alert.severity]}
                        size='small'
                        sx={{
                          fontSize: 10,
                          height: 20,
                          bgcolor: `${RISK_LEVEL_COLORS[alert.severity]}20`,
                          color: RISK_LEVEL_COLORS[alert.severity],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{alert.indicator_name}</TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 350 }}>{alert.message}</TableCell>
                    <TableCell>
                      {alert.resolved ? (
                        <Chip
                          label='已解决'
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: '#d1fae5',
                            color: '#065f46',
                            fontWeight: 600,
                          }}
                        />
                      ) : alert.acknowledged ? (
                        <Chip
                          label='已确认'
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: '#fef3c7',
                            color: '#92400e',
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Chip
                          label='活跃'
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: '#fef2f2',
                            color: '#991b1b',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction='row'
                        spacing={1}
                      >
                        {!alert.acknowledged && !alert.resolved && (
                          <Button
                            size='small'
                            onClick={() => onAcknowledge(alert.id)}
                            startIcon={<CheckCircle2 size={12} />}
                          >
                            确认
                          </Button>
                        )}
                        {!alert.resolved && (
                          <Button
                            size='small'
                            onClick={() => onResolve(alert.id)}
                            startIcon={<XCircle size={12} />}
                          >
                            解决
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </V51Card>
      )}
    </Box>
  );
};

const PolicyTab: React.FC<{
  policies: Policy[];
  decisions: PolicyDecision[];
  selectedPolicyId: string | null;
  onSelectPolicy: (id: string | null) => void;
  onEvaluate: () => void;
  onCreatePolicy: () => void;
  onUpdatePolicy: (id: string, updates: Partial<Policy>) => void;
}> = ({
  policies,
  decisions,
  selectedPolicyId,
  onSelectPolicy,
  onEvaluate,
  onCreatePolicy,
  onUpdatePolicy,
}) => {
  const selectedPolicy = policies.find((p) => p.id === selectedPolicyId);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Scale size={20} />
          策略管理
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          <Button
            variant='contained'
            startIcon={<Play size={14} />}
            onClick={onEvaluate}
            size='small'
          >
            执行策略
          </Button>
          <Button
            variant='outlined'
            startIcon={<Plus size={14} />}
            onClick={onCreatePolicy}
            size='small'
          >
            新建策略
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 3 }}>
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            策略列表 ({policies.length})
          </Typography>
          {policies.length === 0 ? (
            <Alert
              severity='info'
              sx={{ fontSize: 12 }}
            >
              暂无活动策略
            </Alert>
          ) : (
            <List dense>
              {policies.map((policy) => (
                <ListItem
                  key={policy.id}
                  onClick={() => onSelectPolicy(policy.id)}
                  sx={{
                    cursor: 'pointer',
                    bgcolor: selectedPolicyId === policy.id ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': { bgcolor: 'action.hover' },
                    px: 1.5,
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, fontSize: 13 }}
                      >
                        {policy.name}
                      </Typography>
                    }
                    secondary={
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ mt: 0.5 }}
                      >
                        <Chip
                          label={policy.enforcement_mode}
                          size='small'
                          sx={{ fontSize: 9, height: 16 }}
                          color={
                            policy.enforcement_mode === 'enforce'
                              ? 'error'
                              : policy.enforcement_mode === 'audit'
                                ? 'warning'
                                : 'info'
                          }
                        />
                        <Chip
                          label={`v${policy.version}`}
                          size='small'
                          sx={{ fontSize: 9, height: 16 }}
                        />
                        <Chip
                          label={policy.scope}
                          size='small'
                          sx={{ fontSize: 9, height: 16 }}
                        />
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </V51Card>

        <V51Card>
          {selectedPolicy ? (
            <>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Settings size={16} />
                {selectedPolicy.name}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2, fontSize: 13 }}
              >
                {selectedPolicy.description}
              </Typography>

              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 2, flexWrap: 'wrap', gap: 0.5 }}
              >
                {selectedPolicy.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size='small'
                    sx={{ fontSize: 10, height: 18 }}
                  />
                ))}
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                规则 ({selectedPolicy.rules.length})
              </Typography>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>优先级</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>规则名</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>条件</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>动作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPolicy.rules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>
                          {rule.priority}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{rule.name}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                          {rule.condition}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={rule.action}
                            size='small'
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor:
                                rule.action === 'allow'
                                  ? '#d1fae5'
                                  : rule.action === 'deny'
                                    ? '#fef2f2'
                                    : rule.action === 'warn'
                                      ? '#fef3c7'
                                      : '#dbeafe',
                              color:
                                rule.action === 'allow'
                                  ? '#065f46'
                                  : rule.action === 'deny'
                                    ? '#991b1b'
                                    : rule.action === 'warn'
                                      ? '#92400e'
                                      : '#1e40af',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 2 }} />

              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                最近决策
              </Typography>
              {decisions.filter((d) => d.policy_id === selectedPolicy.id).length === 0 ? (
                <Alert
                  severity='info'
                  sx={{ fontSize: 12 }}
                >
                  暂无该策略的决策记录
                </Alert>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>规则</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>决策</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>原因</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>时间</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {decisions
                        .filter((d) => d.policy_id === selectedPolicy.id)
                        .slice(-5)
                        .map((decision) => (
                          <TableRow key={decision.id}>
                            <TableCell sx={{ fontSize: 12 }}>{decision.rule_name}</TableCell>
                            <TableCell>
                              {decision.allowed ? (
                                <Chip
                                  label='允许'
                                  size='small'
                                  sx={{
                                    fontSize: 10,
                                    height: 18,
                                    bgcolor: '#d1fae5',
                                    color: '#065f46',
                                    fontWeight: 600,
                                  }}
                                />
                              ) : (
                                <Chip
                                  label='拒绝'
                                  size='small'
                                  sx={{
                                    fontSize: 10,
                                    height: 18,
                                    bgcolor: '#fef2f2',
                                    color: '#991b1b',
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, maxWidth: 250 }}>
                              {decision.reason}
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {new Date(decision.decided_at).toLocaleTimeString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <Alert severity='info'>请从左侧选择一个策略查看详情</Alert>
          )}
        </V51Card>
      </Box>
    </Box>
  );
};

const AuditTab: React.FC<{
  logs: PolicyDecision[];
  filter: string;
  onFilterChange: (value: string) => void;
}> = ({ logs, filter, onFilterChange }) => {
  const filtered = React.useMemo(() => {
    if (filter === 'all') return logs;
    if (filter === 'allowed') return logs.filter((l) => l.allowed);
    if (filter === 'denied') return logs.filter((l) => !l.allowed);
    if (filter === 'simulated') return logs.filter((l) => l.simulation);
    return logs;
  }, [logs, filter]);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FileText size={20} />
          审计追踪查看器
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          共 {logs.length} 条记录
        </Typography>
      </Stack>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Chip
          label='全部'
          size='small'
          onClick={() => onFilterChange('all')}
          sx={{
            bgcolor: filter === 'all' ? '#10b981' : 'grey.100',
            color: filter === 'all' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label='已允许'
          size='small'
          onClick={() => onFilterChange('allowed')}
          sx={{
            bgcolor: filter === 'allowed' ? '#10b981' : 'grey.100',
            color: filter === 'allowed' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label='已拒绝'
          size='small'
          onClick={() => onFilterChange('denied')}
          sx={{
            bgcolor: filter === 'denied' ? '#dc2626' : 'grey.100',
            color: filter === 'denied' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label='模拟'
          size='small'
          onClick={() => onFilterChange('simulated')}
          sx={{
            bgcolor: filter === 'simulated' ? '#f59e0b' : 'grey.100',
            color: filter === 'simulated' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity='info'>暂无审计记录</Alert>
      ) : (
        <V51Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>时间</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>策略</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>规则</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>操作</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>决策</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>用户</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>详情</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.slice(0, 30).map((log) => (
                  <AuditRow
                    key={log.id}
                    decision={log}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {filtered.length > 30 && (
            <Typography
              variant='caption'
              sx={{ p: 1, display: 'block', textAlign: 'center', color: 'text.secondary' }}
            >
              仅显示最近 30 条，共 {filtered.length} 条记录
            </Typography>
          )}
        </V51Card>
      )}
    </Box>
  );
};

const AuditRow: React.FC<{ decision: PolicyDecision }> = ({ decision }) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <>
      <TableRow
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell sx={{ fontSize: 11 }}>
          {new Date(decision.decided_at).toLocaleString()}
        </TableCell>
        <TableCell sx={{ fontSize: 12 }}>{decision.policy_name}</TableCell>
        <TableCell sx={{ fontSize: 12 }}>{decision.rule_name}</TableCell>
        <TableCell>
          <Chip
            label={decision.action}
            size='small'
            sx={{
              fontSize: 10,
              height: 18,
              bgcolor:
                decision.action === 'allow'
                  ? '#d1fae5'
                  : decision.action === 'deny'
                    ? '#fef2f2'
                    : decision.action === 'warn'
                      ? '#fef3c7'
                      : '#dbeafe',
              color:
                decision.action === 'allow'
                  ? '#065f46'
                  : decision.action === 'deny'
                    ? '#991b1b'
                    : decision.action === 'warn'
                      ? '#92400e'
                      : '#1e40af',
              fontWeight: 600,
            }}
          />
        </TableCell>
        <TableCell>
          {decision.allowed ? (
            <Chip
              label='允许'
              size='small'
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: '#d1fae5',
                color: '#065f46',
                fontWeight: 600,
              }}
            />
          ) : (
            <Chip
              label='拒绝'
              size='small'
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: '#fef2f2',
                color: '#991b1b',
                fontWeight: 600,
              }}
            />
          )}
        </TableCell>
        <TableCell sx={{ fontSize: 11 }}>{decision.user_id || 'system'}</TableCell>
        <TableCell>
          {decision.simulation ? (
            <Chip
              label='模拟'
              size='small'
              sx={{
                fontSize: 9,
                height: 16,
                bgcolor: '#fef3c7',
                color: '#92400e',
                fontWeight: 600,
              }}
            />
          ) : (
            <Chip
              label='实时'
              size='small'
              sx={{ fontSize: 9, height: 16 }}
            />
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell
            colSpan={7}
            sx={{ bgcolor: 'grey.50', py: 2 }}
          >
            <Box sx={{ p: 2 }}>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}
              >
                原因:
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontSize: 12, mb: 2 }}
              >
                {decision.reason}
              </Typography>
              <Typography
                variant='caption'
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}
              >
                证据:
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontSize: 11, fontFamily: 'monospace', color: 'text.secondary' }}
              >
                {decision.evidence}
              </Typography>
            </Box>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const ScoreCard: React.FC<{
  title: string;
  score: number;
  color: string;
  icon: React.ReactNode;
  subtitle: string;
}> = ({ title, score, color, icon, subtitle }) => (
  <V51Card>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {title}
        </Typography>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700, color, lineHeight: 1.2 }}
        >
          {score}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
    <LinearProgress
      variant='determinate'
      value={score}
      sx={{ height: 4, borderRadius: 2, mt: 1, bgcolor: 'grey.200' }}
    />
  </V51Card>
);
