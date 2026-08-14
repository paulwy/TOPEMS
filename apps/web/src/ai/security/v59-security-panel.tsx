import React, { useState, useEffect, useCallback } from 'react';
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
  Card,
  CardContent,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Gauge,
  Lock,
  Eye,
  Play,
  RotateCcw,
  Activity,
  FileText,
  Sparkles,
  Target,
  BarChart3,
  TrendingUp,
  Database,
  Fingerprint,
  ShieldAlert,
} from 'lucide-react';
import {
  aiSecurityAuditor,
  type AuditResult,
  type AuditType,
  type AuditSeverity,
} from './ai-security-audit';
import {
  adversarialRobustness,
  type RobustnessTest,
  type AttackVector,
  type AttackType,
} from './adversarial-robustness';
import {
  privacyEnhancer,
  type PrivacyConfig,
  type PrivacyReport,
  type NoiseStrategy,
} from './privacy-enhancement';
import { designTokens, semanticTokens } from '@topems/tokens';

type PanelTab = 'audit' | 'robustness' | 'privacy' | 'summary';

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  critical: designTokens.colors.error.dark,
  high: `${designTokens.colors.orange['600']}`,
  medium: designTokens.colors.warning.dark,
  low: `${designTokens.colors.primary.dark}`,
  info: 'colors.grey.500',
};

const ATTACK_TYPE_LABELS: Record<AttackType, string> = {
  PromptInjection: i18n.t('ai.v59-security-panel.k0'),
  ModelPoisoning: i18n.t('ai.v59-security-panel.k1'),
  DataExfiltration: i18n.t('ai.v59-security-panel.k2'),
  SideChannel: i18n.t('ai.v59-security-panel.k3'),
};

const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  InputValidation: i18n.t('ai.v59-security-panel.k4'),
  OutputFilter: i18n.t('ai.v59-security-panel.k5'),
  PromptInjection: i18n.t('ai.v59-security-panel.k6'),
  DataLeakage: i18n.t('ai.v59-security-panel.k7'),
};

const SAMPLE_MODEL_ID = 'v59-demo-model';

