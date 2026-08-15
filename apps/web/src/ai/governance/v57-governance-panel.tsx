import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
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
  Card,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  FileText,
  Play,
  RotateCcw,
  TrendingUp,
  Activity,
  Lock,
  Scale,
  Target,
  BarChart3,
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
} from './policy-enforcement';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabId = 'compliance' | 'risk' | 'policy' | 'audit';

const REGULATION_COLORS: Record<Regulation, string> = {
  GDPR: designTokens.colors.primary.main,
  SOX: designTokens.colors.warning.main,
  HIPAA: designTokens.colors.error.main,
  PCI: designTokens.colors.secondary.main,
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: designTokens.colors.error.dark,
  high: `${designTokens.colors.orange['600']}`,
  medium: designTokens.colors.warning.dark,
  low: `${designTokens.colors.primary.dark}`,
};

const RISK_LEVEL_COLORS: Record<RiskLevel, string> = {
  critical: designTokens.colors.error.dark,
  high: `${designTokens.colors.orange['600']}`,
  medium: designTokens.colors.warning.dark,
  low: `${designTokens.colors.primary.dark}`,
};

const CATEGORY_COLORS: Record<RiskCategory, string> = {
  Security: designTokens.colors.error.dark,
  Compliance: designTokens.colors.warning.main,
  Performance: designTokens.colors.primary.main,
  Financial: designTokens.colors.success.dark,
};

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  Security: i18n.t('ai.v57-governance-panel.k0'),
  Compliance: i18n.t('ai.v57-governance-panel.k1'),
  Performance: i18n.t('ai.v57-governance-panel.k2'),
  Financial: i18n.t('ai.v57-governance-panel.k3'),
};

const LEVEL_LABELS: Record<RiskLevel, string> = {
  critical: i18n.t('ai.v57-governance-panel.k4'),
  high: i18n.t('ai.v57-governance-panel.k5'),
  medium: i18n.t('ai.v57-governance-panel.k6'),
  low: i18n.t('ai.v57-governance-panel.k7'),
};

