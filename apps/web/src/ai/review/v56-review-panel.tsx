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
} from '@mui/material';
import {
  X as XIcon,
  Shield,
  Code,
  Zap,
  TrendingUp,
  FileText,
  RotateCcw,
  BarChart3,
  Target,
  Lock,
  Gauge,
  Activity,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { V51Card } from '../../design-system/components';
import {
  codeReviewer,
  type ReviewResult,
  type IssueType,
  type IssueSeverity,
} from './code-reviewer';
import { securityScanner, type ScanResult, type SecurityCategory } from './security-scanner';
import { performanceAuditor, type AuditResult, type AuditMetrics } from './performance-auditor';

type TabId = 'code' | 'security' | 'performance' | 'overview';

const SAMPLE_CODE = `
import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function Dashboard({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/data', {
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
    }).then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => {});
  }, [userId]);

  const handleClick = () => {
    eval(someExpression);
    document.write('<div>' + userInput + '</div>');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 dangerouslySetInnerHTML={{ __html: pageTitle }} />
      {data.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
`;

const SAMPLE_DEPENDENCIES: Record<string, string> = {
  react: '18.2.0',
  axios: '1.6.0',
  lodash: '4.17.21',
  'react-router-dom': '6.20.0',
  '@mui/material': '5.15.0',
  jquery: '3.6.0',
};

const SAMPLE_BUNDLES = [
  { name: 'main.js', size: 1800 * 1024, gzipped_size: 450 * 1024, chunk: 'main' },
  { name: 'vendor.js', size: 1200 * 1024, gzipped_size: 320 * 1024, chunk: 'vendor' },
  { name: 'chunk-ai.js', size: 600 * 1024, gzipped_size: 150 * 1024, chunk: 'async' },
  { name: 'styles.css', size: 200 * 1024, gzipped_size: 45 * 1024, chunk: 'styles' },
];

const TYPE_LABELS: Record<IssueType, string> = {
  bug: 'Bug',
  style: '样式',
  performance: '性能',
  security: '安全',
  maintainability: '可维护性',
};

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const CATEGORY_LABELS: Record<SecurityCategory, string> = {
  XSS: '跨站脚本',
  Injection: '注入',
  CSRF: '跨站请求伪造',
  Auth: '认证授权',
  Encryption: '加密',
  Exposure: '信息泄露',
};

const V56ReviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('overview');
  const [reviewResult, setReviewResult] = React.useState<ReviewResult | null>(null);
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [auditResult, setAuditResult] = React.useState<AuditResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [history, setHistory] = React.useState<
    Array<{ time: number; score: number; risk: number; passed: boolean }>
  >([]);

  const runFullAnalysis = () => {
    setIsAnalyzing(true);

    setTimeout(() => {
      const review = codeReviewer.reviewFile(SAMPLE_CODE, 'Dashboard.tsx');
      setReviewResult(review);

      const findings = securityScanner.scanCode(SAMPLE_CODE, 'Dashboard.tsx');
      const depFindings = securityScanner.scanDependencies(SAMPLE_DEPENDENCIES);
      const allFindings = [...findings, ...depFindings];
      const scan = securityScanner.generateReport(allFindings);
      setScanResult(scan);

      const audit = performanceAuditor.auditBundle(SAMPLE_BUNDLES);
      setAuditResult(audit);

      setHistory((prev) => [
        {
          time: Date.now(),
          score: review.score,
          risk: scan.risk_score,
          passed: review.passed && scan.passed,
        },
        ...prev.slice(0, 4),
      ]);

      setIsAnalyzing(false);
    }, 300);
  };

  React.useEffect(() => {
    runFullAnalysis();
  }, []);

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
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V56PanelHeader onClose={onClose} />

        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Gauge size={16} />}
              iconPosition='start'
              label='总览'
              value='overview'
            />
            <Tab
              icon={<Code size={16} />}
              iconPosition='start'
              label={`代码审查${reviewResult ? ` (${reviewResult.issues.length})` : ''}`}
              value='code'
            />
            <Tab
              icon={<Shield size={16} />}
              iconPosition='start'
              label={`安全扫描${scanResult ? ` (${scanResult.findings.length})` : ''}`}
              value='security'
            />
            <Tab
              icon={<Zap size={16} />}
              iconPosition='start'
              label={`性能审计${auditResult ? ` (${auditResult.findings.length})` : ''}`}
              value='performance'
            />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {isAnalyzing && (
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
                <Typography>AI 分析中...</Typography>
              </Stack>
            </Box>
          )}

          {!isAnalyzing &&
            activeTab === 'overview' &&
            reviewResult &&
            scanResult &&
            auditResult && (
              <OverviewTab
                reviewResult={reviewResult}
                scanResult={scanResult}
                auditResult={auditResult}
                history={history}
                onReRun={runFullAnalysis}
              />
            )}

          {!isAnalyzing && activeTab === 'code' && reviewResult && (
            <CodeReviewTab result={reviewResult} />
          )}

          {!isAnalyzing && activeTab === 'security' && scanResult && (
            <SecurityTab result={scanResult} />
          )}

          {!isAnalyzing && activeTab === 'performance' && auditResult && (
            <PerformanceTab result={auditResult} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const V56PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)',
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
          V56.0 AI 代码审查面板
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          代码质量 · 安全扫描 · 性能审计 · 智能分析
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V56'
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

const OverviewTab: React.FC<{
  reviewResult: ReviewResult;
  scanResult: ScanResult;
  auditResult: AuditResult;
  history: Array<{ time: number; score: number; risk: number; passed: boolean }>;
  onReRun: () => void;
}> = ({ reviewResult, scanResult, auditResult, history, onReRun }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
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
          <Gauge size={20} />
          AI 分析总览
        </Typography>
        <Button
          variant='outlined'
          startIcon={<RotateCcw size={14} />}
          onClick={onReRun}
          size='small'
        >
          重新分析
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <ScoreCard
          title='代码质量'
          score={reviewResult.score}
          color={getScoreColor(reviewResult.score)}
          icon={<Code size={24} />}
          subtitle={`${reviewResult.issues.length} 个问题`}
        />
        <ScoreCard
          title='安全评分'
          score={scanResult.risk_score}
          color={getScoreColor(scanResult.risk_score)}
          icon={<Shield size={24} />}
          subtitle={`${scanResult.findings.length} 个发现`}
        />
        <ScoreCard
          title='性能评分'
          score={auditResult.lighthouse_scores.performance}
          color={getScoreColor(auditResult.lighthouse_scores.performance)}
          icon={<Zap size={24} />}
          subtitle={`${auditResult.findings.length} 个建议`}
        />
        <ScoreCard
          title='综合评级'
          score={Math.round(
            (reviewResult.score +
              scanResult.risk_score +
              auditResult.lighthouse_scores.performance) /
              3
          )}
          color={getScoreColor(
            Math.round(
              (reviewResult.score +
                scanResult.risk_score +
                auditResult.lighthouse_scores.performance) /
                3
            )
          )}
          icon={<TrendingUp size={24} />}
          subtitle={
            reviewResult.passed && scanResult.passed && auditResult.optimized ? '通过' : '需改进'
          }
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FileText size={16} />
            代码审查摘要
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {reviewResult.summary}
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {(['error', 'warning', 'info'] as IssueSeverity[]).map((sev) => {
              const count = reviewResult.issues.filter((i) => i.severity === sev).length;
              return (
                <Chip
                  key={sev}
                  label={`${sev}: ${count}`}
                  size='small'
                  sx={{
                    bgcolor: `${SEVERITY_COLORS[sev]}20`,
                    color: SEVERITY_COLORS[sev],
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
              );
            })}
          </Stack>
        </V51Card>

        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Lock size={16} />
            安全扫描摘要
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            共发现 {scanResult.findings.length} 个安全问题，高危 {scanResult.high_risk_count} 个
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ flexWrap: 'wrap', gap: 0.5 }}
          >
            {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
              const count = scanResult.findings.filter((f) => f.severity === sev).length;
              return (
                <Chip
                  key={sev}
                  label={`${sev}: ${count}`}
                  size='small'
                  sx={{
                    bgcolor: count > 0 ? '#fef2f2' : '#f3f4f6',
                    color: count > 0 ? '#991b1b' : '#6b7280',
                    fontWeight: 600,
                    fontSize: 11,
                  }}
                />
              );
            })}
          </Stack>
        </V51Card>

        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Activity size={16} />
            Web Vitals 指标
          </Typography>
          <MetricsList metrics={auditResult.metrics} />
        </V51Card>

        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Target size={16} />
            历史趋势
          </Typography>
          {history.length === 0 ? (
            <Alert
              severity='info'
              sx={{ fontSize: 12 }}
            >
              暂无历史记录
            </Alert>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>时间</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>质量</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>安全</TableCell>
                    <TableCell sx={{ fontSize: 11, fontWeight: 600 }}>状态</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontSize: 11 }}>
                        {new Date(h.time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{h.score}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{h.risk}</TableCell>
                      <TableCell>
                        {h.passed ? (
                          <Chip
                            label='通过'
                            size='small'
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor: 'success.100',
                              color: 'teal.900',
                            }}
                          />
                        ) : (
                          <Chip
                            label='未通过'
                            size='small'
                            sx={{
                              fontSize: 10,
                              height: 18,
                              bgcolor: 'error.50',
                              color: 'error.800',
                            }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </V51Card>
      </Box>
    </Box>
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

const MetricsList: React.FC<{ metrics: AuditMetrics }> = ({ metrics }) => {
  const items = [
    {
      label: 'FCP (首次内容绘制)',
      value: `${metrics.fcp}ms`,
      color: metrics.fcp < 1800 ? '#10b981' : '#f59e0b',
    },
    {
      label: 'LCP (最大内容绘制)',
      value: `${metrics.lcp}ms`,
      color: metrics.lcp < 2500 ? '#10b981' : '#f59e0b',
    },
    {
      label: 'TTI (可交互时间)',
      value: `${metrics.tti}ms`,
      color: metrics.tti < 3500 ? '#10b981' : '#f59e0b',
    },
    {
      label: 'CLS (累计布局偏移)',
      value: metrics.cls.toFixed(2),
      color: metrics.cls < 0.1 ? '#10b981' : '#f59e0b',
    },
  ];

  return (
    <Stack
      direction='column'
      spacing={1}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontSize: 12 }}
          >
            {item.label}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontWeight: 600, color: item.color }}
          >
            {item.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

const CodeReviewTab: React.FC<{ result: ReviewResult }> = ({ result }) => {
  const [filter, setFilter] = React.useState<IssueSeverity | 'all'>('all');
  const [searchText, setSearchText] = React.useState('');

  const filtered = result.issues.filter((i) => {
    if (filter !== 'all' && i.severity !== filter) return false;
    if (searchText && !i.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Code size={20} />
            代码审查
          </Typography>
          <Chip
            label={`${result.issues.length} 个问题`}
            size='small'
            sx={{
              bgcolor: result.passed ? '#d1fae5' : '#fef2f2',
              color: result.passed ? '#065f46' : '#991b1b',
              fontWeight: 600,
            }}
          />
          <Chip
            label={`评分: ${result.score}`}
            size='small'
            sx={{ bgcolor: 'primary.100', color: 'primary.800', fontWeight: 600 }}
          />
        </Stack>
      </Stack>

      <V51Card sx={{ mb: 3 }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {result.summary}
        </Typography>
      </V51Card>

      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2 }}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>严重程度</InputLabel>
          <Select
            value={filter}
            label='严重程度'
            onChange={(e) => setFilter(e.target.value as IssueSeverity | 'all')}
          >
            <MenuItem value='all'>全部</MenuItem>
            <MenuItem value='error'>错误</MenuItem>
            <MenuItem value='warning'>警告</MenuItem>
            <MenuItem value='info'>建议</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size='small'
          placeholder='搜索问题...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>

      {filtered.length === 0 ? (
        <Alert severity='info'>暂无匹配的问题</Alert>
      ) : (
        <V51Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>严重程度</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>文件:行号</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>描述</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>建议</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((issue) => (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Chip
                        label={issue.severity}
                        size='small'
                        sx={{
                          fontSize: 10,
                          height: 20,
                          bgcolor: `${SEVERITY_COLORS[issue.severity]}20`,
                          color: SEVERITY_COLORS[issue.severity],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TYPE_LABELS[issue.type]}
                        size='small'
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                      {issue.file}:{issue.line}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 300 }}>{issue.message}</TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 250 }}>
                      {issue.suggestion}
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

const SecurityTab: React.FC<{ result: ScanResult }> = ({ result }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#d97706';
      case 'low':
        return '#2563eb';
      default:
        return '#6b7280';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Shield size={20} />
            安全扫描
          </Typography>
          <Chip
            label={`${result.findings.length} 个发现`}
            size='small'
            sx={{
              bgcolor: result.passed ? '#d1fae5' : '#fef2f2',
              color: result.passed ? '#065f46' : '#991b1b',
              fontWeight: 600,
            }}
          />
          <Chip
            label={`高危: ${result.high_risk_count}`}
            size='small'
            sx={{ bgcolor: 'error.50', color: 'error.800', fontWeight: 600 }}
          />
          <Chip
            label={`风险评分: ${result.risk_score}`}
            size='small'
            sx={{ bgcolor: 'primary.100', color: 'primary.800', fontWeight: 600 }}
          />
        </Stack>
      </Stack>

      {result.findings.length === 0 ? (
        <Alert severity='success'>未发现安全问题</Alert>
      ) : (
        <V51Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>严重程度</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>类别</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>位置</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>描述</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>修复建议</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.findings.map((finding) => (
                  <TableRow key={finding.id}>
                    <TableCell>
                      <Chip
                        label={finding.severity}
                        size='small'
                        sx={{
                          fontSize: 10,
                          height: 20,
                          bgcolor: `${getSeverityColor(finding.severity)}20`,
                          color: getSeverityColor(finding.severity),
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={CATEGORY_LABELS[finding.category]}
                        size='small'
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, fontFamily: 'monospace' }}>
                      {finding.file}:{finding.line}
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 300 }}>
                      {finding.description}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: 'text.secondary', maxWidth: 250 }}>
                      {finding.remediation}
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

const PerformanceTab: React.FC<{ result: AuditResult }> = ({ result }) => {
  const getLighthouseColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={2}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Zap size={20} />
            性能审计
          </Typography>
          <Chip
            label={result.optimized ? '已优化' : '待优化'}
            size='small'
            sx={{
              bgcolor: result.optimized ? '#d1fae5' : '#fef2f2',
              color: result.optimized ? '#065f46' : '#991b1b',
              fontWeight: 600,
            }}
          />
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 3 }}>
        <V51Card>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <BarChart3 size={16} />
            Lighthouse 评分
          </Typography>
          <Stack
            direction='column'
            spacing={2}
          >
            {Object.entries(result.lighthouse_scores).map(([key, value]) => {
              const labelMap: Record<string, string> = {
                performance: '性能',
                accessibility: '无障碍',
                best_practices: '最佳实践',
                seo: 'SEO',
              };
              return (
                <Box key={key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 13 }}
                    >
                      {labelMap[key] ?? key}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: getLighthouseColor(value) }}
                    >
                      {value}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={value}
                    sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.200' }}
                  />
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
            <Activity size={16} />
            Core Web Vitals
          </Typography>
          <MetricsList metrics={result.metrics} />
        </V51Card>
      </Box>

      <V51Card>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Lightbulb size={16} />
          性能优化建议
        </Typography>
        {result.findings.length === 0 ? (
          <Alert severity='success'>未发现性能问题，表现优秀！</Alert>
        ) : (
          <List dense>
            {result.findings.map((finding) => (
              <ListItem
                key={finding.id}
                sx={{ px: 1, py: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={finding.impact}
                        size='small'
                        sx={{
                          fontSize: 10,
                          height: 18,
                          bgcolor:
                            finding.impact === 'high'
                              ? '#fef2f2'
                              : finding.impact === 'medium'
                                ? '#fffbeb'
                                : '#eff6ff',
                          color:
                            finding.impact === 'high'
                              ? '#991b1b'
                              : finding.impact === 'medium'
                                ? '#92400e'
                                : '#1e40af',
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={finding.category}
                        size='small'
                        sx={{ fontSize: 10, height: 18 }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontSize: 13, fontWeight: 500 }}
                      >
                        {finding.description}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ fontSize: 11 }}
                    >
                      💡 {finding.recommendation}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </V51Card>
    </Box>
  );
};

export { V56ReviewPanel };
