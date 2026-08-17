import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  LayoutDashboard,
  FileText,
  Database,
  Shield,
  Clock,
  ChevronRight,
  Search,
  Sparkles,
  Zap,
  PieChart,
  Layers,
} from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Paper,
  Chip,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { DashboardTemplate } from '@/components/templates';
import { MetricCard } from '@/components/bi/MetricCard';
import { ChartComponent } from '@/components/bi/ChartLibrary';
import {
  fetchDashboards,
  fetchReports,
  listDatasets,
  type Dashboard,
  type Report,
  type Dataset,
} from '@/api/bi';
import { logger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { BI_PATHS } from '@/modules/bi/config';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

const quickActions = [
  {
    icon: <LayoutDashboard size={24} />,
    label: i18n.t('bi.bi_index_page.k0'),
    path: BI_PATHS.dashboard,
    color: ct.secondary[400],
    bg: ct.secondary[50],
  },
  {
    icon: <FileText size={24} />,
    label: i18n.t('bi.bi_index_page.k1'),
    path: '/bi/reports',
    color: 'warning.main',
    bg: ct.warning[50],
  },
  {
    icon: <Database size={24} />,
    label: i18n.t('bi.bi_index_page.k2'),
    path: '/bi/datasets',
    color: 'success.main',
    bg: ct.success[50],
  },
  {
    icon: <BarChart3 size={24} />,
    label: i18n.t('bi.bi_index_page.k3'),
    path: '/bi/analysis',
    color: 'secondary.main',
    bg: ct.secondary[50],
  },
  {
    icon: <PieChart size={24} />,
    label: i18n.t('bi.bi_index_page.k4'),
    path: '/bi/visualizations',
    color: ct.pink[500],
    bg: ct.pink[50],
  },
  {
    icon: <Shield size={24} />,
    label: i18n.t('bi.bi_index_page.k5'),
    path: '/bi/permissions',
    color: 'error.main',
    bg: ct.error[50],
  },
];

const recentActivities = [
  {
    id: 1,
    type: 'dashboard',
    title: i18n.t('bi.bi_index_page.k8'),
    time: i18n.t('bi.analytics.time.10_min_ago'),
    icon: <LayoutDashboard size={16} />,
  },
  {
    id: 2,
    type: 'report',
    title: i18n.t('bi.bi_index_page.k9'),
    time: i18n.t('bi.analytics.time.30_min_ago'),
    icon: <FileText size={16} />,
  },
  {
    id: 3,
    type: 'dataset',
    title: i18n.t('bi.bi_index_page.k10'),
    time: i18n.t('bi.analytics.time.1_hour_ago'),
    icon: <Database size={16} />,
  },
  {
    id: 4,
    type: 'analysis',
    title: i18n.t('bi.bi_index_page.k11'),
    time: i18n.t('bi.analytics.time.2_hours_ago'),
    icon: <BarChart3 size={16} />,
  },
  {
    id: 5,
    type: 'permission',
    title: i18n.t('bi.bi_index_page.k6'),
    time: i18n.t('bi.analytics.time.yesterday'),
    icon: <Shield size={16} />,
  },
];

const BiIndexPage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const biDataQuery = useQuery<{
    dashboards: Dashboard[];
    reports: Report[];
    datasets: Dataset[];
  }>({
    queryKey: QUERY_KEYS.AD_HOC.BI_INDEX_DATA_BASE,
    queryFn: async () => {
      const [dashRes, reportRes, dsRes] = await Promise.all([
        fetchDashboards(),
        fetchReports(),
        listDatasets(),
      ]);

      return {
        dashboards: dashRes.success && dashRes.data ? dashRes.data.items?.slice(0, 4) || [] : [],
        reports: reportRes.success && reportRes.data ? reportRes.data.items?.slice(0, 4) || [] : [],
        datasets: dsRes.success && dsRes.data ? dsRes.data.items?.slice(0, 4) || [] : [],
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (biDataQuery.isError) {
      logger.error('Failed to load BI data:', biDataQuery.error);
    }
  }, [biDataQuery.isError, biDataQuery.error]);

  const keyMetrics = [
    {
      title: t('bi.bi_index_page.text_3fa8b3'),
      value: '12',
      unit: t('bi.bi_index_page.text_930882'),
      change: 2,
      trend: 'up' as const,
      color: 'secondary.main',
      icon: <LayoutDashboard />,
      sparklineData: [2, 4, 5, 6, 8, 10, 12],
    },
    {
      title: t('bi.bi_index_page.text_fc00f3'),
      value: '28',
      unit: t('bi.bi_index_page.text_2a5da6'),
      change: 5,
      trend: 'up' as const,
      color: 'warning.main',
      icon: <FileText />,
      sparklineData: [10, 12, 15, 18, 22, 25, 28],
    },
    {
      title: t('bi.bi_index_page.text_e20804'),
      value: '16',
      unit: t('bi.bi_index_page.text_930882'),
      change: 3,
      trend: 'up' as const,
      color: 'success.main',
      icon: <Database />,
      sparklineData: [5, 7, 8, 10, 12, 14, 16],
    },
    {
      title: t('bi.bi_index_page.text_fff307'),
      value: '8',
      unit: t('bi.bi_index_page.text_cc1bac'),
      change: 1,
      trend: 'up' as const,
      color: 'primary.main',
      icon: <Shield />,
      sparklineData: [4, 5, 5, 6, 7, 7, 8],
    },
  ];

  const trendData = [
    { name: t('bi.bi_index_page.text_1603b0'), 访问量: 1200, 报表数: 45, 分析数: 32 },
    { name: t('bi.bi_index_page.text_b5a6a0'), 访问量: 1500, 报表数: 52, 分析数: 38 },
    { name: t('bi.bi_index_page.text_e60725'), 访问量: 1800, 报表数: 61, 分析数: 45 },
    { name: t('bi.bi_index_page.text_170fc8'), 访问量: 1600, 报表数: 55, 分析数: 42 },
    { name: t('bi.bi_index_page.text_eb79ce'), 访问量: 2100, 报表数: 68, 分析数: 52 },
    { name: t('bi.bi_index_page.text_245751'), 访问量: 900, 报表数: 30, 分析数: 20 },
    { name: t('bi.bi_index_page.text_562d74'), 访问量: 800, 报表数: 25, 分析数: 18 },
  ];

  return (
    <PageContainer
      title={t('bi.bi_index_page.text_7d6871')}
      subtitle={t('bi.bi_index_page.text_22e202')}
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]} 0%, ${ct.secondary.main} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: t('bi.bi_index_page.home'), href: '/dashboard' }, { label: 'BI' }]}
      >
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 4,
            }}
          >
            <Box>
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, mb: 1 }}
              >
                {t('bi.bi_index_page.k12')}
              </Typography>
              <Typography
                variant='body1'
                color='text.secondary'
              >
                {t('bi.bi_index_page.k13')}
              </Typography>
            </Box>
            <TextField
              placeholder={t('bi.bi_index_page.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              sx={{ width: 350 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search
                      size={18}
                      style={{ marginRight: 8, color: ct.grey[400] }}
                    />
                  ),
                },
              }}
            />
          </Box>

          <Grid
            container
            spacing={3}
            sx={{ mb: 4 }}
          >
            {keyMetrics.map((metric, index) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 3 }}
                key={index}
              >
                <MetricCard
                  title={metric.title}
                  value={metric.value}
                  unit={metric.unit}
                  change={metric.change}
                  trend={metric.trend}
                  color={metric.color}
                  sparklineData={metric.sparklineData}
                />
              </Grid>
            ))}
          </Grid>

          <Paper
            elevation={0}
            sx={{
              p: 3,
              mb: 4,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}0A 0%, ${designTokens.colors.secondary.main}0A 100%)`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Sparkles
                size={20}
                style={{ color: ct.secondary.main, marginRight: 8 }}
              />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {t('bi.bi_index_page.k14')}
              </Typography>
            </Box>
            <Grid
              container
              spacing={2}
            >
              {quickActions.map((action, index) => (
                <Grid
                  size={{ xs: 6, sm: 4, md: 2 }}
                  key={index}
                >
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 3,
                          backgroundColor: action.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px',
                          color: action.color,
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {action.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Grid
            container
            spacing={3}
          >
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600 }}
                    >
                      {t('bi.bi_index_page.k15')}
                    </Typography>
                    <Chip
                      label={t('bi.bi_index_page.text_531609')}
                      size='small'
                      variant='outlined'
                    />
                  </Box>
                  <ChartComponent
                    type='area'
                    data={trendData}
                    xKey='name'
                    yKeys={[
                      t('bi.bi_index_page.text_4461a6'),
                      t('bi.bi_index_page.text_67211e'),
                      t('bi.bi_index_page.text_3d5d87'),
                    ]}
                    chartHeight={280}
                    chartWidth={700}
                    smooth
                    showLegend
                    showTooltip
                  />
                </CardContent>
              </Card>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          {t('bi.bi_index_page.k16')}
                        </Typography>
                        <Button
                          size='small'
                          endIcon={<ChevronRight size={16} />}
                          sx={{ textTransform: 'none' }}
                          href={BI_PATHS.dashboard}
                        >
                          {t('bi.bi_index_page.k17')}
                        </Button>
                      </Box>
                      <List
                        dense
                        disablePadding
                      >
                        {[
                          {
                            name: t('bi.bi_index_page.text_5c4640'),
                            desc: t('bi.bi_index_page.text_e8ccfa'),
                            type: 'bar',
                          },
                          {
                            name: t('bi.bi_index_page.production'),
                            desc: t('bi.bi_index_page.text_1a3263'),
                            type: 'line',
                          },
                          {
                            name: t('bi.bi_index_page.text_e556ab'),
                            desc: t('bi.bi_index_page.warehouse'),
                            type: 'pie',
                          },
                          {
                            name: t('bi.bi_index_page.text_96f1d5'),
                            desc: t('bi.bi_index_page.text_f9b6a5'),
                            type: 'table',
                          },
                        ].map((item, idx) => (
                          <ListItem
                            key={idx}
                            disablePadding
                          >
                            <ListItemButton>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.5,
                                    backgroundColor: 'indigo.light',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'indigo.main',
                                  }}
                                >
                                  <LayoutDashboard size={16} />
                                </Box>
                              </ListItemIcon>
                              <ListItemText
                                primary={item.name}
                                secondary={item.desc}
                                slotProps={{
                                  primary: { variant: 'body2', sx: { fontWeight: 500 } },
                                  secondary: { variant: 'caption' },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 600 }}
                        >
                          {t('bi.bi_index_page.k18')}
                        </Typography>
                        <Button
                          size='small'
                          endIcon={<ChevronRight size={16} />}
                          sx={{ textTransform: 'none' }}
                          href={BI_PATHS.report}
                        >
                          {t('bi.bi_index_page.k17')}
                        </Button>
                      </Box>
                      <List
                        dense
                        disablePadding
                      >
                        {[
                          {
                            name: t('bi.bi_index_page.text_a71de2'),
                            type: t('bi.bi_index_page.text_7f0dc5'),
                            format: 'Excel',
                          },
                          {
                            name: t('bi.bi_index_page.text_da4ee0'),
                            type: t('bi.bi_index_page.text_3a7170'),
                            format: 'PDF',
                          },
                          {
                            name: t('bi.bi_index_page.text_51c296'),
                            type: t('bi.bi_index_page.text_0eac88'),
                            format: 'Excel',
                          },
                          { name: t('bi.bi_index_page.text_c272ae'), type: 'HR', format: 'PDF' },
                        ].map((item, idx) => (
                          <ListItem
                            key={idx}
                            disablePadding
                          >
                            <ListItemButton>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.5,
                                    backgroundColor: ct.warning[50],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'warning.main',
                                  }}
                                >
                                  <FileText size={16} />
                                </Box>
                              </ListItemIcon>
                              <ListItemText
                                primary={item.name}
                                secondary={item.type}
                                slotProps={{
                                  primary: { variant: 'body2', sx: { fontWeight: 500 } },
                                  secondary: { variant: 'caption' },
                                }}
                              />
                              <Chip
                                label={item.format}
                                size='small'
                                variant='outlined'
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            <Grid size={{ xs: 12, lg: 4 }}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Clock
                      size={18}
                      style={{ marginRight: 8, color: ct.grey[500] }}
                    />
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      {t('bi.bi_index_page.k19')}
                    </Typography>
                  </Box>
                  <List
                    dense
                    disablePadding
                  >
                    {recentActivities.map((activity) => (
                      <ListItem
                        key={activity.id}
                        disablePadding
                        sx={{ py: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'grey.500',
                            }}
                          >
                            {activity.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={activity.title}
                          secondary={activity.time}
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontWeight: 500 } },
                            secondary: { variant: 'caption' },
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Database
                      size={18}
                      style={{ marginRight: 8, color: ct.success.main }}
                    />
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      {t('bi.bi_index_page.k20')}
                    </Typography>
                  </Box>
                  <List
                    dense
                    disablePadding
                  >
                    {[
                      {
                        name: t('bi.bi_index_page.text_f94f6c'),
                        rows: t('bi.bi_index_page.text_bbaf48'),
                        status: t('bi.bi_index_page.normal'),
                      },
                      {
                        name: t('bi.bi_index_page.production_1'),
                        rows: t('bi.bi_index_page.text_1d93f6'),
                        status: t('bi.bi_index_page.normal'),
                      },
                      {
                        name: t('bi.bi_index_page.text_7252f8'),
                        rows: t('bi.bi_index_page.text_2ded3c'),
                        status: t('bi.bi_index_page.text_22b433'),
                      },
                    ].map((item, idx) => (
                      <ListItem
                        key={idx}
                        disablePadding
                        sx={{ py: 1 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 0.5,
                              backgroundColor: ct.success[50],
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'success.main',
                            }}
                          >
                            <Layers size={16} />
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={item.name}
                          secondary={item.rows}
                          slotProps={{
                            primary: { variant: 'body2', sx: { fontWeight: 500 } },
                            secondary: { variant: 'caption' },
                          }}
                        />
                        <Chip
                          label={item.status}
                          size='small'
                          color={
                            item.status === t('bi.bi_index_page.normal') ? 'success' : 'warning'
                          }
                          variant='outlined'
                        />
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    fullWidth
                    variant='outlined'
                    size='small'
                    sx={{ mt: 2 }}
                    href={BI_PATHS.dataset}
                  >
                    {t('bi.bi_index_page.k21')}
                  </Button>
                </CardContent>
              </Card>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  background: `linear-gradient(135deg, ${designTokens.colors.success.dark}0A 0%, ${designTokens.colors.success.dark}0A 100%)`,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Zap
                    size={20}
                    style={{ color: ct.success.main, marginRight: 8 }}
                  />
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('bi.bi_index_page.k22')}
                  </Typography>
                </Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 2 }}
                >
                  {t('bi.bi_index_page.k23')}
                </Typography>
                <Button
                  fullWidth
                  variant='contained'
                  startIcon={<Sparkles size={16} />}
                  sx={{
                    background: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
                  }}
                >
                  {t('bi.bi_index_page.k24')}
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DashboardTemplate>
    </PageContainer>
  );
};

export default BiIndexPage;
