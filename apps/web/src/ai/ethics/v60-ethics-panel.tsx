import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Badge,
} from '@mui/material';
import {
  X as XIcon,
  Shield,
  Scale,
  Eye,
  History,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  Brain,
  FileText,
  RefreshCw,
  Target,
  Sparkles,
  Lock,
  Gauge,
} from 'lucide-react';
import { biasDetector, type BiasReport, type BiasType, type BiasSeverity } from './bias-detection';
import {
  fairnessAssurance,
  type FairnessResult,
  type FairnessType,
  type AuditStatus,
} from './fairness-assurance';
import {
  explainabilityEngine,
  type Explanation,
  type ExplainabilityReport,
  type ExplainabilityMethod,
} from './explainability';
import { designTokens, semanticTokens } from '@topems/tokens';

type PanelTab = 'bias' | 'fairness' | 'explainability' | 'audit';

const SAMPLE_MODEL_ID = 'v60-ethics-demo-model';

const SEVERITY_COLORS: Record<BiasSeverity, string> = {
  critical: designTokens.colors.error.dark,
  high: '#ea580c',
  medium: designTokens.colors.warning.dark,
  low: '#2563eb',
  info: 'colors.grey.500',
};

const BIAS_TYPE_LABELS: Record<BiasType, string> = {
  Gender: '性别',
  Race: '种族',
  Age: '年龄',
  Socioeconomic: '社会经济地位',
};

const FAIRNESS_TYPE_LABELS: Record<FairnessType, string> = {
  Demographic: '人口统计学平等',
  Equalized: '均衡赔率',
  Calibrated: '校准公平',
};

const METHOD_LABELS: Record<ExplainabilityMethod, string> = {
  SHAP: 'SHAP',
  LIME: 'LIME',
  Attention: 'Attention',
};

