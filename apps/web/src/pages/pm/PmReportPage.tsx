import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, CheckCircle, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Badge,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { pmApi } from '@/api/pm';
import type { PmStatistics, ProjectBenefit } from '@/api/pm';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type { StatCard, ChartConfig } from '@/components/templates/StatsPageTemplate';
import { PageContainer } from '@/components/common';
import { PM_PATHS } from '@/modules/pm/config';

const PmReportPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [stats, setStats] = useState<PmStatistics>({
    total_projects: 0,
    draft_projects: 0,
    pending_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    cancelled_projects: 0,
    total_contracts: 0,
    pending_contracts: 0,
    active_contracts: 0,
    completed_contracts: 0,
    total_budget: 0,
    spent_budget: 0,
    budget_usage_rate: 0,
    on_time_projects: 0,
    delayed_projects: 0,
    average_progress: 0,
    high_risk_projects: 0,
    medium_risk_projects: 0,
    low_risk_projects: 0,
  });
  const [benefits, setBenefits] = useState<ProjectBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    loadReportData();
  }, [params.projectId, selectedPeriod]);

  const loadReportData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResponse, benefitsResponse] = await Promise.all([
        pmApi.getStatistics(),
        params.projectId
          ? pmApi.benefits.list(params.projectId)
          : Promise.resolve({ success: true, data: { benefits: [] } }),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (benefitsResponse.success && benefitsResponse.data) {
        setBenefits(benefitsResponse.data.benefits || []);
      }
    } catch (error: unknown) {
      setError('加载报表数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      benefits,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statCards: StatCard[] = useMemo(
    () => [
      {
        id: 'total-projects',
        title: '项目总数',
        value: stats.total_projects,
        icon: <Calendar size={20} />,
        color: 'primary',
      },
      {
        id: 'completed-projects',
        title: '已完成',
        value: stats.completed_projects,
        icon: <CheckCircle size={20} />,
        color: 'success',
      },
      {
        id: 'budget-usage',
        title: '预算使用率',
        value: `${stats.budget_usage_rate}%`,
        icon: <DollarSign size={20} />,
        color: 'warning',
      },
      {
        id: 'high-risk',
        title: '高风险项目',
        value: stats.high_risk_projects,
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
    ],
    [stats]
  );

  const projectStatusData = useMemo(
    () =>
      [
        { name: '草稿', value: stats.draft_projects, fill: 'grey.500' },
        { name: '待审批', value: stats.pending_projects, fill: 'warning.main' },
        { name: '进行中', value: stats.active_projects, fill: 'primary.main' },
        { name: '已完成', value: stats.completed_projects, fill: 'success.main' },
        { name: '已取消', value: stats.cancelled_projects, fill: 'error.main' },
      ].filter((d) => d.value > 0),
    [stats]
  );

  const riskData = useMemo(
    () =>
      [
        { name: '高风险', value: stats.high_risk_projects, fill: 'error.main' },
        { name: '中风险', value: stats.medium_risk_projects, fill: 'warning.main' },
        { name: '低风险', value: stats.low_risk_projects, fill: 'success.main' },
      ].filter((d) => d.value > 0),
    [stats]
  );

  const trendData = useMemo(
    () =>
      benefits.slice(0, 6).map((b, index) => ({
        month: `第${index + 1}期`,
        cpi: b.cpi,
        spi: b.spi,
      })),
    [benefits]
  );

  const budgetUtilization = useMemo(
    () => (stats.total_budget > 0 ? (stats.spent_budget / stats.total_budget) * 100 : 0),
    [stats]
  );

  const renderCustomCharts = () => (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        数据图表
      </Typography>

      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}
      >
        <Card>
          <CardHeader>
            <Typography variant='h6'>项目状态分布</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey='value'
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 个`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Typography variant='h6'>风险分布</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <PieChart>
                  <Pie
                    data={riskData}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={60}
                    dataKey='value'
                  >
                    {riskData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [`${value} 个项目`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant='h6'>CPI/SPI 趋势分析</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <LineChart
                data={trendData.length > 0 ? trendData : [{ month: '暂无数据', cpi: 1, spi: 1 }]}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='month' />
                <YAxis domain={[0.5, 1.5]} />
                <Tooltip />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='cpi'
                  name='CPI'
                  stroke='primary.main'
                  strokeWidth={2}
                />
                <Line
                  type='monotone'
                  dataKey='spi'
                  name='SPI'
                  stroke='success.main'
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant='h6'>预算执行情况</Typography>
        </CardHeader>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600' }}
            >
              预算利用率
            </Typography>
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium', color: 'grey.900' }}
            >
              {budgetUtilization.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant='determinate'
            value={budgetUtilization}
            sx={{ height: 16 }}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'blue.600' }}
              >
                总预算
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'blue.800' }}
              >
                {stats.total_budget.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'green.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'green.600' }}
              >
                已使用
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'green.800' }}
              >
                {stats.spent_budget.toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                剩余
              </Typography>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold', color: 'grey.800' }}
              >
                {(stats.total_budget - stats.spent_budget).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant='h6'>项目进度统计</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={[
                  { name: '准时', value: stats.on_time_projects },
                  { name: '延迟', value: stats.delayed_projects },
                ].filter((d) => d.value > 0)}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey='value'
                  name='项目数'
                >
                  <Cell fill='success.main' />
                  <Cell fill='error.main' />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderBenefitsTable = () => (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 2 }}
      >
        效益指标汇总
      </Typography>
      <Card>
        <CardContent>
          {benefits.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>期间</TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SPI
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      CV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      SV
                    </TableCell>
                    <TableCell
                      align='right'
                      sx={{ fontWeight: 'medium', color: 'grey.600' }}
                    >
                      ROI
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {benefits.map((benefit, index) => (
                    <TableRow
                      key={benefit.id}
                      hover
                    >
                      <TableCell sx={{ color: 'grey.900' }}>第{index + 1}期</TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.cpi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.cpi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.cpi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell align='right'>
                        <Badge
                          sx={{
                            bgcolor: benefit.spi >= 1 ? 'green.100' : 'red.100',
                            color: benefit.spi >= 1 ? 'green.800' : 'red.800',
                          }}
                        >
                          {benefit.spi.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.cv.toLocaleString()}
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ color: 'grey.600' }}
                      >
                        {benefit.sv.toLocaleString()}
                      </TableCell>
                      <TableCell align='right'>
                        <Typography
                          component='span'
                          sx={{ color: benefit.roi >= 0 ? 'green.600' : 'red.600' }}
                        >
                          {(benefit.roi * 100).toFixed(2)}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
              <TrendingUp sx={{ width: 48, height: 48, mx: 'auto', mb: 2, color: 'grey.300' }} />
              <Typography>暂无效益数据</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  const customToolbar = useMemo(
    () => (
      <Box>
        {params.projectId && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: 2 }}>
              <Button
                variant='outlined'
                onClick={() => navigate(PM_PATHS.reports)}
              >
                返回全局报表
              </Button>
            </CardContent>
          </Card>
        )}

        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          数据图表
        </Typography>

        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}
        >
          <Card>
            <CardHeader>
              <Typography variant='h6'>项目状态分布</Typography>
            </CardHeader>
            <CardContent>
              <Box sx={{ height: 256 }}>
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                >
                  <PieChart>
                    <Pie
                      data={projectStatusData}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      dataKey='value'
                    >
                      {projectStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} 个`, '数量']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Typography variant='h6'>风险分布</Typography>
            </CardHeader>
            <CardContent>
              <Box sx={{ height: 256 }}>
                <ResponsiveContainer
                  width='100%'
                  height='100%'
                >
                  <PieChart>
                    <Pie
                      data={riskData}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      outerRadius={60}
                      dataKey='value'
                    >
                      {riskData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => [`${value} 个项目`, '数量']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card sx={{ mb: 3 }}>
          <CardHeader>
            <Typography variant='h6'>CPI/SPI 趋势分析</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <LineChart
                  data={trendData.length > 0 ? trendData : [{ month: '暂无数据', cpi: 1, spi: 1 }]}
                >
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='month' />
                  <YAxis domain={[0.5, 1.5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='cpi'
                    name='CPI'
                    stroke='primary.main'
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='spi'
                    name='SPI'
                    stroke='success.main'
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader>
            <Typography variant='h6'>预算执行情况</Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                预算利用率
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 'medium', color: 'grey.900' }}
              >
                {budgetUtilization.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={budgetUtilization}
              sx={{ height: 16 }}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 1 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'blue.600' }}
                >
                  总预算
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'blue.800' }}
                >
                  {stats.total_budget.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'green.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'green.600' }}
                >
                  已使用
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'green.800' }}
                >
                  {stats.spent_budget.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.600' }}
                >
                  剩余
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold', color: 'grey.800' }}
                >
                  {(stats.total_budget - stats.spent_budget).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardHeader>
            <Typography variant='h6'>项目进度统计</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <BarChart
                  data={[
                    { name: '准时', value: stats.on_time_projects },
                    { name: '延迟', value: stats.delayed_projects },
                  ].filter((d) => d.value > 0)}
                >
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey='value'
                    name='项目数'
                  >
                    <Cell fill='success.main' />
                    <Cell fill='error.main' />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>

        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          效益指标汇总
        </Typography>
        <Card>
          <CardContent>
            {benefits.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>期间</TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'medium', color: 'grey.600' }}
                      >
                        CPI
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'medium', color: 'grey.600' }}
                      >
                        SPI
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'medium', color: 'grey.600' }}
                      >
                        CV
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'medium', color: 'grey.600' }}
                      >
                        SV
                      </TableCell>
                      <TableCell
                        align='right'
                        sx={{ fontWeight: 'medium', color: 'grey.600' }}
                      >
                        ROI
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {benefits.map((benefit, index) => (
                      <TableRow
                        key={benefit.id}
                        hover
                      >
                        <TableCell sx={{ color: 'grey.900' }}>第{index + 1}期</TableCell>
                        <TableCell align='right'>
                          <Badge
                            sx={{
                              bgcolor: benefit.cpi >= 1 ? 'green.100' : 'red.100',
                              color: benefit.cpi >= 1 ? 'green.800' : 'red.800',
                            }}
                          >
                            {benefit.cpi.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell align='right'>
                          <Badge
                            sx={{
                              bgcolor: benefit.spi >= 1 ? 'green.100' : 'red.100',
                              color: benefit.spi >= 1 ? 'green.800' : 'red.800',
                            }}
                          >
                            {benefit.spi.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'grey.600' }}
                        >
                          {benefit.cv.toLocaleString()}
                        </TableCell>
                        <TableCell
                          align='right'
                          sx={{ color: 'grey.600' }}
                        >
                          {benefit.sv.toLocaleString()}
                        </TableCell>
                        <TableCell align='right'>
                          <Typography
                            component='span'
                            sx={{ color: benefit.roi >= 0 ? 'green.600' : 'red.600' }}
                          >
                            {(benefit.roi * 100).toFixed(2)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4, color: 'grey.500' }}>
                <TrendingUp sx={{ width: 48, height: 48, mx: 'auto', mb: 2, color: 'grey.300' }} />
                <Typography>暂无效益数据</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    ),
    [
      params.projectId,
      navigate,
      projectStatusData,
      riskData,
      trendData,
      budgetUtilization,
      stats,
      benefits,
    ]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <StatsPageTemplate
        title='项目报表'
        subtitle={params.projectId ? '项目详情报表' : '全局项目统计报表'}
        statCards={statCards}
        loading={loading}
        timeRangeOptions={[
          { label: '全部时间', value: 'all' },
          { label: '本周', value: 'week' },
          { label: '本月', value: 'month' },
          { label: '本季度', value: 'quarter' },
          { label: '本年', value: 'year' },
        ]}
        timeRange={selectedPeriod}
        onTimeRangeChange={setSelectedPeriod}
        onRefresh={loadReportData}
        onExport={handleExport}
        exportText='导出报表'
        showSearch={false}
        customToolbar={customToolbar}
        showStatCards={true}
        showCharts={false}
        showTables={false}
      />
    </PageContainer>
  );
};

export default PmReportPage;
