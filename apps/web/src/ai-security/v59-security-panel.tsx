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

type PanelTab = 'audit' | 'robustness' | 'privacy' | 'summary';

const SEVERITY_COLORS: Record<AuditSeverity, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
  info: '#6b7280',
};

const ATTACK_TYPE_LABELS: Record<AttackType, string> = {
  PromptInjection: '提示注入',
  ModelPoisoning: '模型投毒',
  DataExfiltration: '数据泄漏',
  SideChannel: '侧信道',
};

const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  InputValidation: '输入验证',
  OutputFilter: '输出过滤',
  PromptInjection: '提示注入',
  DataLeakage: '数据泄漏',
};

const SAMPLE_MODEL_ID = 'v59-demo-model';

export const V59SecurityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('audit');

  const [audits, setAudits] = useState<AuditResult[]>([]);
  const [auditSummary, setAuditSummary] = useState(() => aiSecurityAuditor.get_audit_summary());
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  const [auditSeverity, setAuditSeverity] = useState<AuditSeverity>('low');

  const [tests, setTests] = useState<RobustnessTest[]>([]);
  const [attackVectors, setAttackVectors] = useState<AttackVector[]>([]);
  const [defenseStatus, setDefenseStatus] = useState(() =>
    adversarialRobustness.get_defense_status()
  );
  const [selectedVector, setSelectedVector] = useState<AttackVector | null>(null);

  const [privacyConfigs, setPrivacyConfigs] = useState<PrivacyConfig[]>([]);
  const [privacyReport, setPrivacyReport] = useState<PrivacyReport | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<PrivacyConfig | null>(null);
  const [leakageRisk, setLeakageRisk] = useState(() =>
    privacyEnhancer.get_data_leakage_risk('config-default')
  );

  const [isRunning, setIsRunning] = useState(false);

  const loadAudits = useCallback(() => {
    setAudits(aiSecurityAuditor.list_audits(10));
    setAuditSummary(aiSecurityAuditor.get_audit_summary());
  }, []);

  const loadRobustness = useCallback(() => {
    setTests(adversarialRobustness.list_tests(SAMPLE_MODEL_ID, 10));
    setAttackVectors(adversarialRobustness.get_attack_vectors());
    setDefenseStatus(adversarialRobustness.get_defense_status());
  }, []);

  const loadPrivacy = useCallback(() => {
    setPrivacyConfigs(privacyEnhancer.list_configs());
    const report = privacyEnhancer.get_privacy_report('config-default');
    setPrivacyReport(report ?? privacyEnhancer.assess_privacy(SAMPLE_MODEL_ID, 'config-default'));
    setLeakageRisk(privacyEnhancer.get_data_leakage_risk('config-default'));
  }, []);

  const runSecurityAudit = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const result = aiSecurityAuditor.run_audit(SAMPLE_MODEL_ID, { severity: auditSeverity });
      setSelectedAudit(result);
      loadAudits();
      setIsRunning(false);
    }, 300);
  }, [auditSeverity, loadAudits]);

  const runRobustnessTest = useCallback((vector: AttackVector) => {
    setIsRunning(true);
    setTimeout(() => {
      const test = adversarialRobustness.run_test(SAMPLE_MODEL_ID, vector.id);
      setTests((prev) => [test, ...prev]);
      setDefenseStatus(adversarialRobustness.get_defense_status());
      setIsRunning(false);
    }, 300);
  }, []);

  const runPrivacyTest = useCallback(() => {
    setIsRunning(true);
    setTimeout(() => {
      const report = privacyEnhancer.assess_privacy(SAMPLE_MODEL_ID, 'config-default');
      setPrivacyReport(report);
      setLeakageRisk(privacyEnhancer.get_data_leakage_risk('config-default'));
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
        bgcolor: 'rgba(0,0,0,0.5)',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
            background: 'linear-gradient(135deg, #dc2626, #ea580c, #d97706)',
            bgcolor: 'linear-gradient(135deg, #dc2626, #ea580c, #d97706)',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield size={24} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              V59.0 AI 安全 — 安全审计 · 对抗鲁棒性 · 隐私增强
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size='small'
              variant='outlined'
              sx={{ borderColor: 'rgba(255,255,255,0.5)', color: 'white' }}
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
              刷新
            </Button>
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'white' }}
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
              label='安全审计'
              value='audit'
            />
            <Tab
              icon={<Target size={16} />}
              iconPosition='start'
              label='对抗鲁棒性'
              value='robustness'
            />
            <Tab
              icon={<Lock size={16} />}
              iconPosition='start'
              label='隐私增强'
              value='privacy'
            />
            <Tab
              icon={<BarChart3 size={16} />}
              iconPosition='start'
              label='威胁模型摘要'
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
  summary: ReturnType<typeof aiSecurityAuditor.get_audit_summary>;
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
              color='#dc2626'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              AI 安全审计结果
            </Typography>
            <Chip
              size='small'
              label={`${audits.length} 条审计`}
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
              <InputLabel>最低严重级别</InputLabel>
              <Select
                value={severity}
                label='最低严重级别'
                onChange={(e) => onSeverityChange(e.target.value as AuditSeverity)}
              >
                <MenuItem value='info'>信息</MenuItem>
                <MenuItem value='low'>低</MenuItem>
                <MenuItem value='medium'>中</MenuItem>
                <MenuItem value='high'>高</MenuItem>
                <MenuItem value='critical'>严重</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant='contained'
              size='small'
              onClick={onRun}
              disabled={isRunning}
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
            >
              <Play
                size={14}
                style={{ marginRight: 4 }}
              />
              {isRunning ? '审计中...' : '运行安全审计'}
            </Button>
          </Stack>

          {selectedAudit && (
            <Alert
              severity={selectedAudit.passed ? 'success' : 'error'}
              variant='outlined'
              sx={{ mb: 2 }}
            >
              审计 {selectedAudit.auditId}: {selectedAudit.passed ? '通过' : '未通过'} · 得分{' '}
              {(selectedAudit.score * 100).toFixed(1)}% · 耗时 {selectedAudit.duration_ms}ms
            </Alert>
          )}

          {audits.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              暂无审计记录。点击"运行安全审计"开始。
            </Alert>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>审计 ID</TableCell>
                    <TableCell>模型</TableCell>
                    <TableCell>得分</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>发现数</TableCell>
                    <TableCell>时间</TableCell>
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
                                    ? '#10b981'
                                    : audit.score >= 0.5
                                      ? '#f59e0b'
                                      : '#ef4444',
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
                            label='通过'
                            color='success'
                          />
                        ) : (
                          <Chip
                            size='small'
                            label='未通过'
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
                审计发现详情
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
                            color: 'white',
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
                        修复建议: {finding.remediation}
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
                color='#dc2626'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                审计概况
              </Typography>
            </Stack>
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <StatBlock
                  label='总审计'
                  value={summary.total_audits}
                  icon={<FileText size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label='通过'
                  value={summary.passed_audits}
                  color='#10b981'
                  icon={<CheckCircle2 size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label='失败'
                  value={summary.failed_audits}
                  color='#ef4444'
                  icon={<XCircle size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label='平均分'
                  value={`${(summary.avg_score * 100).toFixed(0)}%`}
                  color='#0891b2'
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
                color='#f59e0b'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                按类型分布
              </Typography>
            </Stack>
            {Object.entries(summary.by_type).map(([type, count]) => (
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
                color='#8b5cf6'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                修复建议
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
                运行审计后显示建议
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
  defenseStatus: ReturnType<typeof adversarialRobustness.get_defense_status>;
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
              color='#ea580c'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              攻击向量库
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
                    borderColor: selectedVector?.id === v.id ? '#ea580c' : 'divider',
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
                      sx={{ height: 20, bgcolor: SEVERITY_COLORS[v.severity], color: 'white' }}
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
                    防御: {v.mitigation}
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
                      运行测试
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
                color='#0891b2'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                防御状态
              </Typography>
            </Stack>
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <StatBlock
                  label='总防御'
                  value={defenseStatus.total_defenses}
                  icon={<Shield size={14} />}
                />
              </Grid>
              <Grid size={6}>
                <StatBlock
                  label='已启用'
                  value={defenseStatus.enabled_defenses}
                  color='#10b981'
                  icon={<CheckCircle2 size={14} />}
                />
              </Grid>
            </Grid>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mb: 1 }}
            >
              按攻击类型
            </Typography>
            {Object.entries(defenseStatus.by_type).map(([type, data]) => (
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
                  平均有效性: {(data.avg_effectiveness * 100).toFixed(0)}%
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
                color='#8b5cf6'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                最近测试结果
              </Typography>
            </Stack>
            {tests.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无测试记录。点击攻击向量的"运行测试"开始。
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
                            color: 'white',
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
                            攻击成功率
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
                            防御率
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
  leakageRisk: ReturnType<typeof privacyEnhancer.get_data_leakage_risk>;
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
              color='#0891b2'
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              隐私配置
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
              {isRunning ? '评估中...' : '评估隐私'}
            </Button>
          </Stack>

          {configs.map((config) => (
            <Paper
              key={config.id}
              variant='outlined'
              sx={{
                p: 1.5,
                mb: 1,
                borderColor: selectedConfig?.id === config.id ? '#0891b2' : 'divider',
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
                    label='DP 已启用'
                    color='success'
                    sx={{ height: 18 }}
                  />
                ) : (
                  <Chip
                    size='small'
                    label='DP 未启用'
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
                    噪声
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
                更新配置
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
                      privacyEnhancer.update_config(selectedConfig.id, {
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
                    <InputLabel>噪声策略</InputLabel>
                    <Select
                      value={selectedConfig.noise_strategy}
                      label='噪声策略'
                      onChange={(e) =>
                        privacyEnhancer.update_config(selectedConfig.id, {
                          noise_strategy: e.target.value as NoiseStrategy,
                        })
                      }
                    >
                      <MenuItem value='gaussian'>高斯</MenuItem>
                      <MenuItem value='laplace'>拉普拉斯</MenuItem>
                      <MenuItem value='exponential'>指数</MenuItem>
                      <MenuItem value='none'>无</MenuItem>
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
                color='#10b981'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                隐私报告
              </Typography>
            </Stack>

            {report ? (
              <>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, color: '#0891b2' }}
                  >
                    {(report.privacy_score * 100).toFixed(0)}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    隐私评分 (满分 100)
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
                      label='重识别风险'
                      value={report.reidentification_risk}
                      icon={<Eye size={14} />}
                    />
                  </Grid>
                  <Grid size={6}>
                    <RiskItem
                      label='数据泄漏风险'
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
                  评分明细
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
                点击"评估隐私"生成报告
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
                    ? '#10b981'
                    : leakageRisk.risk_level === 'medium'
                      ? '#f59e0b'
                      : leakageRisk.risk_level === 'high'
                        ? '#ea580c'
                        : '#dc2626'
                }
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                泄漏风险分析
              </Typography>
            </Stack>

            <Box sx={{ textAlign: 'center', mb: 1 }}>
              <Chip
                label={`风险等级: ${leakageRisk.risk_level}`}
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
                  风险因素
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
                          color: factor.contribution > 0 ? '#ef4444' : '#10b981',
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
                  color='#8b5cf6'
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  隐私建议
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
  differential_privacy: '差分隐私',
  data_anonymization: '数据匿名化',
  access_control: '访问控制',
  audit_compliance: '审计合规',
};

const ThreatSummaryTab: React.FC<{
  auditSummary: ReturnType<typeof aiSecurityAuditor.get_audit_summary>;
  defenseStatus: ReturnType<typeof adversarialRobustness.get_defense_status>;
  privacyReport: PrivacyReport | null;
}> = ({ auditSummary, defenseStatus, privacyReport }) => {
  const overallScore =
    (auditSummary.avg_score +
      (privacyReport?.privacy_score ?? 0.5) +
      defenseStatus.enabled_defenses / Math.max(defenseStatus.total_defenses, 1)) /
    3;

  const criticalFindings = auditSummary.by_severity.critical;
  const highFindings = auditSummary.by_severity.high;

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
                color='#dc2626'
              />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                AI 安全威胁模型摘要
              </Typography>
              <Box sx={{ ml: 'auto', textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color:
                      overallScore > 0.7 ? '#10b981' : overallScore > 0.4 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {(overallScore * 100).toFixed(0)}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  综合安全评分
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
                color='#dc2626'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                严重威胁
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography
                variant='h3'
                sx={{ fontWeight: 700, color: '#dc2626' }}
              >
                {criticalFindings}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                严重级别发现
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, color: '#ea580c' }}
              >
                {highFindings}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                高级别发现
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
                color='#0891b2'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                隐私保护
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
                    隐私评分
                  </Typography>
                </Box>
                <Grid
                  container
                  spacing={1}
                >
                  <Grid size={6}>
                    <StatBlock
                      label='重识别'
                      value={`${(privacyReport.reidentification_risk * 100).toFixed(0)}%`}
                      color={privacyReport.reidentification_risk < 0.3 ? '#10b981' : '#ef4444'}
                    />
                  </Grid>
                  <Grid size={6}>
                    <StatBlock
                      label='泄漏'
                      value={`${(privacyReport.data_leakage_risk * 100).toFixed(0)}%`}
                      color={privacyReport.data_leakage_risk < 0.3 ? '#10b981' : '#ef4444'}
                    />
                  </Grid>
                </Grid>
              </>
            ) : (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无隐私数据
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
                color='#10b981'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                防御就绪
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: '#10b981' }}
              >
                {defenseStatus.enabled_defenses}/{defenseStatus.total_defenses}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                防御措施已启用
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
                color='#8b5cf6'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                关键建议
              </Typography>
            </Stack>
            <Grid
              container
              spacing={2}
            >
              {auditSummary.top_findings.map((finding, i) => (
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
                        sx={{ height: 20, bgcolor: '#dc2626', color: 'white' }}
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
                      是当前最常见的安全发现类型，建议优先处理。
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
                  隐私保护建议
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
          color: value < 0.3 ? '#10b981' : value < 0.6 ? '#f59e0b' : '#ef4444',
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