export const V60EthicsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('bias');
  const [modelId] = useState(SAMPLE_MODEL_ID);

  const [biasReports, setBiasReports] = useState<BiasReport[]>([]);
  const [biasSummary, setBiasSummary] = useState<ReturnType<
    typeof biasDetector.getBiasSummary
  > | null>(null);
  const [selectedBiasTypes, setSelectedBiasTypes] = useState<BiasType[]>([
    'Gender',
    'Race',
    'Age',
    'Socioeconomic',
  ]);

  const [fairnessResults, setFairnessResults] = useState<FairnessResult[]>([]);
  const [fairnessAudit, setFairnessAudit] = useState<ReturnType<
    typeof fairnessAssurance.runFairnessAudit
  > | null>(null);
  const [benchmark, setBenchmark] = useState<ReturnType<
    typeof fairnessAssurance.getFairnessBenchmark
  > | null>(null);

  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [explanationReport, setExplanationReport] = useState<ExplainabilityReport | null>(null);
  const [coverage, setCoverage] = useState<ReturnType<
    typeof explainabilityEngine.getExplainabilityCoverage
  > | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<ExplainabilityMethod>('SHAP');

  const [auditHistory, setAuditHistory] = useState<
    Array<{
      id: string;
      type: 'bias' | 'fairness' | 'explainability';
      status: AuditStatus | BiasSeverity;
      timestamp: number;
      summary: string;
    }>
  >([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadBiasData = useCallback(() => {
    const reports = biasDetector.analyzeBias(modelId, { biasTypes: selectedBiasTypes });
    setBiasReports(reports);
    setBiasSummary(biasDetector.getBiasSummary());
  }, [modelId, selectedBiasTypes]);

  const loadFairnessData = useCallback(() => {
    const results = fairnessAssurance.computeFairness(modelId);
    setFairnessResults([results]);
    setFairnessAudit(fairnessAssurance.runFairnessAudit(modelId));
    setBenchmark(fairnessAssurance.getFairnessBenchmark(modelId));
  }, [modelId]);

  const loadExplainabilityData = useCallback(() => {
    const explanation = explainabilityEngine.getExplanation(`pred-${Date.now()}`, modelId, {
      method: selectedMethod,
    });
    setExplanations([explanation]);
    setExplanationReport(explainabilityEngine.getExplainabilityReport(modelId));
    setCoverage(explainabilityEngine.getExplainabilityCoverage(modelId));
  }, [modelId, selectedMethod]);

  const runFullAnalysis = useCallback(() => {
    setIsAnalyzing(true);

    setTimeout(() => {
      loadBiasData();
      loadFairnessData();
      loadExplainabilityData();

      const now = Date.now();
      setAuditHistory((prev) => [
        {
          id: `audit-${now}`,
          type: 'bias',
          status: 'info',
          timestamp: now,
          summary: 'AI 伦理全量分析完成',
        },
        ...prev,
      ]);

      setIsAnalyzing(false);
    }, 300);
  }, [loadBiasData, loadFairnessData, loadExplainabilityData]);

  useEffect(() => {
    loadBiasData();
    loadFairnessData();
    loadExplainabilityData();

    setAuditHistory([
      {
        id: `init-${Date.now()}`,
        type: 'bias',
        status: 'passed',
        timestamp: Date.now(),
        summary: 'V60 AI 伦理面板初始化完成',
      },
    ]);
  }, [loadBiasData, loadFairnessData, loadExplainabilityData]);

  const toggleBiasType = (type: BiasType) => {
    setSelectedBiasTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
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
            background: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)',
            bgcolor: 'linear-gradient(135deg, #059669, #0d9488, #0891b2)',
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield size={24} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              V60.0 AI 伦理 — 偏见检测 · 公平性保障 · 可解释性
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size='small'
              variant='outlined'
              sx={{ borderColor: 'common.white', color: 'common.white' }}
              onClick={runFullAnalysis}
              disabled={isAnalyzing}
            >
              <RefreshCw
                size={14}
                style={{ marginRight: 4 }}
              />
              {isAnalyzing ? '分析中...' : '全量分析'}
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
              icon={<Users size={16} />}
              iconPosition='start'
              label='偏见检测'
              value='bias'
            />
            <Tab
              icon={<Scale size={16} />}
              iconPosition='start'
              label='公平性保障'
              value='fairness'
            />
            <Tab
              icon={<Eye size={16} />}
              iconPosition='start'
              label='可解释性'
              value='explainability'
            />
            <Tab
              icon={<History size={16} />}
              iconPosition='start'
              label='审计历史'
              value='audit'
            />
          </Tabs>
        </Box>

        <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
          {activeTab === 'bias' && (
            <BiasTab
              reports={biasReports}
              summary={biasSummary}
              selectedTypes={selectedBiasTypes}
              onToggleType={toggleBiasType}
              onAnalyze={loadBiasData}
              rules={biasDetector.listRules()}
              onUpdateThreshold={(ruleId, threshold) => {
                biasDetector.updateBiasThreshold(ruleId, threshold);
                loadBiasData();
              }}
            />
          )}

          {activeTab === 'fairness' && fairnessAudit && benchmark && (
            <FairnessTab
              results={fairnessResults}
              audit={fairnessAudit}
              benchmark={benchmark}
              trends={fairnessAssurance.getFairnessTrends(modelId)}
              onRunAudit={loadFairnessData}
            />
          )}

          {activeTab === 'explainability' && explanationReport && coverage && (
            <ExplainabilityTab
              explanations={explanations}
              report={explanationReport}
              coverage={coverage}
              selectedMethod={selectedMethod}
              onMethodChange={(m) => {
                setSelectedMethod(m);
                setTimeout(loadExplainabilityData, 50);
              }}
              onRefresh={loadExplainabilityData}
              onGenerate={(predictionId) => {
                const exp = explainabilityEngine.getExplanation(predictionId, modelId, {
                  method: selectedMethod,
                });
                setExplanations([exp, ...explanations]);
              }}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTab
              history={auditHistory}
              modelId={modelId}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const BiasTab: React.FC<{
  reports: BiasReport[];
  summary: ReturnType<typeof biasDetector.getBiasSummary> | null;
  selectedTypes: BiasType[];
  onToggleType: (type: BiasType) => void;
  onAnalyze: () => void;
  rules: ReturnType<typeof biasDetector.listRules>;
  onUpdateThreshold: (ruleId: string, threshold: number) => void;
}> = ({ reports, summary, selectedTypes, onToggleType, onAnalyze, rules, onUpdateThreshold }) => (
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
            <AlertTriangle
              size={18}
              color={designTokens.colors.warning.main}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              偏见检测结果
            </Typography>
            {summary && (
              <Chip
                size='small'
                label={`${summary.total_reports} 份报告`}
                color='primary'
                variant='outlined'
              />
            )}
          </Stack>

          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, flexWrap: 'wrap' }}
          >
            {(['Gender', 'Race', 'Age', 'Socioeconomic'] as BiasType[]).map((type) => (
              <Chip
                key={type}
                size='small'
                label={BIAS_TYPE_LABELS[type]}
                color={selectedTypes.includes(type) ? 'primary' : 'default'}
                variant={selectedTypes.includes(type) ? 'filled' : 'outlined'}
                onClick={() => onToggleType(type)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
            <Button
              size='small'
              variant='text'
              onClick={onAnalyze}
              sx={{ ml: 'auto' }}
            >
              <RefreshCw
                size={14}
                style={{ marginRight: 4 }}
              />
              重新分析
            </Button>
          </Stack>

          {reports.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              暂无偏见报告。点击"重新分析"开始检测。
            </Alert>
          ) : (
            <List dense>
              {reports.map((report) => (
                <ListItem
                  key={report.id}
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
                        label={BIAS_TYPE_LABELS[report.biasType]}
                        color='primary'
                        sx={{ textTransform: 'capitalize', height: 20 }}
                      />
                      <Chip
                        size='small'
                        label={report.severity}
                        sx={{
                          bgcolor: SEVERITY_COLORS[report.severity],
                          color: 'common.white',
                          height: 20,
                        }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        {new Date(report.timestamp).toLocaleString('zh-CN')}
                      </Typography>
                    </Stack>
                    {report.findings.map((f, i) => (
                      <Typography
                        key={i}
                        variant='body2'
                        sx={{ color: 'text.secondary', mb: 0.5 }}
                      >
                        {f}
                      </Typography>
                    ))}
                    {report.affectedGroups.length > 0 && (
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {report.affectedGroups.map((g) => (
                          <Chip
                            key={g}
                            size='small'
                            label={g}
                            variant='outlined'
                            sx={{ fontSize: 11 }}
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
    </Grid>

    <Grid size={{ xs: 12, md: 4 }}>
      <Stack spacing={2}>
        {summary && (
          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 2, alignItems: 'center' }}
              >
                <BarChart3
                  size={18}
                  color={designTokens.colors.success.dark}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  统计概况
                </Typography>
              </Stack>
              <Grid
                container
                spacing={1}
              >
                <Grid size={6}>
                  <StatItem
                    label='总报告'
                    value={summary.total_reports}
                  />
                </Grid>
                <Grid size={6}>
                  <StatItem
                    label='受影响模型'
                    value={summary.affected_models}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                按严重程度
              </Typography>
              <Stack
                direction='row'
                spacing={0.5}
                sx={{ flexWrap: 'wrap', mb: 1 }}
              >
                {(Object.keys(summary.bySeverity) as BiasSeverity[]).map((sev) => (
                  <Chip
                    key={sev}
                    size='small'
                    label={`${sev}: ${summary.bySeverity[sev]}`}
                    variant='outlined'
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Stack>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                按偏见类型
              </Typography>
              <Stack
                direction='row'
                spacing={0.5}
                sx={{ flexWrap: 'wrap' }}
              >
                {(Object.keys(summary.byBiasType) as BiasType[]).map((type) => (
                  <Chip
                    key={type}
                    size='small'
                    label={`${BIAS_TYPE_LABELS[type]}: ${summary.byBiasType[type]}`}
                    variant='outlined'
                    sx={{ fontSize: 11 }}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <FileText
                size={18}
                color='colors.cyan.600'
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                偏见规则配置
              </Typography>
            </Stack>
            <List dense>
              {rules.map((rule) => (
                <Box
                  key={rule.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                    mb: 1,
                  }}
                >
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 0.5 }}
                  >
                    <Chip
                      size='small'
                      label={BIAS_TYPE_LABELS[rule.biasType]}
                      sx={{ height: 20 }}
                    />
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 500 }}
                    >
                      {rule.name}
                    </Typography>
                  </Stack>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                  >
                    {rule.description}
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      阈值: {rule.threshold.toFixed(2)}
                    </Typography>
                    <Slider
                      size='small'
                      value={rule.threshold * 100}
                      min={1}
                      max={50}
                      step={1}
                      onChange={(_, v) => onUpdateThreshold(rule.id, (v as number) / 100)}
                      sx={{ flex: 1 }}
                    />
                  </Stack>
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      </Stack>
    </Grid>
  </Grid>
);

const FairnessTab: React.FC<{
  results: FairnessResult[];
  audit: ReturnType<typeof fairnessAssurance.runFairnessAudit>;
  benchmark: ReturnType<typeof fairnessAssurance.getFairnessBenchmark>;
  trends: ReturnType<typeof fairnessAssurance.getFairnessTrends>;
  onRunAudit: () => void;
}> = ({ results, audit, benchmark, trends, onRunAudit }) => (
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
            <Scale
              size={18}
              color={designTokens.colors.success.dark}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              公平性评分仪表盘
            </Typography>
            <Button
              size='small'
              variant='text'
              onClick={onRunAudit}
              sx={{ ml: 'auto' }}
            >
              <RefreshCw
                size={14}
                style={{ marginRight: 4 }}
              />
              重新审计
            </Button>
          </Stack>

          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 4 }}>
              <ScoreCard
                label='公平性总分'
                value={audit.summary.avg_score}
                color={
                  audit.status === 'passed'
                    ? designTokens.colors.success.dark
                    : audit.status === 'warning'
                      ? designTokens.colors.warning.main
                      : designTokens.colors.error.main
                }
                icon={<Gauge size={24} />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <ScoreCard
                label='通过率'
                value={`${audit.summary.passed}/${audit.summary.total_checks}`}
                color={audit.status === 'passed' ? designTokens.colors.success.dark : designTokens.colors.error.main}
                icon={<CheckCircle size={24} />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <ScoreCard
                label='行业排名'
                value={benchmark.ranking}
                color={benchmark.yourScore >= benchmark.industryAverage ? designTokens.colors.success.dark : designTokens.colors.warning.main}
                icon={<TrendingUp size={24} />}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            公平性审计详情
          </Typography>

          {audit.results.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              暂无审计结果。
            </Alert>
          ) : (
            <List dense>
              {audit.results.map((result) => (
                <ListItem
                  key={result.id}
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
                      {result.passed ? (
                        <CheckCircle
                          size={16}
                          color={designTokens.colors.success.dark}
                        />
                      ) : (
                        <XCircle
                          size={16}
                          color={designTokens.colors.error.main}
                        />
                      )}
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {result.passed ? '通过' : '未通过'}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        ID: {result.id}
                      </Typography>
                    </Stack>
                    <Grid
                      container
                      spacing={1}
                    >
                      <Grid size={3}>
                        <MetricBox
                          label='公平分'
                          value={result.fairnessScore.toFixed(3)}
                        />
                      </Grid>
                      <Grid size={3}>
                        <MetricBox
                          label=' parity差'
                          value={result.parityDifference.toFixed(3)}
                        />
                      </Grid>
                      <Grid size={3}>
                        <MetricBox
                          label='校准分'
                          value={result.calibrationScore.toFixed(3)}
                        />
                      </Grid>
                      <Grid size={3}>
                        <MetricBox
                          label='运行时'
                          value={`${result.duration_ms}ms`}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                </ListItem>
              ))}
            </List>
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
              <BarChart3
                size={18}
                color={designTokens.colors.secondary.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                公平性趋势
              </Typography>
            </Stack>
            {trends.length === 0 ? (
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                暂无趋势数据
              </Typography>
            ) : (
              <Stack spacing={1}>
                {trends.slice(-5).map((t, i) => (
                  <Box key={i}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ justifyContent: 'space-between' }}
                    >
                      <Typography variant='caption'>
                        {new Date(t.timestamp).toLocaleTimeString('zh-CN')}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ fontWeight: 600 }}
                      >
                        {t.score.toFixed(2)}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant='determinate'
                      value={t.score * 100}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </Stack>
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
              <Target
                size={18}
                color={designTokens.colors.warning.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                行业基准
              </Typography>
            </Stack>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'teal.600' }}
              >
                {benchmark.yourScore.toFixed(2)}
              </Typography>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                你的公平性得分
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Grid
              container
              spacing={1}
            >
              <Grid size={6}>
                <InfoItem
                  label='行业平均'
                  value={benchmark.industryAverage.toFixed(2)}
                />
              </Grid>
              <Grid size={6}>
                <InfoItem
                  label='顶尖25%'
                  value={benchmark.topQuartile.toFixed(2)}
                />
              </Grid>
              <Grid size={6}>
                <InfoItem
                  label='百分位'
                  value={`${benchmark.percentile}%`}
                />
              </Grid>
              <Grid size={6}>
                <InfoItem
                  label='排名'
                  value={benchmark.ranking}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 1, alignItems: 'center' }}
              >
                <Brain
                  size={18}
                  color='colors.cyan.600'
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  公平性类型详情
                </Typography>
              </Stack>
              <List dense>
                {Object.entries(results[0].details).map(([type, detail]) => {
                  const d = detail as Record<string, unknown>;
                  return (
                    <Box
                      key={type}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                        mb: 1,
                      }}
                    >
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ alignItems: 'center', mb: 0.5 }}
                      >
                        <Chip
                          size='small'
                          label={FAIRNESS_TYPE_LABELS[type as FairnessType]}
                          sx={{ height: 20 }}
                        />
                      </Stack>
                      <Grid
                        container
                        spacing={1}
                      >
                        <Grid size={4}>
                          <InfoItem
                            label='公平分'
                            value={String((d.fairnessScore as number)?.toFixed(3) ?? 'N/A')}
                          />
                        </Grid>
                        <Grid size={4}>
                          <InfoItem
                            label='Parity差'
                            value={String((d.parityDifference as number)?.toFixed(3) ?? 'N/A')}
                          />
                        </Grid>
                        <Grid size={4}>
                          <InfoItem
                            label='校准分'
                            value={String((d.calibrationScore as number)?.toFixed(3) ?? 'N/A')}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Grid>
  </Grid>
);

const ExplainabilityTab: React.FC<{
  explanations: Explanation[];
  report: ExplainabilityReport;
  coverage: ReturnType<typeof explainabilityEngine.getExplainabilityCoverage>;
  selectedMethod: ExplainabilityMethod;
  onMethodChange: (method: ExplainabilityMethod) => void;
  onRefresh: () => void;
  onGenerate: (predictionId: string) => void;
}> = ({
  explanations,
  report,
  coverage,
  selectedMethod,
  onMethodChange,
  onRefresh,
  onGenerate,
}) => {
  const [newPredictionId, setNewPredictionId] = useState('');

  return (
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
              <Eye
                size={18}
                color={designTokens.colors.secondary.main}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                局部可解释性
              </Typography>
              <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                <FormControl
                  size='small'
                  sx={{ minWidth: 120 }}
                >
                  <InputLabel>方法</InputLabel>
                  <Select
                    value={selectedMethod}
                    label='方法'
                    onChange={(e) => onMethodChange(e.target.value as ExplainabilityMethod)}
                  >
                    <MenuItem value='SHAP'>SHAP</MenuItem>
                    <MenuItem value='LIME'>LIME</MenuItem>
                    <MenuItem value='Attention'>Attention</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2 }}
            >
              <TextField
                size='small'
                label='预测 ID'
                value={newPredictionId}
                onChange={(e) => setNewPredictionId(e.target.value)}
                placeholder='pred-xxx'
                sx={{ flex: 1 }}
              />
              <Button
                size='small'
                variant='contained'
                onClick={() => {
                  if (newPredictionId.trim()) {
                    onGenerate(newPredictionId.trim());
                    setNewPredictionId('');
                  }
                }}
                disabled={!newPredictionId.trim()}
              >
                <Sparkles
                  size={14}
                  style={{ marginRight: 4 }}
                />
                生成解释
              </Button>
              <Button
                size='small'
                variant='text'
                onClick={onRefresh}
              >
                <RefreshCw size={14} />
              </Button>
            </Stack>

            {explanations.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无解释数据。
              </Alert>
            ) : (
              <List dense>
                {explanations.map((exp) => (
                  <ListItem
                    key={exp.id}
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
                          label={METHOD_LABELS[exp.method]}
                          color='primary'
                          sx={{ height: 20 }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          预测ID: {exp.predictionId}
                        </Typography>
                        <Chip
                          size='small'
                          label={`置信度: ${(exp.confidence * 100).toFixed(1)}%`}
                          color={exp.confidence > 0.8 ? 'success' : 'warning'}
                          variant='outlined'
                          sx={{ ml: 'auto', height: 20 }}
                        />
                      </Stack>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap', mb: 1 }}
                      >
                        {exp.explanation}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        特征贡献 (Top 5):
                      </Typography>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {Object.entries(exp.features)
                          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                          .slice(0, 5)
                          .map(([feat, val]) => (
                            <Chip
                              key={feat}
                              size='small'
                              label={`${feat}: ${val.toFixed(3)}`}
                              variant='outlined'
                              sx={{
                                fontSize: 11,
                                bgcolor:
                                  val > 0
                                    ? 'rgba(16,185,129,0.1)'
                                    : val < 0
                                      ? 'rgba(239,68,68,0.1)'
                                      : undefined,
                              }}
                            />
                          ))}
                      </Stack>
                    </Box>
                  </ListItem>
                ))}
              </List>
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
                <BarChart3
                  size={18}
                  color={designTokens.colors.secondary.main}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  全局特征重要性
                </Typography>
              </Stack>
              <List dense>
                {report.featureRanking.slice(0, 8).map((item) => (
                  <ListItem
                    key={item.feature}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary', minWidth: 24 }}
                          >
                            #{item.rank}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {item.feature}
                          </Typography>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary', ml: 'auto' }}
                          >
                            {item.shapValue.toFixed(3)}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <LinearProgress
                          variant='determinate'
                          value={Math.min(100, item.shapValue * 100)}
                          sx={{ height: 3, borderRadius: 2, mt: 0.5 }}
                        />
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 2, alignItems: 'center' }}
              >
                <Target
                  size={18}
                  color='#f97316'
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  反事实分析
                </Typography>
              </Stack>
              <List dense>
                {report.counterfactuals.map((cf) => (
                  <Box
                    key={cf.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      mb: 1,
                    }}
                  >
                    <Grid
                      container
                      spacing={1}
                    >
                      <Grid size={6}>
                        <InfoItem
                          label='原始预测'
                          value={cf.originalPrediction.toFixed(3)}
                        />
                      </Grid>
                      <Grid size={6}>
                        <InfoItem
                          label='反事实预测'
                          value={cf.counterfactualPrediction.toFixed(3)}
                        />
                      </Grid>
                      <Grid size={12}>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
                        >
                          改变的特征
                        </Typography>
                        <Stack
                          direction='row'
                          spacing={0.5}
                          sx={{ flexWrap: 'wrap' }}
                        >
                          {cf.changedFeatures.map((f) => (
                            <Chip
                              key={f}
                              size='small'
                              label={f}
                              variant='outlined'
                              sx={{ fontSize: 11 }}
                            />
                          ))}
                        </Stack>
                      </Grid>
                      <Grid size={12}>
                        <LinearProgress
                          variant='determinate'
                          value={cf.distance * 100}
                          sx={{ height: 3, borderRadius: 2 }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          距离: {cf.distance.toFixed(3)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>

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
                  可解释性覆盖
                </Typography>
              </Stack>
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, color: 'cyan.600' }}
                >
                  {(coverage.coverage_rate * 100).toFixed(1)}%
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
                  覆盖率
                </Typography>
              </Box>
              <Grid
                container
                spacing={1}
              >
                <Grid size={6}>
                  <InfoItem
                    label='总预测'
                    value={String(coverage.total_predictions)}
                  />
                </Grid>
                <Grid size={6}>
                  <InfoItem
                    label='已解释'
                    value={String(coverage.explained_predictions)}
                  />
                </Grid>
              </Grid>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                方法分布
              </Typography>
              <Grid
                container
                spacing={1}
              >
                {Object.entries(coverage.byMethod).map(([method, count]) => (
                  <Grid
                    size={4}
                    key={method}
                  >
                    <InfoItem
                      label={method}
                      value={String(count)}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card variant='outlined'>
            <CardContent>
              <Stack
                direction='row'
                spacing={1}
                sx={{ mb: 1, alignItems: 'center' }}
              >
                <AlertTriangle
                  size={16}
                  color={designTokens.colors.warning.main}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  局限性说明
                </Typography>
              </Stack>
              <List dense>
                {report.limitations.map((lim, i) => (
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
                          {lim}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
};

const AuditTab: React.FC<{
  history: Array<{
    id: string;
    type: 'bias' | 'fairness' | 'explainability';
    status: AuditStatus | BiasSeverity;
    timestamp: number;
    summary: string;
  }>;
  modelId: string;
}> = ({ history, modelId }) => {
  const auditHistory = [
    ...history,
    {
      id: `rec-${Date.now()}`,
      type: 'fairness' as const,
      status: 'passed' as const,
      timestamp: Date.now(),
      summary: `模型 ${modelId} 公平性审计通过`,
    },
    {
      id: `rec-${Date.now()}-2`,
      type: 'bias' as const,
      status: 'low' as const,
      timestamp: Date.now() - 3600000,
      summary: `模型 ${modelId} 检测到低级别偏见`,
    },
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <History
                size={18}
                color={designTokens.colors.secondary.dark}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                AI 伦理审计历史
              </Typography>
              <Badge
                badgeContent={auditHistory.length}
                color='primary'
                sx={{ ml: 1 }}
              />
            </Stack>

            {auditHistory.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无审计记录。
              </Alert>
            ) : (
              <List dense>
                {auditHistory.map((entry) => (
                  <ListItem
                    key={entry.id}
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
                        {entry.type === 'bias' && (
                          <Chip
                            size='small'
                            label='偏见检测'
                            color='warning'
                            sx={{ height: 20 }}
                          />
                        )}
                        {entry.type === 'fairness' && (
                          <Chip
                            size='small'
                            label='公平性'
                            color='success'
                            sx={{ height: 20 }}
                          />
                        )}
                        {entry.type === 'explainability' && (
                          <Chip
                            size='small'
                            label='可解释性'
                            color='info'
                            sx={{ height: 20 }}
                          />
                        )}
                        {entry.status === 'passed' || entry.status === 'info' ? (
                          <Chip
                            size='small'
                            label={entry.status}
                            color='success'
                            sx={{ height: 20 }}
                          />
                        ) : entry.status === 'failed' || entry.status === 'critical' ? (
                          <Chip
                            size='small'
                            label={entry.status}
                            color='error'
                            sx={{ height: 20 }}
                          />
                        ) : entry.status === 'warning' || entry.status === 'high' ? (
                          <Chip
                            size='small'
                            label={entry.status}
                            color='warning'
                            sx={{ height: 20 }}
                          />
                        ) : (
                          <Chip
                            size='small'
                            label={entry.status}
                            color='default'
                            sx={{ height: 20 }}
                          />
                        )}
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {new Date(entry.timestamp).toLocaleString('zh-CN')}
                        </Typography>
                      </Stack>
                      <Typography variant='body2'>{entry.summary}</Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const ScoreCard: React.FC<{
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}> = ({ label, value, color, icon }) => (
  <Box
    sx={{
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      textAlign: 'center',
    }}
  >
    <Stack
      direction='row'
      spacing={1}
      sx={{ justifyContent: 'center', mb: 1 }}
    >
      <Box sx={{ color }}>{icon}</Box>
    </Stack>
    <Typography
      variant='h5'
      sx={{ fontWeight: 700, color, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

const StatItem: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label,
  value,
  color = 'text.primary',
}) => (
  <Box sx={{ textAlign: 'center', py: 0.5 }}>
    <Typography
      variant='h6'
      sx={{ color, fontWeight: 600, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

const MetricBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ textAlign: 'center' }}>
    <Typography
      variant='body2'
      sx={{ fontWeight: 600 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary', display: 'block' }}
    >
      {label}
    </Typography>
  </Box>
);

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary', display: 'block' }}
    >
      {label}
    </Typography>
    <Typography
      variant='body2'
      sx={{ fontWeight: 500 }}
    >
      {value}
    </Typography>
  </Box>
);
