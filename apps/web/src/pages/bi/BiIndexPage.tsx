import { useState, useEffect } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  FileText,
  Database,
  Shield,
  TrendingUp,
  Clock,
  Plus,
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
  Divider,
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

const quickActions = [
  { icon: <LayoutDashboard size={24} />, label: '新建仪表盘', path: '/bi/dashboard', color: '#6366F1', bg: '#EEF2FF' },
  { icon: <FileText size={24} />, label: '创建报表', path: '/bi/reports', color: '#F59E0B', bg: '#FFFBEB' },
  { icon: <Database size={24} />, label: '数据集管理', path: '/bi/datasets', color: '#10B981', bg: '#ECFDF5' },
  { icon: <BarChart3 size={24} />, label: '数据分析', path: '/bi/analysis', color: '#8B5CF6', bg: '#F5F3FF' },
  { icon: <PieChart size={24} />, label: '可视化', path: '/bi/visualizations', color: '#EC4899', bg: '#FDF2F8' },
  { icon: <Shield size={24} />, label: '权限管理', path: '/bi/permissions', color: '#EF4444', bg: '#FEF2F2' },
];

const recentActivities = [
  { id: 1, type: 'dashboard', title: '编辑了「销售总览仪表盘」', time: '10 分钟前', icon: <LayoutDashboard size={16} /> },
  { id: 2, type: 'report', title: '导出了「月度销售报表」', time: '30 分钟前', icon: <FileText size={16} /> },
  { id: 3, type: 'dataset', title: '创建了「库存分析数据集」', time: '1 小时前', icon: <Database size={16} /> },
  { id: 4, type: 'analysis', title: '进行了「地区销售对比分析」', time: '2 小时前', icon: <BarChart3 size={16} /> },
  { id: 5, type: 'permission', title: '更新了行级权限规则', time: '昨天', icon: <Shield size={16} /> },
];

