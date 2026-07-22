/**
 * AI 智能助手综合页面 - Phase 3
 *
 * 提供报表助手、流程助手、知识库三个智能助手入口。
 *
 * @module pages/ai
 * @path /ai/assistant
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Paper,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  BarChart3,
  Workflow,
  BookOpen,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { assistantApi } from '@/api/ai';
import type {
  ReportAssistantResponse,
  FlowAssistantResponse,
  AnomalyPredictResponse,
  KnowledgeAskResponse,
} from '@/api/ai';
import { BIChartColors } from '@/components/charts/chartTheme';

type TabValue = 'report' | 'flow' | 'knowledge';

const TAB_CONFIG: { value: TabValue; label: string; icon: React.ReactNode }[] = [
  { value: 'report', label: '报表助手', icon: <BarChart3 size={18} /> },
  { value: 'flow', label: '流程助手', icon: <Workflow size={18} /> },
  { value: 'knowledge', label: '知识库', icon: <BookOpen size={18} /> },
];

const DEFAULT_PIE_COLORS = [...BIChartColors.series, '#06B6D4', '#EC4899'];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'high':
      return '高';
    case 'medium':
      return '中';
    case 'low':
      return '低';
    default:
      return severity;
  }
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ label, value, unit, trend }) => {
  const trendIcon =
    trend === 'up' ? (
      <TrendingUp
        size={16}
        color='green'
      />
    ) : trend === 'down' ? (
      <TrendingDown
        size={16}
        color='red'
      />
    ) : (
      <Minus size={16} />
    );

  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700 }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {unit}
          </Typography>
        )}
      </Box>
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
          {trendIcon}
        </Box>
      )}
    </Paper>
  );
};

const ReportResult: React.FC<{ result: ReportAssistantResponse }> = ({ result }) => {
  const xKey = result.x_axis || 'name';
  const yKeys: string[] = result.y_axis
    ? Array.isArray(result.y_axis)
      ? result.y_axis
      : [result.y_axis]
    : result.data.length > 0
      ? Object.keys(result.data[0]).filter(
          (k) => k !== xKey && typeof result.data[0][k] === 'number'
        )
      : [];

  const renderChart = () => {
    switch (result.chart_type) {
      case 'line':
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <LineChart data={result.data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Line
                  key={key}
                  type='monotone'
                  dataKey={key}
                  stroke={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      case 'bar':
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <BarChart data={result.data}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey={xKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
      case 'pie': {
        const pieData = result.data.map((item) => ({
          name: item[xKey] || item.name || item.label || 'Unknown',
          value: Number(item[yKeys[0] || 'value']) || 0,
        }));
        return (
          <ResponsiveContainer
            width='100%'
            height={320}
          >
            <PieChart>
              <Pie
                data={pieData}
                cx='50%'
                cy='50%'
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey='value'
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent || 0) * 100).toFixed(0)}%`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={DEFAULT_PIE_COLORS[index % DEFAULT_PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case 'metric':
        return (
          <Grid
            container
            spacing={2}
          >
            {(result.metrics || []).map((metric, index) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4 }}
                key={`${metric.label}-${index}`}
              >
                <MetricCard
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                />
              </Grid>
            ))}
          </Grid>
        );
      case 'table':
      default: {
        const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];
        return (
          <TableContainer component={Paper}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col}>{col}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {result.data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((col) => (
                      <TableCell key={`${rowIndex}-${col}`}>{String(row[col] ?? '')}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      }
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant='h6'
        sx={{ mb: 1 }}
      >
        {result.title}
      </Typography>
      {result.description && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          {result.description}
        </Typography>
      )}
      {result.sql && (
        <Paper
          sx={{ p: 1.5, mb: 2, bgcolor: 'grey.50' }}
          variant='outlined'
        >
          <Typography
            variant='caption'
            component='pre'
            sx={{ fontFamily: 'monospace', m: 0, whiteSpace: 'pre-wrap' }}
          >
            {result.sql}
          </Typography>
        </Paper>
      )}
      <Paper sx={{ p: 2 }}>{renderChart()}</Paper>
    </Box>
  );
};

const FlowResult: React.FC<{ result: FlowAssistantResponse }> = ({ result }) => (
  <Box sx={{ mt: 3 }}>
    <Typography
      variant='h6'
      sx={{ mb: 1 }}
    >
      {result.title}
    </Typography>
    {result.description && (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {result.description}
      </Typography>
    )}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {result.steps.map((step) => (
        <Paper
          key={step.step}
          sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              label={`步骤 ${step.step}`}
              size='small'
              color='primary'
            />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              {step.name}
            </Typography>
          </Box>
          <Typography
            variant='body2'
            sx={{ mb: 0.5 }}
          >
            {step.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {step.responsible && (
              <Chip
                label={`负责人: ${step.responsible}`}
                size='small'
                variant='outlined'
              />
            )}
            {step.estimated_time && (
              <Chip
                label={`预计耗时: ${step.estimated_time}`}
                size='small'
                variant='outlined'
              />
            )}
          </Box>
        </Paper>
      ))}
    </Box>
    {result.suggestions && result.suggestions.length > 0 && (
      <Box sx={{ mt: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          优化建议
        </Typography>
        {result.suggestions.map((suggestion, index) => (
          <Alert
            key={index}
            severity='info'
            sx={{ mb: 1 }}
          >
            {suggestion}
          </Alert>
        ))}
      </Box>
    )}
  </Box>
);

const AnomalyResult: React.FC<{ result: AnomalyPredictResponse }> = ({ result }) => (
  <Box sx={{ mt: 3 }}>
    <Typography
      variant='h6'
      sx={{ mb: 1 }}
    >
      异常预测结果：{result.metric}
    </Typography>
    <Typography
      variant='body2'
      color='text.secondary'
      sx={{ mb: 2 }}
    >
      {result.summary}
    </Typography>
    <Grid
      container
      spacing={2}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 6 }}>
        <MetricCard
          label='异常数量'
          value={result.anomaly_count}
        />
      </Grid>
    </Grid>
    {result.anomalies.length > 0 && (
      <TableContainer component={Paper}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>时间</TableCell>
              <TableCell>实际值</TableCell>
              <TableCell>预期值</TableCell>
              <TableCell>严重程度</TableCell>
              <TableCell>原因</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {result.anomalies.map((anomaly, index) => (
              <TableRow key={index}>
                <TableCell>{anomaly.timestamp}</TableCell>
                <TableCell>{anomaly.value}</TableCell>
                <TableCell>{anomaly.expected ?? '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={getSeverityLabel(anomaly.severity)}
                    color={
                      getSeverityColor(anomaly.severity) as 'error' | 'warning' | 'info' | 'default'
                    }
                    size='small'
                  />
                </TableCell>
                <TableCell>{anomaly.reason ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    )}
    {result.suggestions && result.suggestions.length > 0 && (
      <Box sx={{ mt: 2 }}>
        {result.suggestions.map((suggestion, index) => (
          <Alert
            key={index}
            severity='warning'
            sx={{ mb: 1 }}
          >
            {suggestion}
          </Alert>
        ))}
      </Box>
    )}
  </Box>
);

const KnowledgeResult: React.FC<{ result: KnowledgeAskResponse }> = ({ result }) => (
  <Box sx={{ mt: 3 }}>
    <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Sparkles size={18} />
        <Typography
          variant='subtitle1'
          sx={{ fontWeight: 600 }}
        >
          AI 回答
        </Typography>
      </Box>
      <Typography
        variant='body1'
        sx={{ whiteSpace: 'pre-wrap' }}
      >
        {result.answer}
      </Typography>
    </Paper>
    <Box sx={{ mt: 2 }}>
      <Typography
        variant='subtitle2'
        sx={{ mb: 1 }}
      >
        参考来源
      </Typography>
      {result.sources.map((source, index) => (
        <Paper
          key={index}
          sx={{ p: 2, mb: 1 }}
          variant='outlined'
        >
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {source.title}
          </Typography>
          {source.content && (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {source.content}
            </Typography>
          )}
          {source.relevance !== undefined && (
            <Chip
              label={`相关度: ${(source.relevance * 100).toFixed(0)}%`}
              size='small'
              sx={{ mt: 0.5 }}
            />
          )}
        </Paper>
      ))}
    </Box>
    {result.follow_up_questions && result.follow_up_questions.length > 0 && (
      <Box sx={{ mt: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          推荐追问
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {result.follow_up_questions.map((question, index) => (
            <Chip
              key={index}
              label={question}
              variant='outlined'
              size='small'
            />
          ))}
        </Box>
      </Box>
    )}
  </Box>
);

export const AiAssistantPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [activeTab, setActiveTab] = useState<TabValue>('report');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // report form
  const [reportQuery, setReportQuery] = useState('');
  const [reportDataSource, setReportDataSource] = useState('');
  const [reportTimeRange, setReportTimeRange] = useState('');
  const [reportResult, setReportResult] = useState<ReportAssistantResponse | null>(null);

  // flow form
  const [flowQuery, setFlowQuery] = useState('');
  const [flowModule, setFlowModule] = useState('');
  const [flowResult, setFlowResult] = useState<FlowAssistantResponse | null>(null);

  // anomaly form (integrated in flow tab as advanced capability)
  const [anomalyMetric, setAnomalyMetric] = useState('');
  const [anomalyTimeRange, setAnomalyTimeRange] = useState('');
  const [anomalyResult, setAnomalyResult] = useState<AnomalyPredictResponse | null>(null);

  // knowledge form
  const [knowledgeQuestion, setKnowledgeQuestion] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [knowledgeResult, setKnowledgeResult] = useState<KnowledgeAskResponse | null>(null);

  const handleTabChange = (_: React.SyntheticEvent, value: TabValue) => {
    setActiveTab(value);
    setError(null);
  };

  const handleReportSubmit = async () => {
    if (!reportQuery.trim()) {
      setError('请输入报表需求');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.reportAssistant({
        query: reportQuery,
        data_source: reportDataSource || undefined,
        time_range: reportTimeRange || undefined,
      });
      if (response.success && response.data) {
        setReportResult(response.data);
      } else {
        setError(response.message || '生成报表失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      addNotification({ title: '报表助手', message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFlowSubmit = async () => {
    if (!flowQuery.trim()) {
      setError('请输入流程问题');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.flowAssistant({
        query: flowQuery,
        module: flowModule || undefined,
      });
      if (response.success && response.data) {
        setFlowResult(response.data);
      } else {
        setError(response.message || '流程分析失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      addNotification({ title: '流程助手', message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAnomalySubmit = async () => {
    if (!anomalyMetric.trim()) {
      setError('请输入监控指标');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.anomalyPredict({
        metric: anomalyMetric,
        time_range: anomalyTimeRange || undefined,
      });
      if (response.success && response.data) {
        setAnomalyResult(response.data);
      } else {
        setError(response.message || '异常预测失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      addNotification({ title: '异常预测', message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleKnowledgeSubmit = async () => {
    if (!knowledgeQuestion.trim()) {
      setError('请输入问题');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await assistantApi.knowledgeAsk({
        question: knowledgeQuestion,
        knowledge_base: knowledgeBase || undefined,
      });
      if (response.success && response.data) {
        setKnowledgeResult(response.data);
      } else {
        setError(response.message || '知识库查询失败');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '请求失败';
      setError(message);
      addNotification({ title: '知识库', message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title='AI 智能助手'
      subtitle='报表分析、流程优化、知识问答一站式智能助手'
    >
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant='scrollable'
          scrollButtons='auto'
        >
          {TAB_CONFIG.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {activeTab === 'report' && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2 }}
            >
              报表助手
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              用自然语言描述您想要的报表，AI 将自动生成图表和数据分析。
            </Typography>
            <TextField
              fullWidth
              label='报表需求'
              placeholder='例如：展示最近一个月各产品线的销售额趋势'
              value={reportQuery}
              onChange={(e) => setReportQuery(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label='数据源'
                placeholder='例如：sales_order'
                value={reportDataSource}
                onChange={(e) => setReportDataSource(e.target.value)}
                fullWidth
              />
              <TextField
                label='时间范围'
                placeholder='例如：last_30_days'
                value={reportTimeRange}
                onChange={(e) => setReportTimeRange(e.target.value)}
                fullWidth
              />
            </Box>
            <Button
              variant='contained'
              startIcon={
                loading ? (
                  <CircularProgress
                    size={18}
                    color='inherit'
                  />
                ) : (
                  <Send size={18} />
                )
              }
              onClick={handleReportSubmit}
              disabled={loading || !reportQuery.trim()}
            >
              生成报表
            </Button>
          </Paper>
          {reportResult && <ReportResult result={reportResult} />}
        </Box>
      )}

      {activeTab === 'flow' && (
        <Box>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2 }}
            >
              流程助手
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              描述业务场景或流程问题，AI 将给出标准化流程步骤和优化建议。
            </Typography>
            <TextField
              fullWidth
              label='流程问题'
              placeholder='例如：请描述新员工入职审批流程'
              value={flowQuery}
              onChange={(e) => setFlowQuery(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label='业务模块（可选）'
              placeholder='例如：hrm'
              value={flowModule}
              onChange={(e) => setFlowModule(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant='contained'
              startIcon={
                loading ? (
                  <CircularProgress
                    size={18}
                    color='inherit'
                  />
                ) : (
                  <Send size={18} />
                )
              }
              onClick={handleFlowSubmit}
              disabled={loading || !flowQuery.trim()}
            >
              分析流程
            </Button>
          </Paper>
          {flowResult && <FlowResult result={flowResult} />}

          <Divider sx={{ my: 3 }} />

          <Paper sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2 }}
            >
              异常预测
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              输入关键业务指标，AI 将基于历史数据预测潜在异常。
            </Typography>
            <TextField
              fullWidth
              label='监控指标'
              placeholder='例如：production_defect_rate'
              value={anomalyMetric}
              onChange={(e) => setAnomalyMetric(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label='时间范围（可选）'
              placeholder='例如：last_7_days'
              value={anomalyTimeRange}
              onChange={(e) => setAnomalyTimeRange(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant='outlined'
              startIcon={
                loading ? (
                  <CircularProgress
                    size={18}
                    color='inherit'
                  />
                ) : (
                  <Send size={18} />
                )
              }
              onClick={handleAnomalySubmit}
              disabled={loading || !anomalyMetric.trim()}
            >
              预测异常
            </Button>
          </Paper>
          {anomalyResult && <AnomalyResult result={anomalyResult} />}
        </Box>
      )}

      {activeTab === 'knowledge' && (
        <Box>
          <Paper sx={{ p: 3 }}>
            <Typography
              variant='h6'
              sx={{ mb: 2 }}
            >
              知识库问答
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              向企业知识库提问，AI 将基于知识库内容给出答案和来源。
            </Typography>
            <TextField
              fullWidth
              label='问题'
              placeholder='例如：如何申请采购审批？'
              value={knowledgeQuestion}
              onChange={(e) => setKnowledgeQuestion(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label='知识库（可选）'
              placeholder='例如：company_policy'
              value={knowledgeBase}
              onChange={(e) => setKnowledgeBase(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              variant='contained'
              startIcon={
                loading ? (
                  <CircularProgress
                    size={18}
                    color='inherit'
                  />
                ) : (
                  <Send size={18} />
                )
              }
              onClick={handleKnowledgeSubmit}
              disabled={loading || !knowledgeQuestion.trim()}
            >
              提问
            </Button>
          </Paper>
          {knowledgeResult && <KnowledgeResult result={knowledgeResult} />}
        </Box>
      )}
    </PageContainer>
  );
};

export default AiAssistantPage;
