import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, CheckCircle, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import i18n from '@/i18n';
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
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
const DEFAULT_STATS: PmStatistics = {
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
  total_risks: 0,
  open_risks: 0,
  closed_risks: 0,
  total_tasks: 0,
  pending_tasks: 0,
  in_progress_tasks: 0,
  completed_tasks: 0,
  on_time_projects: 0,
  delayed_projects: 0,
  average_progress: 0,
  high_risk_projects: 0,
  medium_risk_projects: 0,
  low_risk_projects: 0,
};
const PmReportPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ projectId?: string }>();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const statsQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.STATISTICS, selectedPeriod, params.projectId ?? ''],
    queryFn: async () => {
      const response = await pmApi.getStatistics();
      if (response.success && response.data) {
        return response.data as PmStatistics;
      }
      return DEFAULT_STATS;
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const benefitsQuery = useQuery({
    queryKey: [
      ...(params.projectId ? QUERY_KEYS.PM.BENEFITS(params.projectId) : QUERY_KEYS.PM.REPORTS),
      selectedPeriod,
    ],
    queryFn: async () => {
      if (!params.projectId) return [] as ProjectBenefit[];
      const response = await pmApi.benefits.list(params.projectId);
      if (response.success && response.data) {
        return (response.data as { benefits?: ProjectBenefit[] }).benefits || [];
      }
      return [] as ProjectBenefit[];
    },
  
      staleTime: CACHE_DURATIONS.MEDIUM,});
  const stats = statsQuery.data ?? DEFAULT_STATS;
  const benefits = benefitsQuery.data ?? [];
  const loading = statsQuery.isLoading || benefitsQuery.isLoading;
  const loadReportData = useCallback(() => {
    statsQuery.refetch();
    benefitsQuery.refetch();
  }, [statsQuery, benefitsQuery]);
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
        title: i18n.t('pm.pm_report_page.k0'),
        value: stats.total_projects,
        icon: <Calendar size={20} />,
        color: 'primary',
      },
      {
        id: 'completed-projects',
        title: i18n.t('pm.pm_report_page.k1'),
        value: stats.completed_projects,
        icon: <CheckCircle size={20} />,
        color: 'success',
      },
      {
        id: 'budget-usage',
        title: i18n.t('pm.pm_report_page.k2'),
        value: `${stats.budget_usage_rate}%`,
        icon: <DollarSign size={20} />,
        color: 'warning',
      },
      {
        id: 'high-risk',
        title: i18n.t('pm.pm_report_page.k3'),
        value: stats.high_risk_projects ?? 0,
        icon: <AlertTriangle size={20} />,
        color: 'error',
      },
    ],
    [stats]
  );
  const projectStatusData = useMemo(
    () =>
      [
        { name: i18n.t('pm.pm_report_page.k4'), value: stats.draft_projects, fill: 'grey.500' },
        { name: i18n.t('pm.pm_report_page.k5'), value: stats.pending_projects, fill: 'warning.main' },
        { name: i18n.t('pm.pm_report_page.k6'), value: stats.active_projects, fill: 'primary.main' },
        { name: i18n.t('pm.pm_report_page.k7'), value: stats.completed_projects, fill: 'success.main' },
        { name: i18n.t('pm.pm_report_page.k8'), value: stats.cancelled_projects, fill: 'error.main' },
      ].filter((d) => (d.value ?? 0) > 0),
    [stats]
  );
  const riskData = useMemo(
    () =>
      [
        { name: i18n.t('pm.pm_report_page.k9'), value: stats.high_risk_projects ?? 0, fill: 'error.main' },
        { name: i18n.t('pm.pm_report_page.k10'), value: stats.medium_risk_projects ?? 0, fill: 'warning.main' },
        { name: i18n.t('pm.pm_report_page.k11'), value: stats.low_risk_projects ?? 0, fill: 'success.main' },
      ].filter((d) => (d.value ?? 0) > 0),
    [stats]
  );
  const trendData = useMemo(
    () =>
      benefits.slice(0, 6).map((b, index) => ({
        month: `${i18n.t('pages.pm_report_page.k0')}${index + 1}${i18n.t('pages.pm_report_page.k1')}`,
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
        {i18n.t('pages.pm_report_page.k0')}
      </Typography>
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}
      >
        <Card>
          <CardHeader>
            <Typography variant='h6'>{i18n.t('pm.pm_report_page.k12')}</Typography>
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
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                  <Tooltip formatter={(value) => [`${value}${i18n.t('pages.pm_report_page.k2')}`, i18n.t('pm.pm_report_page.k13')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Typography variant='h6'>{i18n.t('pm.pm_report_page.k14')}</Typography>
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
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                  <Tooltip formatter={(value: unknown) => [`${value}${i18n.t('pages.pm_report_page.k3')}`, i18n.t('pm.pm_report_page.k15')]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader>
          <Typography variant='h6'>{i18n.t('pages.pm_report_page.pipi_0')}</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <LineChart
                data={trendData.length > 0 ? trendData : [{ month: i18n.t('pm.pm_report_page.k16'), cpi: 1, spi: 1 }]}
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
          <Typography variant='h6'>{i18n.t('pm.pm_report_page.k17')}</Typography>
        </CardHeader>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant='body2'
              sx={{ color: 'grey.600' }}
            >
              {i18n.t('pages.pm_report_page.k1')}
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
                {i18n.t('pages.pm_report_page.k2')}
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
                {i18n.t('pages.pm_report_page.k3')}
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
                {i18n.t('pages.pm_report_page.k4')}
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
          <Typography variant='h6'>{i18n.t('pm.pm_report_page.k18')}</Typography>
        </CardHeader>
        <CardContent>
          <Box sx={{ height: 256 }}>
            <ResponsiveContainer
              width='100%'
              height='100%'
            >
              <BarChart
                data={[
                  { name: i18n.t('pm.pm_report_page.k19'), value: stats.on_time_projects ?? 0 },
                  { name: i18n.t('pm.pm_report_page.k20'), value: stats.delayed_projects ?? 0 },
                ].filter((d) => (d.value ?? 0) > 0)}
              >
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey='value'
                  name={i18n.t('pm.pm_report_page.k21')}
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
        {i18n.t('pages.pm_report_page.k5')}
      </Typography>
      <Card>
        <CardContent>
          {benefits.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>{i18n.t('pm.pm_report_page.k22')}</TableCell>
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
                      <TableCell sx={{ color: 'grey.900' }}>{i18n.t('pages.pm_report_page.index1_1')}</TableCell>
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
              <Typography>{i18n.t('pm.pm_report_page.k23')}</Typography>
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
                {i18n.t('pages.pm_report_page.k6')}
              </Button>
            </CardContent>
          </Card>
        )}
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.pm_report_page.k7')}
        </Typography>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3, mb: 3 }}
        >
          <Card>
            <CardHeader>
              <Typography variant='h6'>{i18n.t('pm.pm_report_page.k24')}</Typography>
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
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                    <Tooltip formatter={(value) => [`${value}${i18n.t('pages.pm_report_page.k4')}`, i18n.t('pm.pm_report_page.k25')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Typography variant='h6'>{i18n.t('pm.pm_report_page.k26')}</Typography>
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
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
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
                    <Tooltip formatter={(value: unknown) => [`${value}${i18n.t('pages.pm_report_page.k5')}`, i18n.t('pm.pm_report_page.k27')]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Box>
        <Card sx={{ mb: 3 }}>
          <CardHeader>
            <Typography variant='h6'>{i18n.t('pages.pm_report_page.pipi_2')}</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <LineChart
                  data={trendData.length > 0 ? trendData : [{ month: i18n.t('pm.pm_report_page.k28'), cpi: 1, spi: 1 }]}
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
            <Typography variant='h6'>{i18n.t('pm.pm_report_page.k29')}</Typography>
          </CardHeader>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.600' }}
              >
                {i18n.t('pages.pm_report_page.k8')}
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
                  {i18n.t('pages.pm_report_page.k9')}
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
                  {i18n.t('pages.pm_report_page.k10')}
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
                  {i18n.t('pages.pm_report_page.k11')}
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
            <Typography variant='h6'>{i18n.t('pm.pm_report_page.k30')}</Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ height: 256 }}>
              <ResponsiveContainer
                width='100%'
                height='100%'
              >
                <BarChart
                  data={[
                    { name: i18n.t('pm.pm_report_page.k31'), value: stats.on_time_projects ?? 0 },
                    { name: i18n.t('pm.pm_report_page.k32'), value: stats.delayed_projects ?? 0 },
                  ].filter((d) => (d.value ?? 0) > 0)}
                >
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='name' />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey='value'
                    name={i18n.t('pm.pm_report_page.k33')}
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
          {i18n.t('pages.pm_report_page.k12')}
        </Typography>
        <Card>
          <CardContent>
            {benefits.length > 0 ? (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'medium', color: 'grey.600' }}>{i18n.t('pm.pm_report_page.k34')}</TableCell>
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
                        <TableCell sx={{ color: 'grey.900' }}>{i18n.t('pages.pm_report_page.index1_3')}</TableCell>
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
                <Typography>{i18n.t('pm.pm_report_page.k35')}</Typography>
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
        title={i18n.t('pm.pm_report_page.k36')}
        subtitle={params.projectId ? i18n.t('pm.pm_report_page.k38') : i18n.t('pm.pm_report_page.k37')}
        statCards={statCards}
        loading={loading}
        timeRangeOptions={[
          { label: i18n.t('pm.pm_report_page.k39'), value: 'all' },
          { label: i18n.t('pm.pm_report_page.k40'), value: 'week' },
          { label: i18n.t('pm.pm_report_page.k41'), value: 'month' },
          { label: i18n.t('pm.pm_report_page.k42'), value: 'quarter' },
          { label: i18n.t('pm.pm_report_page.k43'), value: 'year' },
        ]}
        timeRange={selectedPeriod}
        onTimeRangeChange={setSelectedPeriod}
        onRefresh={loadReportData}
        onExport={handleExport}
        exportText={i18n.t('pm.pm_report_page.k44')}
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