export const V57GovernancePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('compliance');
  const [complianceChecks, setComplianceChecks] = React.useState<ComplianceCheck[]>([]);
  const [complianceStatus, setComplianceStatus] = React.useState<ReturnType<
    typeof complianceAutomator.getComplianceStatus
  > | null>(null);
  const [complianceReport, setComplianceReport] = React.useState<ComplianceReport | null>(null);

  const [alerts, setAlerts] = React.useState<RiskAlert[]>([]);
  const [riskScore, setRiskScore] = React.useState<RiskScore | null>(null);
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

  const [auditLog, setAuditLog] = React.useState<PolicyDecision[]>([]);
  const [auditFilter, setAuditFilter] = React.useState<string>('all');

  const [isLoading, setIsLoading] = React.useState(false);

  const runFullAssessment = () => {
    setIsLoading(true);

    setTimeout(() => {
      const checks = complianceAutomator.runComplianceChecks();
      setComplianceChecks(checks);
      setComplianceStatus(complianceAutomator.getComplianceStatus());
      setComplianceReport(complianceAutomator.generateReport());

      setAlerts(riskAlerter.getAlerts({ status: 'all' }));
      setRiskScore(riskAlerter.getRiskScore());
      setIndicators(riskAlerter.getIndicators());

      const activePolicies = policyEnforcer.getPolicies({ status: 'active' });
      setPolicies(activePolicies);
      setAuditLog(policyEnforcer.getAuditLog({ limit: 50 }));

      setIsLoading(false);
    }, 300);
  };

  React.useEffect(() => {
    runFullAssessment();
  }, []);

  const handleAcknowledge = (alertId: string) => {
    riskAlerter.acknowledgeAlert(alertId, 'admin');
    setAlerts(riskAlerter.getAlerts({ status: 'all' }));
    setRiskScore(riskAlerter.getRiskScore());
  };

  const handleResolve = (alertId: string) => {
    riskAlerter.resolveAlert(alertId, 'admin');
    setAlerts(riskAlerter.getAlerts({ status: 'all' }));
    setRiskScore(riskAlerter.getRiskScore());
  };

  const handleEvaluatePolicy = () => {
    const mockContext = {
      user: { role: 'manager', clearance: 3, has_consent: true, id: 'user-001' },
      data: { classification: 'confidential', type: 'personal' },
      action: { type: 'read' },
      transaction: { approver: 'manager', requester: 'user-001', amount: 5000 },
      project: { budget_remaining: 500000 },
      output: { harm_score: 0.15, bias_score: 0.2, contains_pii: false },
    };

    const result = policyEnforcer.enforcePolicy(mockContext);
    setDecisions(result.decisions);
    setAuditLog(policyEnforcer.getAuditLog({ limit: 50 }));
  };

  const handleCreatePolicy = () => {
    if (!newPolicy.name) return;
    const policy = policyEnforcer.createPolicy({
      name: newPolicy.name,
      scope: newPolicy.scope || 'global',
      scope_target: 'custom',
      rules: newPolicy.rules || [],
      enforcement_mode: newPolicy.enforcement_mode || 'enforce',
      status: newPolicy.status || 'draft',
      description: newPolicy.description || '',
      tags: newPolicy.tags || [],
    });
    setPolicies(policyEnforcer.getPolicies());
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
        bgcolor: 'action.active',
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
          boxShadow: designTokens.darkShadows['3xl'],
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
              label={i18n.t('ai.v57-governance-panel.k8')}
              value='compliance'
            />
            <Tab
              icon={<AlertTriangle size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v57-governance-panel.k0')}${alerts.some((a) => !a.resolved) ? ` (${alerts.filter((a) => !a.resolved).length})` : ''}`}
              value='risk'
            />
            <Tab
              icon={<Scale size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v57-governance-panel.k1')}${policies.length > 0 ? ` (${policies.length})` : ''}`}
              value='policy'
            />
            <Tab
              icon={<FileText size={16} />}
              iconPosition='start'
              label={`${i18n.t('ai.v57-governance-panel.k2')}${auditLog.length > 0 ? ` (${auditLog.length})` : ''}`}
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
                <Typography>{i18n.t('ai.v57-governance-panel.i_0')}</Typography>
              </Stack>
            </Box>
          )}

          {!isLoading && activeTab === 'compliance' && (
            <ComplianceTab
              checks={complianceChecks}
              status={complianceStatus}
              report={complianceReport}
              onReRun={runFullAssessment}
            />
          )}

          {!isLoading && activeTab === 'risk' && (
            <RiskTab
              alerts={alerts}
              indicators={indicators}
              score={riskScore}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
              onReRun={runFullAssessment}
            />
          )}

          {!isLoading && activeTab === 'policy' && (
            <PolicyTab
              policies={policies}
              decisions={decisions}
              selectedPolicyId={selectedPolicyId}
              onSelectPolicy={setSelectedPolicyId}
              onEvaluate={handleEvaluatePolicy}
              onCreatePolicy={() => setPolicyDialogOpen(true)}
              onUpdatePolicy={(id, updates) => {
                policyEnforcer.updatePolicy(id, updates);
                setPolicies(policyEnforcer.getPolicies());
              }}
            />
          )}

          {!isLoading && activeTab === 'audit' && (
            <AuditTab
              logs={auditLog}
              filter={auditFilter}
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
          <DialogTitle>{i18n.t('ai.v57-governance-panel.k9')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={i18n.t('ai.v57-governance-panel.k10')}
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                fullWidth
                size='small'
              />
              <FormControl size='small'>
                <InputLabel>{i18n.t('ai.v57-governance-panel.k11')}</InputLabel>
                <Select
                  value={newPolicy.scope}
                  label={i18n.t('ai.v57-governance-panel.k12')}
                  onChange={(e) =>
                    setNewPolicy({ ...newPolicy, scope: e.target.value as Policy['scope'] })
                  }
                >
                  <MenuItem value='global'>{i18n.t('ai.v57-governance-panel.k13')}</MenuItem>
                  <MenuItem value='module'>{i18n.t('ai.v57-governance-panel.k14')}</MenuItem>
                  <MenuItem value='entity'>{i18n.t('ai.v57-governance-panel.k15')}</MenuItem>
                  <MenuItem value='user'>{i18n.t('ai.v57-governance-panel.k16')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size='small'>
                <InputLabel>{i18n.t('ai.v57-governance-panel.k17')}</InputLabel>
                <Select
                  value={newPolicy.enforcement_mode}
                  label={i18n.t('ai.v57-governance-panel.k18')}
                  onChange={(e) =>
                    setNewPolicy({
                      ...newPolicy,
                      enforcement_mode: e.target.value as EnforcementMode,
                    })
                  }
                >
                  <MenuItem value='enforce'>{i18n.t('ai.v57-governance-panel.k19')}</MenuItem>
                  <MenuItem value='audit'>{i18n.t('ai.v57-governance-panel.k20')}</MenuItem>
                  <MenuItem value='advisory'>{i18n.t('ai.v57-governance-panel.k21')}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={i18n.t('ai.v57-governance-panel.k22')}
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
            <Button onClick={() => setPolicyDialogOpen(false)}>{i18n.t('ai.v57-governance-panel.k23')}</Button>
            <Button
              variant='contained'
              onClick={handleCreatePolicy}
              disabled={!newPolicy.name}
            >
              {i18n.t('ai.v57-governance-panel.k3')}
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
      background: `linear-gradient(135deg, ${designTokens.colors.success.dark} 0%, ${designTokens.colors.teal['600']} 50%, ${designTokens.colors.cyan['600']} 100%)`,
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
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
          {i18n.t('ai.v57-governance-panel.v570ai_4')}
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          {i18n.t('ai.v57-governance-panel.k5')}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V57'
        color='secondary'
        sx={{
          '& .MuiBadge-badge': {
            bgcolor: 'warning.400',
            color: 'text.primary',
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
        sx={{ color: 'common.white' }}
      >
        <XIcon size={20} />
      </IconButton>
    </Box>
  </Box>
);

const ComplianceTab: React.FC<{
  checks: ComplianceCheck[];
  status: ReturnType<typeof complianceAutomator.getComplianceStatus> | null;
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
        <Alert severity='info'>暂无合规数据，请点击"{i18n.t('ai.v57-governance-panel.k24')}"{i18n.t('ai.document_analysis.button.start_analysis')}</Alert>
      </Box>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return designTokens.colors.success.dark;
    if (score >= 75) return designTokens.colors.warning.main;
    if (score >= 50) return `${designTokens.colors.orange['600']}`;
    return designTokens.colors.error.dark;
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
          {i18n.t('ai.v57-governance-panel.k8')}
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RotateCcw size={14} />}
          onClick={onReRun}
          size='small'
        >
          {i18n.t('ai.v57-governance-panel.k9')}
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <ScoreCard
          title={i18n.t('ai.v57-governance-panel.k25')}
          score={status.overall_pass_rate}
          color={getScoreColor(status.overall_pass_rate)}
          icon={<Gauge size={24} />}
          subtitle={`${status.total_checks} ${i18n.t('ai.v57-governance-panel.k10')}`}
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
              subtitle={`${regData.passed}/${regData.total} ${i18n.t('ai.v57-governance-panel.k11')}`}
            />
          );
        })}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <BarChart3 size={16} />
            {i18n.t('ai.v57-governance-panel.k12')}
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
        </Card>

        {report && (
          <Card variant='outlined' sx={{ p: 2 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Target size={16} />
              {i18n.t('ai.v57-governance-panel.k13')}
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
                          style={{ color: 'teal.500' }}
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
          </Card>
        )}
      </Box>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Chip
          label={i18n.t('ai.v57-governance-panel.k26')}
          size='small'
          onClick={() => setFilter('all')}
          sx={{
            bgcolor: filter === 'all' ? designTokens.colors.success.dark : 'grey.100',
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

      <Card variant='outlined' sx={{ p: 2 }}>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k27')}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k28')}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k29')}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k30')}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k31')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(0, 20).map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    {check.passed ? (
                      <CheckCircle2
                        size={18}
                        color={designTokens.colors.success.dark}
                      />
                    ) : (
                      <XCircle
                        size={18}
                        color={designTokens.colors.error.dark}
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
            {i18n.t('ai.v57-governance-panel.20_0')} {filtered.length} {i18n.t('ai.v57-governance-panel.k1')}
          </Typography>
        )}
      </Card>
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
            color={designTokens.colors.success.dark}
          />
        );
      case 'deteriorating':
        return (
          <ArrowUpRight
            size={18}
            color={designTokens.colors.error.dark}
          />
        );
      default:
        return (
          <Activity
            size={18}
            color='colors.grey.500'
          />
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 25) return designTokens.colors.success.dark;
    if (score <= 50) return designTokens.colors.warning.main;
    if (score <= 75) return `${designTokens.colors.orange['600']}`;
    return designTokens.colors.error.dark;
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
          {i18n.t('ai.v57-governance-panel.k14')}
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RotateCcw size={14} />}
          onClick={onReRun}
          size='small'
        >
          {i18n.t('ai.v57-governance-panel.k15')}
        </Button>
      </Stack>

      {score && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2, mb: 3 }}>
          <ScoreCard
            title={i18n.t('ai.v57-governance-panel.k32')}
            score={score.overall}
            color={getScoreColor(score.overall)}
            icon={<Gauge size={24} />}
            subtitle={`${i18n.t('ai.v57-governance-panel.k16')} ${score.trend === 'improving' ? i18n.t('ai.v57-governance-panel.k35') : score.trend === 'deteriorating' ? i18n.t('ai.v57-governance-panel.k34') : i18n.t('ai.v57-governance-panel.k33')}`}
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
              subtitle={`${i18n.t('ai.v57-governance-panel.k17')} ${score.by_category[cat]}`}
            />
          ))}
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            {i18n.t('ai.v57-governance-panel.k18')}
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
                          color={designTokens.colors.success.dark}
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
                      [i18n.t('ai.v57-governance-panel.k19')]: {ind.threshold}
                      {ind.unit}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Card>

        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Bell size={16} />
            {i18n.t('ai.v57-governance-panel.k20')}
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
                      {score.bySeverity[lvl]}
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
                  [i18n.t('ai.v57-governance-panel.k21')]:{' '}
                  {score.trend === 'improving'
                    ? i18n.t('ai.v57-governance-panel.k36')
                    : score.trend === 'deteriorating'
                      ? i18n.t('ai.v57-governance-panel.k37')
                      : i18n.t('ai.v57-governance-panel.k38')}
                </Typography>
              </Box>
            </Stack>
          )}
        </Card>
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
          <InputLabel sx={{ fontSize: 11 }}>{i18n.t('ai.v57-governance-panel.k39')}</InputLabel>
          <Select
            value={statusFilter}
            label={i18n.t('ai.v57-governance-panel.k40')}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value='all'>{i18n.t('ai.v57-governance-panel.k41')}</MenuItem>
            <MenuItem value='active'>{i18n.t('ai.v57-governance-panel.k42')}</MenuItem>
            <MenuItem value='acknowledged'>{i18n.t('ai.v57-governance-panel.k43')}</MenuItem>
            <MenuItem value='resolved'>{i18n.t('ai.v57-governance-panel.k44')}</MenuItem>
          </Select>
        </FormControl>
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel sx={{ fontSize: 11 }}>{i18n.t('ai.v57-governance-panel.k45')}</InputLabel>
          <Select
            value={categoryFilter}
            label={i18n.t('ai.v57-governance-panel.k46')}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            sx={{ fontSize: 12 }}
          >
            <MenuItem value='all'>{i18n.t('ai.v57-governance-panel.k47')}</MenuItem>
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
        <Alert severity='info'>{i18n.t('ai.v57-governance-panel.k48')}</Alert>
      ) : (
        <Card variant='outlined' sx={{ p: 2 }}>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k49')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k50')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k51')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k52')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k53')}</TableCell>
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
                          label={i18n.t('ai.v57-governance-panel.k54')}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: 'success.100',
                            color: 'teal.900',
                            fontWeight: 600,
                          }}
                        />
                      ) : alert.acknowledged ? (
                        <Chip
                          label={i18n.t('ai.v57-governance-panel.k55')}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: 'warning.100',
                            color: 'warning.800',
                            fontWeight: 600,
                          }}
                        />
                      ) : (
                        <Chip
                          label={i18n.t('ai.v57-governance-panel.k56')}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 20,
                            bgcolor: 'error.50',
                            color: 'error.800',
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
                            {i18n.t('ai.v57-governance-panel.k22')}
                          </Button>
                        )}
                        {!alert.resolved && (
                          <Button
                            size='small'
                            onClick={() => onResolve(alert.id)}
                            startIcon={<XCircle size={12} />}
                          >
                            {i18n.t('ai.v57-governance-panel.k23')}
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
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
          {i18n.t('ai.v57-governance-panel.k24')}
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
            {i18n.t('ai.v57-governance-panel.k25')}
          </Button>
          <Button
            variant='outlined'
            startIcon={<Plus size={14} />}
            onClick={onCreatePolicy}
            size='small'
          >
            {i18n.t('ai.v57-governance-panel.k26')}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('ai.v57-governance-panel.k2')}{policies.length})
          </Typography>
          {policies.length === 0 ? (
            <Alert
              severity='info'
              sx={{ fontSize: 12 }}
            >
              {i18n.t('ai.v57-governance-panel.k27')}
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
        </Card>

        <Card variant='outlined' sx={{ p: 2 }}>
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
                {i18n.t('ai.v57-governance-panel.k3')}{selectedPolicy.rules.length})
              </Typography>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k57')}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k58')}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k59')}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k60')}</TableCell>
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
                                  ? 'colors.success.100'
                                  : rule.action === 'deny'
                                    ? 'colors.error.50'
                                    : rule.action === 'warn'
                                      ? 'colors.warning.100'
                                      : 'colors.primary.100',
                              color:
                                rule.action === 'allow'
                                  ? 'colors.success.dark'
                                  : rule.action === 'deny'
                                    ? 'colors.error.800'
                                    : rule.action === 'warn'
                                      ? 'colors.orange.800'
                                      : designTokens.colors.primary['800'],
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
                {i18n.t('ai.v57-governance-panel.k28')}
              </Typography>
              {decisions.filter((d) => d.policy_id === selectedPolicy.id).length === 0 ? (
                <Alert
                  severity='info'
                  sx={{ fontSize: 12 }}
                >
                  {i18n.t('ai.v57-governance-panel.k29')}
                </Alert>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k61')}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k62')}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k63')}</TableCell>
                        <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>{i18n.t('ai.v57-governance-panel.k64')}</TableCell>
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
                                  label={i18n.t('ai.v57-governance-panel.k65')}
                                  size='small'
                                  sx={{
                                    fontSize: 10,
                                    height: 18,
                                    bgcolor: 'success.100',
                                    color: 'teal.900',
                                    fontWeight: 600,
                                  }}
                                />
                              ) : (
                                <Chip
                                  label={i18n.t('ai.v57-governance-panel.k66')}
                                  size='small'
                                  sx={{
                                    fontSize: 10,
                                    height: 18,
                                    bgcolor: 'error.50',
                                    color: 'error.800',
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
            <Alert severity='info'>{i18n.t('ai.v57-governance-panel.k67')}</Alert>
          )}
        </Card>
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
          {i18n.t('ai.v57-governance-panel.k30')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {i18n.t('ai.v57-governance-panel.k4')} {logs.length} {i18n.t('ai.v57-governance-panel.k5')}
        </Typography>
      </Stack>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Chip
          label={i18n.t('ai.v57-governance-panel.k68')}
          size='small'
          onClick={() => onFilterChange('all')}
          sx={{
            bgcolor: filter === 'all' ? designTokens.colors.success.dark : 'grey.100',
            color: filter === 'all' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label={i18n.t('ai.v57-governance-panel.k69')}
          size='small'
          onClick={() => onFilterChange('allowed')}
          sx={{
            bgcolor: filter === 'allowed' ? designTokens.colors.success.dark : 'grey.100',
            color: filter === 'allowed' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label={i18n.t('ai.v57-governance-panel.k70')}
          size='small'
          onClick={() => onFilterChange('denied')}
          sx={{
            bgcolor: filter === 'denied' ? designTokens.colors.error.dark : 'grey.100',
            color: filter === 'denied' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
        <Chip
          label={i18n.t('ai.v57-governance-panel.k71')}
          size='small'
          onClick={() => onFilterChange('simulated')}
          sx={{
            bgcolor: filter === 'simulated' ? designTokens.colors.warning.main : 'grey.100',
            color: filter === 'simulated' ? 'white' : 'text.secondary',
            fontWeight: 600,
          }}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity='info'>{i18n.t('ai.v57-governance-panel.k72')}</Alert>
      ) : (
        <Card variant='outlined' sx={{ p: 2 }}>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k73')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k74')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k75')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k76')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k77')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k78')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{i18n.t('ai.v57-governance-panel.k79')}</TableCell>
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
              {i18n.t('ai.v57-governance-panel.30_6')} {filtered.length} {i18n.t('ai.v57-governance-panel.k7')}
            </Typography>
          )}
        </Card>
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
                  ? 'colors.success.100'
                  : decision.action === 'deny'
                    ? 'colors.error.50'
                    : decision.action === 'warn'
                      ? 'colors.warning.100'
                      : 'colors.primary.100',
              color:
                decision.action === 'allow'
                  ? 'colors.success.dark'
                  : decision.action === 'deny'
                    ? 'colors.error.800'
                    : decision.action === 'warn'
                      ? 'colors.orange.800'
                      : designTokens.colors.primary['800'],
              fontWeight: 600,
            }}
          />
        </TableCell>
        <TableCell>
          {decision.allowed ? (
            <Chip
              label={i18n.t('ai.v57-governance-panel.k80')}
              size='small'
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: 'success.100',
                color: 'teal.900',
                fontWeight: 600,
              }}
            />
          ) : (
            <Chip
              label={i18n.t('ai.v57-governance-panel.k81')}
              size='small'
              sx={{
                fontSize: 10,
                height: 18,
                bgcolor: 'error.50',
                color: 'error.800',
                fontWeight: 600,
              }}
            />
          )}
        </TableCell>
        <TableCell sx={{ fontSize: 11 }}>{decision.user_id || 'system'}</TableCell>
        <TableCell>
          {decision.simulation ? (
            <Chip
              label={i18n.t('ai.v57-governance-panel.k82')}
              size='small'
              sx={{
                fontSize: 9,
                height: 16,
                bgcolor: 'warning.100',
                color: 'warning.800',
                fontWeight: 600,
              }}
            />
          ) : (
            <Chip
              label={i18n.t('ai.v57-governance-panel.k83')}
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
                [i18n.t('ai.v57-governance-panel.k31')]:
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
                [i18n.t('ai.v57-governance-panel.k32')]:
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
  <Card variant='outlined' sx={{ p: 2 }}>
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
  </Card>
);