const BiIndexPage = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, reportRes, dsRes] = await Promise.all([
        fetchDashboards(),
        fetchReports(),
        listDatasets(),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboards(dashRes.data.items?.slice(0, 4) || []);
      }
      if (reportRes.success && reportRes.data) {
        setReports(reportRes.data.items?.slice(0, 4) || []);
      }
      if (dsRes.success && dsRes.data) {
        setDatasets(dsRes.data.items?.slice(0, 4) || []);
      }
    } catch (error: unknown) {
      logger.error('Failed to load BI data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const keyMetrics = [
    {
      title: '仪表盘',
      value: '12',
      unit: '个',
      change: 2,
      trend: 'up' as const,
      color: 'purple',
      icon: <LayoutDashboard />,
      sparklineData: [2, 4, 5, 6, 8, 10, 12],
    },
    {
      title: '报表',
      value: '28',
      unit: '份',
      change: 5,
      trend: 'up' as const,
      color: 'orange',
      icon: <FileText />,
      sparklineData: [10, 12, 15, 18, 22, 25, 28],
    },
    {
      title: '数据集',
      value: '16',
      unit: '个',
      change: 3,
      trend: 'up' as const,
      color: 'green',
      icon: <Database />,
      sparklineData: [5, 7, 8, 10, 12, 14, 16],
    },
    {
      title: '权限规则',
      value: '8',
      unit: '条',
      change: 1,
      trend: 'up' as const,
      color: 'blue',
      icon: <Shield />,
      sparklineData: [4, 5, 5, 6, 7, 7, 8],
    },
  ];

  const trendData = [
    { name: '周一', 访问量: 1200, 报表数: 45, 分析数: 32 },
    { name: '周二', 访问量: 1500, 报表数: 52, 分析数: 38 },
    { name: '周三', 访问量: 1800, 报表数: 61, 分析数: 45 },
    { name: '周四', 访问量: 1600, 报表数: 55, 分析数: 42 },
    { name: '周五', 访问量: 2100, 报表数: 68, 分析数: 52 },
    { name: '周六', 访问量: 900, 报表数: 30, 分析数: 20 },
    { name: '周日', 访问量: 800, 报表数: 25, 分析数: 18 },
  ];

  return (
    <PageContainer
      title='商业智能'
      subtitle='一站式数据分析与可视化平台'
      headerProps={{
        pageIcon: <BarChart3 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      }}
      padding={false}
      maxWidth={false}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'BI' },
        ]}
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
              <Typography variant='h4' sx={{ fontWeight: 700, mb: 1 }}>
                欢迎使用商业智能平台
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                探索数据洞察，驱动业务决策
              </Typography>
            </Box>
            <TextField
              placeholder='搜索仪表盘、报表、数据集...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size='small'
              sx={{ width: 350 }}
              slotProps={{
                input: {
                  startAdornment: <Search size={18} style={{ marginRight: 8, color: '#9ca3af' }} />,
                },
              }}
            />
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {keyMetrics.map((metric, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
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
              borderRadius: 2,
              background: 'linear-gradient(135deg, #6366F10A 0%, #8B5CF60A 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Sparkles size={20} style={{ color: '#8B5CF6', marginRight: 8 }} />
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                快捷入口
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid size={{ xs: 6, sm: 4, md: 2 }} key={index}>
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
                          borderRadius: 2,
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
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {action.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      本周使用趋势
                    </Typography>
                    <Chip label='近7天' size='small' variant='outlined' />
                  </Box>
                  <ChartComponent
                    type='area'
                    data={trendData}
                    xKey='name'
                    yKeys={['访问量', '报表数', '分析数']}
                    chartHeight={280}
                    chartWidth={700}
                    smooth
                    showLegend
                    showTooltip
                  />
                </CardContent>
              </Card>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                          我的仪表盘
                        </Typography>
                        <Button
                          size='small'
                          endIcon={<ChevronRight size={16} />}
                          sx={{ textTransform: 'none' }}
                          href='/bi/dashboard'
                        >
                          查看全部
                        </Button>
                      </Box>
                      <List dense disablePadding>
                        {[
                          { name: '销售总览仪表盘', desc: '销售数据综合分析', type: 'bar' },
                          { name: '生产质量监控', desc: '实时质量指标监控', type: 'line' },
                          { name: '库存周转率分析', desc: '仓库库存周转分析', type: 'pie' },
                          { name: 'HR人力仪表盘', desc: '人力资源数据分析', type: 'table' },
                        ].map((item, idx) => (
                          <ListItem key={idx} disablePadding>
                            <ListItemButton>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.5,
                                    backgroundColor: '#EEF2FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6366F1',
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
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                          常用报表
                        </Typography>
                        <Button
                          size='small'
                          endIcon={<ChevronRight size={16} />}
                          sx={{ textTransform: 'none' }}
                          href='/bi/reports'
                        >
                          查看全部
                        </Button>
                      </Box>
                      <List dense disablePadding>
                        {[
                          { name: '月度销售报表', type: '销售', format: 'Excel' },
                          { name: '质量周报', type: '质量', format: 'PDF' },
                          { name: '库存月报', type: '库存', format: 'Excel' },
                          { name: '人事月报', type: 'HR', format: 'PDF' },
                        ].map((item, idx) => (
                          <ListItem key={idx} disablePadding>
                            <ListItemButton>
                              <ListItemIcon sx={{ minWidth: 36 }}>
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.5,
                                    backgroundColor: '#FFFBEB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#F59E0B',
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
                              <Chip label={item.format} size='small' variant='outlined' />
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
                    <Clock size={18} style={{ marginRight: 8, color: '#6B7280' }} />
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      最近动态
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {recentActivities.map((activity) => (
                      <ListItem key={activity.id} disablePadding sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              backgroundColor: '#F3F4F6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#6B7280',
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
                    <Database size={18} style={{ marginRight: 8, color: '#10B981' }} />
                    <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                      数据集
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {[
                      { name: '销售数据分析集', rows: '125,860 行', status: '正常' },
                      { name: '生产质量数据集', rows: '89,450 行', status: '正常' },
                      { name: '库存周转数据集', rows: '45,200 行', status: '草稿' },
                    ].map((item, idx) => (
                      <ListItem key={idx} disablePadding sx={{ py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <Box
                            sx={{
                              width: 28,
                              height: 28,
                              borderRadius: 0.5,
                              backgroundColor: '#ECFDF5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#10B981',
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
                          color={item.status === '正常' ? 'success' : 'warning'}
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
                    href='/bi/datasets'
                  >
                    管理数据集
                  </Button>
                </CardContent>
              </Card>

              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #10B9810A 0%, #0596690A 100%)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Zap size={20} style={{ color: '#10B981', marginRight: 8 }} />
                  <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                    快速创建
                  </Typography>
                </Box>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                  使用 AI 智能助手快速创建数据分析报表
                </Typography>
                <Button
                  fullWidth
                  variant='contained'
                  startIcon={<Sparkles size={16} />}
                  sx={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  }}
                >
                  AI 智能分析
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