export const V59SecurityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('audit');

  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [auditSummary, setAuditSummary] = useState(() => aiSecurityAuditor.getAuditSummary());
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  const [auditSeverity, setAuditSeverity] = useState<AuditSeverity>('low');

  const [tests, setTests] = useState<RobustnessTest[]>([]);
  const [attackVectors, setAttackVectors] = useState<AttackVector[]>([]);
  const [defenseStatus, setDefenseStatus] = useState(() =>
    adversarialRobustness.getDefenseStatus()
  );
  const [selectedVector, setSelectedVector] = useState<AttackVector | null>(null);

  const [privacyConfigs, setPrivacyConfigs] = useState<PrivacyConfig[]>([]);
  const [privacyReport, setPrivacyReport] = useState<PrivacyReport | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<PrivacyConfig | null>(null);
  const [leakageRisk, setLeakageRisk] = useState(() =>
    privacyEnhancer.getDataLeakageRisk('config-default')
  );

  const [isRunning, setIsRunning] = useState(false);

  const loadAudits = useCallback(() => {
    setAudits(aiSecurityAuditor.listAudits(10));
    setAuditSummary(aiSecurityAuditor.getAuditSummary());
  }, []);

  const loadRobustness = useCallback(() => {
    setTests(adversarialRobustness.listTests(SAMPLE_MODEL_ID, 10));
    setAttackVectors(adversarialRobustness.getAttackVectors());
    setDefenseStatus(adversarialRobustness.getDefenseStatus());
  }, []);

  const loadPrivacy = useCallback(() => {
    setPrivacyConfigs(privacyEnhancer.listConfigs());
    const report = privacyEnhancer.getPrivacyReport('config-default');
    setPrivacyReport(report ?? privacyEnhancer.assessPrivacy(SAMPLE_MODEL_ID, 'config-default'));
    setLeakageRisk(privacyEnhancer.getDataLeakageRisk('config-default'));
  }, []);

  const runSecurityAudit = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const result = aiSecurityAuditor.runAudit(SAMPLE_MODEL_ID, { severity: auditSeverity });
      setSelectedAudit(result);
      loadAudits();
      setIsRunning(false);
    }, 300);
  }, [auditSeverity, loadAudits]);

  const runRobustnessTest = useCallback((vector: AttackVector) => {
    setIsRunning(true);
    setTimeout(() => {
      const test = adversarialRobustness.runTest(SAMPLE_MODEL_ID, vector.id);
      setTests((prev) => [test, ...prev]);
      setDefenseStatus(adversarialRobustness.getDefenseStatus());
      setIsRunning(false);
    }, 300);
  }, []);

  const runPrivacyTest = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const report = privacyEnhancer.assessPrivacy(SAMPLE_MODEL_ID, 'config-default');
      setPrivacyReport(report);
      setLeakageRisk(privacyEnhancer.getDataLeakageRisk('config-default'));
      loadPrivacy();
      setIsRunning(false);
    }, 300);
  }, [loadPrivacy]);

  useEffect(() => {
    loadAudits();
    loadRobustness();
    loadPrivacy();
  }, [loadAudits, loadRobustness, loadPrivacy]);

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
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '96%',
          maxWidth: 1500,
          maxHeight: '94vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows.xl,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${designTokens.colors.error.dark}, ${designTokens.colors.orange['600']}, ${designTokens.colors.warning.dark})`,
            bgcolor: `linear-gradient(135deg, ${designTokens.colors.error.dark}, ${designTokens.colors.orange['600']}, ${designTokens.colors.warning.dark})`,
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield size={24} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.v59-security-panel.k0')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size='small'
              variant='outlined'
              sx={{ borderColor: 'common.white', color: 'common.white' }}
              onClick={() => {
                loadAudits();
                loadRobustness();
                loadPrivacy();
              }}
            >
              <RotateCcw
                size={14}
                style={{ marginRight: 4 }}
              />
              {i18n.t('ai.v59-security-panel.k1')}
            </Button>
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as PanelTab)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Shield size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v59-security-panel.k8')}
              value='audit'
            />
            <Tab
              icon={<Target size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v59-security-panel.k9')}
              value='robustness'
            />
            <Tab
              icon={<Lock size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v59-security-panel.k10')}
              value='privacy'
            />
            <Tab
              icon={<BarChart3 size={16} />}
              iconPosition='start'
              label={i18n.t('ai.v59-security-panel.k11')}
              value='summary'
            />
          </Tabs>
        </Box>

        <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
          {activeTab === 'audit' && (
            <AuditTab
              audits={audits}
              summary={auditSummary}
              selectedAudit={selectedAudit}
              onSelect={setSelectedAudit}
              severity={auditSeverity}
              onSeverityChange={setAuditSeverity}
              onRun={runSecurityAudit}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'robustness' && (
            <RobustnessTab
              vectors={attackVectors}
              tests={tests}
              defenseStatus={defenseStatus}
              selectedVector={selectedVector}
              onSelectVector={setSelectedVector}
              onTest={runRobustnessTest}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacyTab
              configs={privacyConfigs}
              report={privacyReport}
              leakageRisk={leakageRisk}
              selectedConfig={selectedConfig}
              onSelectConfig={setSelectedConfig}
              onTest={runPrivacyTest}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'summary' && (
            <ThreatSummaryTab
              auditSummary={auditSummary}
              defenseStatus={defenseStatus}
              privacyReport={privacyReport}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const AuditTab: React.FC<{
  audits: AuditResult[];
  summary: ReturnType<typeof aiSecurityAuditor.getAuditSummary>;
  selectedAudit: AuditResult | null;
  onSelect: (audit: AuditResult) => void;
  severity: AuditSeverity;
  onSeverityChange: (s: AuditSeverity) => void;
  onRun: () => void;
  isRunning: boolean;
}> = ({
  audits,
  summary,
  selectedAudit,
  onSelect,
  severity,
  onSeverityChange,
  onRun,
  isRunning,
}) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 8 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Shield
              size={18}
              color={designTokens.colors.error.dark}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.v59-security-panel.ai_2')}
            </Typography>
            <Chip
              size='small'
              label={`${audits.length} ${i18n.t('ai.v59-security-panel.k3')}`}
              color='primary'
              variant='outlined'
              sx={{ ml: 'auto' }}
            />
          </Stack>

          <Stack
            direction='row'
            spacing={2}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>{i18n.t('ai.v59-security-panel.k12')}</InputLabel>
              <Select
                value={severity}
                label={i18n.t('ai.v59-security-panel.k13')}
                onChange={(e) => onSeverityChange(e.target.value as AuditSeverity)}
              >
                <MenuItem value='info'>{i18n.t('ai.v59-security-panel.k14')}</MenuItem>
                <MenuItem value='low'>{i18n.t('ai.v59-security-panel.k4')}</MenuItem>
                <MenuItem value='medium'>{i18n.t('ai.v59-security-panel.k5')}</MenuItem>
                <MenuItem value='high'>{i18n.t('ai.v59-security-panel.k6')}</MenuItem>
                <MenuItem value='critical'>{i18n.t('ai.v59-security-panel.k15')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant='contained'
              size='small'
              onClick={onRun}
              disabled={isRunning}
              sx={{ bgcolor: 'error.600', '&:hover': { bgcolor: 'error.700' } }}
            >
              <Play
                size={14}
                style={{ marginRight: 4 }}
              />
              {isRunning ? i18n.t('ai.v59-security-panel.k7') : i18n.t('ai.v59-security-panel.k16')}
            </Button>
          </Stack>

          {selectedAudit && (
            <Alert
              severity={selectedAudit.passed ? 'success' : 'error'}
              variant='outlined'
              sx={{ mb: 2 }}
            >
              {i18n.t('ai.v59-security-panel.k8')}{selectedAudit.auditId}: {selectedAudit.passed ? i18n.t('ai.v59-security-panel.k18') : i18n.t('ai.v59-security-panel.k17')} · 得分{' '}
              {(selectedAudit.score * 100).toFixed(1)}% · 耗时 {selectedAudit.duration_ms}ms
            </Alert>
          )}

          {audits.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              {i18n.t('ai.v59-security-panel.i18n_10')}.t('ai.v59-security-panel.k19')开始。
            </Alert>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('ai.v59-security-panel.id_20')}</TableCell>
                    <TableCell>{i18n.t('ai.v59-security-panel.k21')}</TableCell>
                    <TableCell>{i18n.t('ai.v59-security-panel.k22')}</TableCell>
                    <TableCell>{i18n.t('ai.v59-security-panel.k23')}</TableCell>
                    <TableCell>{i18n.t('ai.v59-security-panel.k24')}</TableCell>
                    <TableCell>{i18n.t('ai.v59-security-panel.k25')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {audits.map((audit) => (
                    <TableRow
                      key={audit.auditId}
                      hover
                      onClick={() => onSelect(audit)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{ fontFamily: 'monospace', fontSize: 11 }}
                        >
                          {audit.auditId.slice(-12)}
                        </Typography>
                      </TableCell>
                      <TableCell>{audit.modelId}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant='determinate'
                            value={audit.score * 100}
                            sx={{
                              width: 60,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                bgcolor:
                                  audit.score >= 0.8
                                    ? designTokens.colors.success.dark
                                    : audit.score >= 0.5
                                      ? designTokens.colors.warning.main
                                      : designTokens.colors.error.main,
                              },
                            }}
                          />
                          <Typography variant='caption'>
                            {(audit.score * 100).toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {audit.passed ? (
                          <Chip
                            size='small'
                            label={i18n.t('ai.v59-security-panel.k26')}
                            color='success'
                          />
                        ) : (
                          <Chip
                            size='small'
                            label={i18n.t('ai.v59-security-panel.k27')}
                            color='error'
                          />
                        )}
                      </TableCell>
                      <TableCell>{audit.findings.length}</TableCell>
                      <TableCell>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {new Date(audit.timestamp).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {selectedAudit && selectedAudit.findings.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {i18n.t('ai.v59-security-panel.k12')}
              </Typography>
              <List dense>
                {selectedAudit.findings.map((finding) => (
                  <ListItem
                    key={finding.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ alignItems: 'center', mb: 0.5 }}
                      >
                        <Chip
                          size='small'
                          label={AUDIT_TYPE_LABELS[finding.type]}
                          sx={{
                            height: 20,
                            bgcolor: SEVERITY_COLORS[finding.severity],
                            color: 'common.white',
                          }}
                        />
                        <Chip
                          size='small'
                          label={finding.severity}
                          variant='outlined'
                          sx={{ height: 20 }}
                        />
                      </Stack>
                      <Typography variant='body2'>{finding.finding}</Typography>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        [i18n.t('ai.v59-security-panel.k13')]: {finding.remediation}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 4 }}>
      <Stack spacing={2}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Gauge
                size={18}
                color={designTokens.colors.error.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k14')}
              </Typography>
            </Stack>
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k28')}
                  value={summary.total_audits}
                  icon={<FileText size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k29')}
                  value={summary.passed_audits}
                  color={designTokens.colors.success.dark}
                  icon={<CheckCircle2 size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k30')}
                  value={summary.failed_audits}
                  color={designTokens.colors.error.main}
                  icon={<XCircle size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k31')}
                  value={`${(summary.avg_score * 100).toFixed(0)}%`}
                  color='colors.cyan.600'
                  icon={<TrendingUp size={14} />}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <AlertTriangle
                size={18}
                color={designTokens.colors.warning.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k15')}
              </Typography>
            </Stack>
            {Object.entries(summary.byType).map(([type, count]) => (
              <Box
                key={type}
                sx={{ mb: 1 }}
              >
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography
                    variant='caption'
                    sx={{ flex: 1 }}
                  >
                    {AUDIT_TYPE_LABELS[type as AuditType]}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600 }}
                  >
                    {count}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(100, count * 20)}
                  sx={{ height: 4, borderRadius: 2 }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Sparkles
                size={18}
                color={designTokens.colors.secondary.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k16')}
              </Typography>
            </Stack>
            {selectedAudit && selectedAudit.recommendations.length > 0 ? (
              <List dense>
                {selectedAudit.recommendations.map((rec, i) => (
                  <ListItem
                    key={i}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{ fontSize: 12 }}
                        >
                          {rec}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('ai.v59-security-panel.k17')}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Grid>
  </Grid>
);

const RobustnessTab: React.FC<{
  vectors: AttackVector[];
  tests: RobustnessTest[];
  defenseStatus: ReturnType<typeof adversarialRobustness.getDefenseStatus>;
  selectedVector: AttackVector | null;
  onSelectVector: (v: AttackVector | null) => void;
  onTest: (v: AttackVector) => void;
  isRunning: boolean;
}> = ({ vectors, tests, defenseStatus, selectedVector, onSelectVector, onTest, isRunning }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Target
              size={18}
              color={`${designTokens.colors.orange['600']}`}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.v59-security-panel.k18')}
            </Typography>
          </Stack>
          <Grid
            container
            spacing={1}
          >
            {vectors.map((v) => (
              <Grid
                size={12}
                key={v.id}
              >
                <Paper
                  variant='outlined'
                  sx={{
                    p: 1.5,
                    borderColor: selectedVector?.id === v.id ? `${designTokens.colors.orange['600']}` : 'divider',
                    borderWidth: selectedVector?.id === v.id ? 2 : 1,
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectVector(selectedVector?.id === v.id ? null : v)}
                >
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 0.5 }}
                  >
                    <Chip
                      size='small'
                      label={ATTACK_TYPE_LABELS[v.type]}
                      sx={{
                        height: 20,
                        bgcolor: SEVERITY_COLORS[v.severity],
                        color: 'common.white',
                      }}
                    />
                    <Chip
                      size='small'
                      label={v.severity}
                      variant='outlined'
                      sx={{ height: 20 }}
                    />
                  </Stack>
                  <Typography
                    variant='body2'
                    sx={{ fontSize: 12, mb: 0.5 }}
                  >
                    {v.vector}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    [i18n.t('ai.v59-security-panel.k19')]: {v.mitigation}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={(e) => {
                        e.stopPropagation();
                        onTest(v);
                      }}
                      disabled={isRunning}
                      sx={{ fontSize: 11 }}
                    >
                      <Play
                        size={12}
                        style={{ marginRight: 3 }}
                      />
                      {i18n.t('ai.v59-security-panel.k20')}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Stack spacing={2}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Activity
                size={18}
                color='colors.cyan.600'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k21')}
              </Typography>
            </Stack>
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k32')}
                  value={defenseStatus.total_defenses}
                  icon={<Shield size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label={i18n.t('ai.v59-security-panel.k33')}
                  value={defenseStatus.enabled_defenses}
                  color={designTokens.colors.success.dark}
                  icon={<CheckCircle2 size={14} />}
                />
              </Grid>
            </Grid>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1 }}
            >
              {i18n.t('ai.v59-security-panel.k22')}
            </Typography>
            {Object.entries(defenseStatus.byType).map(([type, data]) => (
              <Box
                key={type}
                sx={{ mb: 1 }}
              >
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Typography
                    variant='caption'
                    sx={{ flex: 1 }}
                  >
                    {ATTACK_TYPE_LABELS[type as AttackType]}
                  </Typography>
                  <Typography variant='caption'>
                    {data.enabled}/{data.total} 启用
                  </Typography>
                </Stack>
                <LinearProgress
                  variant='determinate'
                  value={data.avg_effectiveness * 100}
                  sx={{ height: 4, borderRadius: 2 }}
                />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  [i18n.t('ai.v59-security-panel.k23')]: {(data.avg_effectiveness * 100).toFixed(0)}%
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <BarChart3
                size={18}
                color={designTokens.colors.secondary.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k24')}
              </Typography>
            </Stack>
            {tests.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                {i18n.t('ai.v59-security-panel.k25')}.t('ai.v59-security-panel.k34')开始。
              </Alert>
            ) : (
              <List dense>
                {tests.slice(0, 5).map((test) => (
                  <ListItem
                    key={test.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ alignItems: 'center', mb: 0.5 }}
                      >
                        <Chip
                          size='small'
                          label={ATTACK_TYPE_LABELS[test.attackVector.type]}
                          sx={{
                            height: 18,
                            fontSize: 10,
                            bgcolor: SEVERITY_COLORS[test.attackVector.severity],
                            color: 'common.white',
                          }}
                        />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {new Date(test.details?.timestamp ?? 0).toLocaleTimeString()}
                        </Typography>
                      </Stack>
                      <Grid
                        container
                        spacing={1}
                      >
                        <Grid size={6}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('ai.v59-security-panel.k27')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {(test.success_rate * 100).toFixed(1)}%
                          </Typography>
                        </Grid>
                        <Grid size={6}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('ai.v59-security-panel.k28')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {(test.defense_rate * 100).toFixed(1)}%
                          </Typography>
                        </Grid>
                      </Grid>
                      {test.details?.mitigations_applied &&
                        test.details.mitigations_applied.length > 0 && (
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ mt: 0.5, flexWrap: 'wrap' }}
                          >
                            {test.details.mitigations_applied.map((m, i) => (
                              <Chip
                                key={i}
                                size='small'
                                label={m}
                                variant='outlined'
                                sx={{ fontSize: 10, height: 18 }}
                              />
                            ))}
                          </Stack>
                        )}
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Grid>
  </Grid>
);

const PrivacyTab: React.FC<{
  configs: PrivacyConfig[];
  report: PrivacyReport | null;
  leakageRisk: ReturnType<typeof privacyEnhancer.getDataLeakageRisk>;
  selectedConfig: PrivacyConfig | null;
  onSelectConfig: (c: PrivacyConfig | null) => void;
  onTest: () => void;
  isRunning: boolean;
}> = ({ configs, report, leakageRisk, selectedConfig, onSelectConfig, onTest, isRunning }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Lock
              size={18}
              color='colors.cyan.600'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('ai.v59-security-panel.k29')}
            </Typography>
            <Button
              size='small'
              variant='outlined'
              onClick={onTest}
              disabled={isRunning}
              sx={{ ml: 'auto', fontSize: 11 }}
            >
              <Play
                size={12}
                style={{ marginRight: 3 }}
              />
              {isRunning ? i18n.t('ai.v59-security-panel.k30') : i18n.t('ai.v59-security-panel.k35')}
            </Button>
          </Stack>

          {configs.map((config) => (
            <Paper
              key={config.id}
              variant='outlined'
              sx={{
                p: 1.5,
                mb: 1,
                borderColor: selectedConfig?.id === config.id ? 'colors.cyan.600' : 'divider',
                borderWidth: selectedConfig?.id === config.id ? 2 : 1,
                cursor: 'pointer',
              }}
              onClick={() => onSelectConfig(selectedConfig?.id === config.id ? null : config)}
            >
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center', mb: 0.5 }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {config.description ?? config.id}
                </Typography>
                {config.differential_privacy_enabled ? (
                  <Chip
                    size='small'
                    label={i18n.t('ai.v59-security-panel.dp_31')}
                    color='success'
                    sx={{ height: 18 }}
                  />
                ) : (
                  <Chip
                    size='small'
                    label={i18n.t('ai.v59-security-panel.dp_32')}
                    color='warning'
                    sx={{ height: 18 }}
                  />
                )}
              </Stack>
              <Grid
                container
                spacing={1}
              >
                <Grid size={4}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Epsilon
                  </Typography>
                  <Typography variant='body2'>{config.epsilon}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Delta
                  </Typography>
                  <Typography variant='body2'>{config.delta}</Typography>
                </Grid>
                <Grid size={4}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('ai.v59-security-panel.k33')}
                  </Typography>
                  <Typography variant='body2'>{config.noise_strategy}</Typography>
                </Grid>
              </Grid>
            </Paper>
          ))}

          {selectedConfig && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {i18n.t('ai.v59-security-panel.k34')}
              </Typography>
              <Grid
                container
                spacing={1}
              >
                <Grid size={6}>
                  <TextField
                    size='small'
                    type='number'
                    label='Epsilon'
                    value={selectedConfig.epsilon}
                    onChange={(e) =>
                      privacyEnhancer.updateConfig(selectedConfig.id, {
                        epsilon: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={6}>
                  <FormControl
                    size='small'
                    fullWidth
                  >
                    <InputLabel>{i18n.t('ai.v59-security-panel.k36')}</InputLabel>
                    <Select
                      value={selectedConfig.noise_strategy}
                      label={i18n.t('ai.v59-security-panel.k37')}
                      onChange={(e) =>
                        privacyEnhancer.updateConfig(selectedConfig.id, {
                          noise_strategy: e.target.value as NoiseStrategy,
                        })
                      }
                    >
                      <MenuItem value='gaussian'>{i18n.t('ai.v59-security-panel.k38')}</MenuItem>
                      <MenuItem value='laplace'>{i18n.t('ai.v59-security-panel.k39')}</MenuItem>
                      <MenuItem value='exponential'>{i18n.t('ai.v59-security-panel.k40')}</MenuItem>
                      <MenuItem value='none'>{i18n.t('ai.v59-security-panel.k35')}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Stack spacing={2}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Fingerprint
                size={18}
                color={designTokens.colors.success.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k36')}
              </Typography>
            </Stack>

            {report ? (
              <>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, color: 'cyan.600' }}
                  >
                    {(report.privacy_score * 100).toFixed(0)}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('ai.v59-security-panel.100_37')}
                  </Typography>
                  <LinearProgress
                    variant='determinate'
                    value={report.privacy_score * 100}
                    sx={{ height: 8, borderRadius: 4, mt: 1 }}
                  />
                </Box>

                <Grid
                  container
                  spacing={1}
                  sx={{ mt: 1 }}
                >
                  <Grid size={6}>
                    <RiskItem
                      label={i18n.t('ai.v59-security-panel.k41')}
                      value={report.reidentification_risk}
                      icon={<Eye size={14} />}
                    />
                  </Grid>
                  <Grid size={6}>
                    <RiskItem
                      label={i18n.t('ai.v59-security-panel.k42')}
                      value={report.data_leakage_risk}
                      icon={<Database size={14} />}
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  {i18n.t('ai.v59-security-panel.k38')}
                </Typography>
                {Object.entries(report.breakdown).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{ mb: 0.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ flex: 1 }}
                      >
                        {BREAKDOWN_LABELS[key]}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        {(value * 100).toFixed(0)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={value * 100}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </>
            ) : (
              <Alert
                severity='info'
                variant='outlined'
              >
                {i18n.t('ai.v59-security-panel.i18n_39')}.t('ai.v59-security-panel.k43')生成报告
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <ShieldAlert
                size={18}
                color={
                  leakageRisk.risk_level === 'low'
                    ? designTokens.colors.success.dark
                    : leakageRisk.risk_level === 'medium'
                      ? designTokens.colors.warning.main
                      : leakageRisk.risk_level === 'high'
                        ? `${designTokens.colors.orange['600']}`
                        : designTokens.colors.error.dark
                }
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k41')}
              </Typography>
            </Stack>

            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Chip
                label={`${i18n.t('ai.v59-security-panel.k42')} ${leakageRisk.risk_level}`}
                color={
                  leakageRisk.risk_level === 'low'
                    ? 'success'
                    : leakageRisk.risk_level === 'medium'
                      ? 'warning'
                      : 'error'
                }
                sx={{ fontSize: 14, height: 32 }}
              />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mt: 1 }}
              >
                {(leakageRisk.risk_score * 100).toFixed(1)}%
              </Typography>
            </Box>

            {leakageRisk.factors.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', mb: 1 }}
                >
                  {i18n.t('ai.v59-security-panel.k43')}
                </Typography>
                {leakageRisk.factors.map((factor, i) => (
                  <Box
                    key={i}
                    sx={{ mb: 0.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='caption'
                        sx={{ flex: 1 }}
                      >
                        {factor.factor}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{
                          color: factor.contribution > 0 ? designTokens.colors.error.main : designTokens.colors.success.dark,
                          fontWeight: 600,
                        }}
                      >
                        {factor.contribution > 0 ? '+' : ''}
                        {factor.contribution.toFixed(2)}
                      </Typography>
                    </Stack>
                  </Box>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        {report && report.recommendations.length > 0 && (
          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 1, alignItems: 'center' }}
              >
                <Sparkles
                  size={18}
                  color={designTokens.colors.secondary.main}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('ai.v59-security-panel.k44')}
                </Typography>
              </Stack>
              <List dense>
                {report.recommendations.map((rec, i) => (
                  <ListItem
                    key={i}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{ fontSize: 12 }}
                        >
                          {rec}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Grid>
  </Grid>
);

const BREAKDOWN_LABELS: Record<string, string> = {
  differential_privacy: i18n.t('ai.v59-security-panel.k44'),
  data_anonymization: i18n.t('ai.v59-security-panel.k45'),
  access_control: i18n.t('ai.v59-security-panel.k46'),
  audit_compliance: i18n.t('ai.v59-security-panel.k47'),
};

const ThreatSummaryTab: React.FC<{
  auditSummary: ReturnType<typeof aiSecurityAuditor.getAuditSummary>;
  defenseStatus: ReturnType<typeof adversarialRobustness.getDefenseStatus>;
  privacyReport: PrivacyReport | null;
}> = ({ auditSummary, defenseStatus, privacyReport }) => {
  const overallScore =
    (auditSummary.avg_score +
      (privacyReport?.privacy_score ?? 0.5) +
      defenseStatus.enabled_defenses / Math.max(defenseStatus.total_defenses, 1)) /
    3;

  const criticalFindings = auditSummary.bySeverity.critical;
  const highFindings = auditSummary.bySeverity.high;

  return (
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12, md: 12 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={2}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Shield
                size={24}
                color={designTokens.colors.error.dark}
              />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.ai_45')}
              </Typography>
              <Box sx={{ ml: 'auto', textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color:
                      overallScore > 0.7 ? designTokens.colors.success.dark : overallScore > 0.4 ? designTokens.colors.warning.main : designTokens.colors.error.main,
                  }}
                >
                  {(overallScore * 100).toFixed(0)}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('ai.v59-security-panel.k46')}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <AlertTriangle
                size={18}
                color={designTokens.colors.error.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k47')}
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography
                variant='h3'
                sx={{ fontWeight: 700, color: 'error.600' }}
              >
                {criticalFindings}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-security-panel.k48')}
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, color: 'orange.600' }}
              >
                {highFindings}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-security-panel.k49')}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Lock
                size={18}
                color='colors.cyan.600'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k50')}
              </Typography>
            </Stack>
            {privacyReport ? (
              <>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700 }}
                  >
                    {(privacyReport.privacy_score * 100).toFixed(0)}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('ai.v59-security-panel.k51')}
                  </Typography>
                </Box>
                <Grid
                  container
                  spacing={1}
                >
                  <Grid size={6}>
                    <StatBlock
                      label={i18n.t('ai.v59-security-panel.k48')}
                      value={`${(privacyReport.reidentification_risk * 100).toFixed(0)}%`}
                      color={privacyReport.reidentification_risk < 0.3 ? designTokens.colors.success.dark : designTokens.colors.error.main}
                    />
                  </Grid>
                  <Grid size={6}>
                    <StatBlock
                      label={i18n.t('ai.v59-security-panel.k49')}
                      value={`${(privacyReport.data_leakage_risk * 100).toFixed(0)}%`}
                      color={privacyReport.data_leakage_risk < 0.3 ? designTokens.colors.success.dark : designTokens.colors.error.main}
                    />
                  </Grid>
                </Grid>
              </>
            ) : (
              <Alert
                severity='info'
                variant='outlined'
              >
                {i18n.t('ai.v59-security-panel.k52')}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Shield
                size={18}
                color={designTokens.colors.success.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k53')}
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'teal.500' }}
              >
                {defenseStatus.enabled_defenses}/{defenseStatus.total_defenses}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('ai.v59-security-panel.k54')}
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={
                (defenseStatus.enabled_defenses / Math.max(defenseStatus.total_defenses, 1)) * 100
              }
              sx={{ height: 6, borderRadius: 3, mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 12 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Sparkles
                size={18}
                color={designTokens.colors.secondary.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('ai.v59-security-panel.k55')}
              </Typography>
            </Stack>
            <Grid
              container
              spacing={2}
            >
              {auditSummary.topFindings.map((finding, i) => (
                <Grid
                  size={{ xs: 12, md: 4 }}
                  key={i}
                >
                  <Paper
                    variant='outlined'
                    sx={{ p: 1.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={AUDIT_TYPE_LABELS[finding.type]}
                        sx={{ height: 20, bgcolor: 'error.600', color: 'common.white' }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        {finding.count} 次
                      </Typography>
                    </Stack>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ fontSize: 12 }}
                    >
                      类型 "{AUDIT_TYPE_LABELS[finding.type]}"
                      {i18n.t('ai.v59-security-panel.k56')}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {privacyReport && privacyReport.recommendations.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('ai.v59-security-panel.k57')}
                </Typography>
                <List dense>
                  {privacyReport.recommendations.map((rec, i) => (
                    <ListItem
                      key={i}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{ fontSize: 12 }}
                          >
                            {rec}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const StatBlock: React.FC<{
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}> = ({ label, value, color = 'text.primary', icon }) => (
  <Box sx={{ textAlign: 'center', py: 0.5 }}>
    <Stack
      direction='row'
      spacing={0.5}
      sx={{ justifyContent: 'center', alignItems: 'center' }}
    >
      {icon}
      <Typography
        variant='h6'
        sx={{ color, fontWeight: 600, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
    </Stack>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

const RiskItem: React.FC<{
  label: string;
  value: number;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <Box sx={{ textAlign: 'center', py: 0.5 }}>
    <Stack
      direction='row'
      spacing={0.5}
      sx={{ justifyContent: 'center', alignItems: 'center' }}
    >
      {icon}
      <Typography
        variant='h6'
        sx={{
          fontWeight: 600,
          color: value < 0.3 ? designTokens.colors.success.dark : value < 0.6 ? designTokens.colors.warning.main : designTokens.colors.error.main,
        }}
      >
        {(value * 100).toFixed(0)}%
      </Typography>
    </Stack>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);
