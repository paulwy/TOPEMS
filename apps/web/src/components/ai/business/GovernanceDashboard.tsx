import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Gauge,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

export interface GovernanceDashboardData {
  overall_score: number;
  governance_level: string;
  key_metrics: {
    total_requests: number;
    successful_requests: number;
    failed_requests: number;
    success_rate: number;
    total_tokens: number;
    average_response_ms: number;
    p95_response_ms: number;
    active_users: number;
    active_agents: number;
    total_tool_calls: number;
    cache_hit_rate: number;
  };
  risk_assessment: {
    overall_risk_level: string;
    risk_score: number;
    high_risk_items: Array<{
      risk_id: string;
      category: string;
      description: string;
      level: string;
      impact: string;
      recommendation: string;
    }>;
  };
  compliance_status: {
    overall_compliance_rate: number;
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
  };
  cost_analysis: {
    total_cost: number;
    currency: string;
    llm_cost: number;
    tool_cost: number;
    budget_usage: {
      total_budget: number;
      used_amount: number;
      usage_percent: number;
      is_over_budget: boolean;
    };
  };
}

interface GovernanceDashboardProps {
  data: GovernanceDashboardData;
  compact?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return '#2e7d32';
  if (score >= 75) return '#558b2f';
  if (score >= 60) return '#f9a825';
  if (score >= 40) return '#ef6c00';
  return '#c62828';
};

const getRiskColor = (level: string): string => {
  switch (level) {
    case 'low': return '#2e7d32';
    case 'medium': return '#f9a825';
    case 'high': return '#ef6c00';
    case 'critical': return '#c62828';
    default: return '#757575';
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const GovernanceDashboard: React.FC<GovernanceDashboardProps> = ({
  data,
  compact = false,
}) => {
  const theme = useTheme();

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    color: string;
    progress?: number;
  }> = ({ title, value, subtitle, icon, color, progress }) => (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {title}
          </Typography>
          <Box sx={{ color, display: 'flex' }}>{icon}</Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.min(progress, 100)}
            sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: `${color}20`, '& .MuiLinearProgress-bar': { bgcolor: color } }}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* 总体评分 */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: `linear-gradient(135deg, ${getScoreColor(data.overall_score)}15 0%, ${theme.palette.background.paper} 100%)`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              AI 治理仪表盘
            </Typography>
            <Typography variant="body2" color="text.secondary">
              实时监控 AI 系统的治理状况、风险和合规性
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ fontWeight: 800, color: getScoreColor(data.overall_score) }}>
                {data.overall_score.toFixed(1)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                治理评分
              </Typography>
            </Box>
            <Chip
              label={data.governance_level}
              sx={{
                bgcolor: getScoreColor(data.overall_score),
                color: 'white',
                fontWeight: 600,
                px: 1,
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* 关键指标 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="总请求数"
            value={formatNumber(data.key_metrics.total_requests)}
            icon={<Gauge size={18} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="成功率"
            value={`${data.key_metrics.success_rate.toFixed(1)}%`}
            icon={<CheckCircle size={18} />}
            color="#2e7d32"
            progress={data.key_metrics.success_rate}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="平均响应"
            value={`${data.key_metrics.average_response_ms.toFixed(0)}ms`}
            subtitle={`P95: ${data.key_metrics.p95_response_ms.toFixed(0)}ms`}
            icon={<Clock size={18} />}
            color="#f57c00"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="Token 使用"
            value={formatNumber(data.key_metrics.total_tokens)}
            icon={<TrendingUp size={18} />}
            color="#7b1fa2"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="活跃用户"
            value={formatNumber(data.key_metrics.active_users)}
            icon={<Users size={18} />}
            color="#0097a7"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <MetricCard
            title="缓存命中"
            value={`${data.key_metrics.cache_hit_rate.toFixed(1)}%`}
            icon={<Shield size={18} />}
            color="#558b2f"
            progress={data.key_metrics.cache_hit_rate}
          />
        </Grid>
      </Grid>

      {!compact && (
        <Grid container spacing={2}>
          {/* 风险评估 */}
          <Grid item xs={12} md={6}>
            <Card elevation={1} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AlertTriangle size={20} style={{ color: getRiskColor(data.risk_assessment.overall_risk_level) }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    风险评估
                  </Typography>
                  <Chip
                    label={data.risk_assessment.overall_risk_level}
                    size="small"
                    sx={{
                      ml: 'auto',
                      bgcolor: getRiskColor(data.risk_assessment.overall_risk_level),
                      color: 'white',
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">风险评分</Typography>
                    <Typography variant="caption" fontWeight={600}>{data.risk_assessment.risk_score.toFixed(1)}/100</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={data.risk_assessment.risk_score}
                    sx={{ height: 6, borderRadius: 3, bgcolor: `${getRiskColor(data.risk_assessment.overall_risk_level)}20`, '& .MuiLinearProgress-bar': { bgcolor: getRiskColor(data.risk_assessment.overall_risk_level) } }}
                  />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  高风险项 ({data.risk_assessment.high_risk_items.length})
                </Typography>

                <Stack spacing={1}>
                  {data.risk_assessment.high_risk_items.slice(0, 3).map((item) => (
                    <Paper key={item.risk_id} variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <XCircle size={16} style={{ color: getRiskColor(item.level), marginTop: 2, flexShrink: 0 }} />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.25 }}>
                            {item.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.category} · {item.impact}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* 合规与成本 */}
          <Grid item xs={12} md={6}>
            <Stack spacing={2} sx={{ height: '100%' }}>
              {/* 合规状态 */}
              <Card elevation={1}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Shield size={20} style={{ color: '#1976d2' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      合规状态
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">总体合规率</Typography>
                        <Typography variant="caption" fontWeight={600}>{data.compliance_status.overall_compliance_rate.toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={data.compliance_status.overall_compliance_rate}
                        sx={{ height: 8, borderRadius: 4, bgcolor: '#1976d220', '& .MuiLinearProgress-bar': { bgcolor: '#1976d2' } }}
                      />
                    </Box>
                  </Box>

                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {data.compliance_status.total_checks}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">总检查</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1, borderColor: '#2e7d3250' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2e7d32' }}>
                          {data.compliance_status.passed_checks}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">通过</Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={4}>
                      <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', borderRadius: 1, borderColor: '#c6282850' }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#c62828' }}>
                          {data.compliance_status.failed_checks}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">失败</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* 成本分析 */}
              <Card elevation={1}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <DollarSign size={20} style={{ color: '#558b2f' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      成本分析
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {data.cost_analysis.total_cost.toLocaleString()}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {data.cost_analysis.currency}
                    </Typography>
                  </Box>

                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">LLM 成本</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {data.cost_analysis.llm_cost.toLocaleString()} {data.cost_analysis.currency}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">工具成本</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {data.cost_analysis.tool_cost.toLocaleString()} {data.cost_analysis.currency}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 1.5 }} />

                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        预算使用 ({data.cost_analysis.budget_usage.used_amount.toLocaleString()} / {data.cost_analysis.budget_usage.total_budget.toLocaleString()})
                      </Typography>
                      <Typography variant="caption" fontWeight={600} color={data.cost_analysis.budget_usage.is_over_budget ? 'error' : 'primary'}>
                        {data.cost_analysis.budget_usage.usage_percent.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(data.cost_analysis.budget_usage.usage_percent, 100)}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: data.cost_analysis.budget_usage.is_over_budget ? '#c6282820' : '#558b2f20',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: data.cost_analysis.budget_usage.is_over_budget ? '#c62828' : '#558b2f',
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default GovernanceDashboard;
