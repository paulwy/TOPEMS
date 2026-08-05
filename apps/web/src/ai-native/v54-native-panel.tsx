import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Divider,
  Alert,
  LinearProgress,
  Grid,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  X as XIcon,
  Cpu,
  Route,
  LayoutDashboard,
  Activity,
  Zap,
  Brain,
  Eye,
  Settings,
  Play,
  Trash2,
  RefreshCw,
  TrendingUp,
  Shield,
  Layers,
  GitBranch,
  MousePointerClick,
  Palette,
  Monitor,
  Wifi,
  Smartphone,
  Tablet,
  Monitor as MonitorIcon,
  Star,
  Target,
  BarChart3,
  Sliders,
} from 'lucide-react';
import { V51Card } from '../design-system/components';
import {
  aiFirstPlatform,
  type AIPlatformStatus,
  type AICapability,
  type PlatformConfig,
} from './ai-first-architecture';
import {
  intelligentRouter,
  type RouterStats,
  type RoutingStrategy,
  type RouteRecommendation,
} from './intelligent-router';
import {
  adaptiveUIEngine,
  type AdaptedLayout,
  type AdaptationStats,
  type UserProfile,
  type DeviceType,
} from './adaptive-ui';

type TabId = 'dashboard' | 'capabilities' | 'router' | 'ui' | 'settings';

const V54_NATIVE_BADGE = 'V54';

const V54NativePanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('dashboard');
  const [platformStatus, setPlatformStatus] = React.useState<AIPlatformStatus>(
    aiFirstPlatform.getPlatformStatus()
  );
  const [routerStats, setRouterStats] = React.useState<RouterStats>(
    intelligentRouter.getRouteStats()
  );
  const [adaptationStats, setAdaptationStats] = React.useState<AdaptationStats>(
    adaptiveUIEngine.getAdaptationStats()
  );
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPlatformStatus(aiFirstPlatform.getPlatformStatus());
      setRouterStats(intelligentRouter.getRouteStats());
      setAdaptationStats(adaptiveUIEngine.getAdaptationStats());
    }, 2000);
    return () => clearInterval(interval);
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
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V54PanelHeader
          status={platformStatus}
          onClose={onClose}
        />
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <TabBar
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              status={platformStatus}
              routerStats={routerStats}
              adaptationStats={adaptationStats}
            />
          )}
          {activeTab === 'capabilities' && <CapabilitiesTab />}
          {activeTab === 'router' && <RouterTab />}
          {activeTab === 'ui' && (
            <AdaptiveUITab
              userProfile={userProfile}
              setUserProfile={setUserProfile}
            />
          )}
          {activeTab === 'settings' && <SettingsTab />}
        </Box>
      </Box>
    </Box>
  );
};

const V54PanelHeader: React.FC<{ status: AIPlatformStatus; onClose: () => void }> = ({
  status,
  onClose,
}) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
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
        <Brain size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          V54.0 AI 原生平台
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          AI 优先架构 · 智能路由 · 自适应 UI · 原生集成
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={`${status.capabilities.active}/${status.capabilities.total} 能力`}
        size='small'
        sx={{ bgcolor: 'action.disabledBackground', color: 'common.white', fontWeight: 600 }}
      />
      <Chip
        label={`运行 ${status.uptime}s`}
        size='small'
        sx={{ bgcolor: 'action.disabledBackground', color: 'common.white', fontWeight: 600 }}
      />
      <Badge
        badgeContent={V54_NATIVE_BADGE}
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
        <Zap size={18} />
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

const TAB_CONFIG: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
  { id: 'dashboard', label: '概览', icon: <Activity size={16} /> },
  { id: 'capabilities', label: 'AI 能力', icon: <Cpu size={16} /> },
  { id: 'router', label: '智能路由', icon: <Route size={16} /> },
  { id: 'ui', label: '自适应 UI', icon: <LayoutDashboard size={16} /> },
  { id: 'settings', label: '平台配置', icon: <Settings size={16} /> },
];

const TabBar: React.FC<{ activeTab: TabId; onChange: (tab: TabId) => void }> = ({
  activeTab,
  onChange,
}) => (
  <Stack
    direction='row'
    spacing={0.5}
    sx={{ overflowX: 'auto' }}
  >
    {TAB_CONFIG.map((tab) => (
      <Button
        key={tab.id}
        size='small'
        startIcon={tab.icon}
        onClick={() => onChange(tab.id)}
        sx={{
          textTransform: 'none',
          px: 2,
          py: 1,
          borderRadius: 1,
          bgcolor: activeTab === tab.id ? '#6366f1' : 'transparent',
          color: activeTab === tab.id ? 'white' : 'text.secondary',
          fontWeight: activeTab === tab.id ? 600 : 400,
          '&:hover': {
            bgcolor: activeTab === tab.id ? '#4f46e5' : 'action.hover',
          },
        }}
      >
        {tab.label}
      </Button>
    ))}
  </Stack>
);

const DashboardTab: React.FC<{
  status: AIPlatformStatus;
  routerStats: RouterStats;
  adaptationStats: AdaptationStats;
}> = ({ status, routerStats, adaptationStats }) => {
  const caps = aiFirstPlatform.getCapabilities();
  const activeCaps = caps.filter((c) => c.enabled).length;

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title='AI 能力'
            value={`${activeCaps}/${caps.length}`}
            subtitle='已激活'
            icon={
              <Cpu
                size={24}
                color='#3b82f6'
              />
            }
            color='#3b82f6'
            progress={caps.length > 0 ? (activeCaps / caps.length) * 100 : 0}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title='路由推荐'
            value={routerStats.total_recommendations.toString()}
            subtitle={`接受率 ${(routerStats.acceptance_rate * 100).toFixed(1)}%`}
            icon={
              <Route
                size={24}
                color='#10b981'
              />
            }
            color='#10b981'
            progress={routerStats.acceptance_rate * 100}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title='布局自适应'
            value={adaptationStats.total_adaptations.toString()}
            subtitle={`置信度 ${(adaptationStats.avg_layout_confidence * 100).toFixed(1)}%`}
            icon={
              <LayoutDashboard
                size={24}
                color='#f59e0b'
              />
            }
            color='#f59e0b'
            progress={adaptationStats.avg_layout_confidence * 100}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title='平台状态'
            value={status.initialized ? '运行中' : '未初始化'}
            subtitle={`中间件 ${status.middleware.total} 个`}
            icon={
              <Activity
                size={24}
                color='#8b5cf6'
              />
            }
            color='#8b5cf6'
            progress={status.initialized ? 100 : 0}
          />
        </Grid>
      </Grid>

      <Grid
        container
        spacing={3}
        sx={{ mt: 1 }}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              智能路由 Top 路径
            </Typography>
            {routerStats.top_routes.length === 0 ? (
              <Alert severity='info'>暂无路由数据。使用"智能路由"标签页进行路由推荐。</Alert>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>路径</TableCell>
                      <TableCell align='right'>推荐次数</TableCell>
                      <TableCell align='right'>置信度</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {routerStats.top_routes.map((route, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {route.path}
                        </TableCell>
                        <TableCell align='right'>{route.count}</TableCell>
                        <TableCell align='right'>
                          <Chip
                            label={`${(route.avg_confidence * 100).toFixed(0)}%`}
                            size='small'
                            sx={{
                              bgcolor: route.avg_confidence > 0.7 ? '#d1fae5' : '#fef3c7',
                              color: route.avg_confidence > 0.7 ? '#065f46' : '#92400e',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Sliders size={16} />
              AI 能力分布
            </Typography>
            <Stack
              direction='column'
              spacing={1.5}
            >
              {caps.map((cap) => (
                <Box key={cap.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {cap.name}
                    </Typography>
                    <Chip
                      label={cap.enabled ? '激活' : '停用'}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 18,
                        bgcolor: cap.enabled ? '#d1fae5' : '#fef2f2',
                        color: cap.enabled ? '#065f46' : '#991b1b',
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={cap.enabled ? 100 : 20}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Stack>
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  progress: number;
}> = ({ title, value, subtitle, icon, color, progress }) => (
  <V51Card>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {title}
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
    <LinearProgress
      variant='determinate'
      value={Math.min(100, progress)}
      sx={{ height: 6, borderRadius: 3, bgcolor: `${color}20` }}
    />
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{ mt: 0.5, display: 'block' }}
    >
      {subtitle}
    </Typography>
  </V51Card>
);

const CapabilitiesTab: React.FC = () => {
  const [caps, setCaps] = React.useState<AICapability[]>(aiFirstPlatform.getCapabilities());
  const [filter, setFilter] = React.useState<'all' | 'active' | 'inactive'>('all');

  const filteredCaps = caps.filter((c) => {
    if (filter === 'active') return c.enabled;
    if (filter === 'inactive') return !c.enabled;
    return true;
  });

  const handleToggle = (id: string) => {
    const cap = aiFirstPlatform.getCapability(id);
    if (cap?.enabled) {
      aiFirstPlatform.disableCapability(id);
    } else {
      aiFirstPlatform.enableCapability(id);
    }
    setCaps(aiFirstPlatform.getCapabilities());
  };

  const handleReset = () => {
    aiFirstPlatform.reset();
    setCaps(aiFirstPlatform.getCapabilities());
  };

  const handleDiscover = () => {
    const discovered = aiFirstPlatform.discoverCapabilities('推理');
    alert(`发现 ${discovered.length} 个匹配能力`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 120 }}
        >
          <InputLabel>筛选</InputLabel>
          <Select
            value={filter}
            label='筛选'
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <MenuItem value='all'>全部</MenuItem>
            <MenuItem value='active'>已激活</MenuItem>
            <MenuItem value='inactive'>已停用</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant='contained'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={() => setCaps(aiFirstPlatform.getCapabilities())}
          sx={{ bgcolor: 'primary.500', '&:hover': { bgcolor: 'primary.600' } }}
        >
          刷新
        </Button>
        <Button
          variant='outlined'
          size='small'
          startIcon={<Target size={16} />}
          onClick={handleDiscover}
          sx={{ borderColor: 'secondary.500', color: 'secondary.500' }}
        >
          发现能力
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant='outlined'
          size='small'
          startIcon={<Trash2 size={16} />}
          onClick={handleReset}
          color='error'
        >
          重置平台
        </Button>
      </Stack>

      <Grid
        container
        spacing={2}
      >
        {filteredCaps.map((cap) => (
          <Grid
            size={{ xs: 12, md: 6, lg: 4 }}
            key={cap.id}
          >
            <V51Card>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: cap.enabled ? '#d1fae5' : '#fef2f2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu
                    size={18}
                    color={cap.enabled ? '#059669' : '#dc2626'}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {cap.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {cap.type} · v{cap.version}
                  </Typography>
                </Box>
                <Switch
                  checked={cap.enabled}
                  onChange={() => handleToggle(cap.id)}
                  size='small'
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.500' } }}
                />
              </Box>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 1.5 }}
              >
                {cap.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {Object.entries(cap.config).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${String(value)}`}
                    size='small'
                    sx={{ fontSize: 10, height: 20 }}
                  />
                ))}
              </Box>
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Chip
                  label={cap.status === 'active' ? '运行中' : cap.status}
                  size='small'
                  sx={{
                    fontSize: 10,
                    height: 18,
                    bgcolor: cap.status === 'active' ? '#d1fae5' : '#fef3c7',
                    color: cap.status === 'active' ? '#065f46' : '#92400e',
                  }}
                />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  更新: {new Date(cap.updatedAt).toLocaleTimeString()}
                </Typography>
              </Box>
            </V51Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const RouterTab: React.FC = () => {
  const [intent, setIntent] = React.useState('我想看销售数据分析');
  const [strategy, setStrategy] = React.useState<RoutingStrategy>('hybrid');
  const [recommendation, setRecommendation] = React.useState<RouteRecommendation | null>(null);
  const [stats, setStats] = React.useState<RouterStats>(intelligentRouter.getRouteStats());

  const handleRecommend = () => {
    intelligentRouter.setStrategy(strategy);
    const rec = intelligentRouter.recommendRoute(intent);
    setRecommendation(rec);
    intelligentRouter.recordRecommendation(true, rec.confidence, rec.path);
    setStats(intelligentRouter.getRouteStats());
  };

  const handleLearn = () => {
    intelligentRouter.learnFromBehavior({
      path: '/bi/analytics',
      timestamp: Date.now(),
      duration_ms: 2500,
      user_action: 'view_dashboard',
      conversion: true,
    });
    setStats(intelligentRouter.getRouteStats());
  };

  React.useEffect(() => {
    handleRecommend();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3 }}
      >
        <FormControl
          size='small'
          sx={{ minWidth: 140 }}
        >
          <InputLabel>路由策略</InputLabel>
          <Select
            value={strategy}
            label='路由策略'
            onChange={(e) => setStrategy(e.target.value as RoutingStrategy)}
          >
            <MenuItem value='hybrid'>混合策略</MenuItem>
            <MenuItem value='intent-based'>意图优先</MenuItem>
            <MenuItem value='performance-based'>性能优先</MenuItem>
            <MenuItem value='a/b-test'>A/B 测试</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.5, display: 'block' }}
            >
              描述你的意图
            </Typography>
            <FormControl
              fullWidth
              size='small'
            >
              <Select
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                sx={{ height: 36 }}
              >
                <MenuItem value='我想看销售数据分析'>我想看销售数据分析</MenuItem>
                <MenuItem value='我需要管理客户信息'>我需要管理客户信息</MenuItem>
                <MenuItem value='查看库存状态'>查看库存状态</MenuItem>
                <MenuItem value='审批工作流'>审批工作流</MenuItem>
                <MenuItem value='查看财务报表'>查看财务报表</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Button
          variant='contained'
          startIcon={<Play size={16} />}
          onClick={handleRecommend}
          sx={{ bgcolor: 'teal.500', height: 36, '&:hover': { bgcolor: 'teal.600' } }}
        >
          推荐路由
        </Button>
        <Button
          variant='outlined'
          startIcon={<TrendingUp size={16} />}
          onClick={handleLearn}
          sx={{ height: 36 }}
        >
          学习行为
        </Button>
      </Stack>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Route size={16} />
              推荐结果
            </Typography>
            {recommendation && (
              <>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: '2px solid #10b981',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 700 }}
                    >
                      {recommendation.path}
                    </Typography>
                    <Chip
                      label={`置信度 ${(recommendation.confidence * 100).toFixed(0)}%`}
                      size='small'
                      sx={{ bgcolor: 'teal.500', color: 'common.white', fontWeight: 700 }}
                    />
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 1 }}
                  >
                    {recommendation.reason}
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    <Chip
                      label={`预测延迟: ${recommendation.predicted_latency_ms}ms`}
                      size='small'
                      sx={{ fontSize: 11 }}
                    />
                    {recommendation.ab_test_variant && (
                      <Chip
                        label={`A/B: ${recommendation.ab_test_variant}`}
                        size='small'
                        sx={{ fontSize: 11, bgcolor: 'warning.100', color: 'warning.800' }}
                      />
                    )}
                  </Stack>
                </Paper>

                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  替代方案
                </Typography>
                {recommendation.alternatives.map((alt, idx) => (
                  <Paper
                    key={idx}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      mb: 0.5,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: 'background.default',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, fontFamily: 'monospace' }}
                      >
                        {alt.path}
                      </Typography>
                      <Chip
                        label={`${(alt.confidence * 100).toFixed(0)}%`}
                        size='small'
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    </Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {alt.tradeoff}
                    </Typography>
                  </Paper>
                ))}
              </>
            )}
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              路由统计
            </Typography>
            <Grid
              container
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Grid size={6}>
                <StatBox
                  label='总推荐'
                  value={stats.total_recommendations}
                  color='#3b82f6'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='接受率'
                  value={`${(stats.acceptance_rate * 100).toFixed(1)}%`}
                  color='#10b981'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='平均置信度'
                  value={`${(stats.avg_confidence * 100).toFixed(1)}%`}
                  color='#f59e0b'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='策略数'
                  value={Object.keys(stats.by_strategy).length}
                  color='#8b5cf6'
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              性能数据
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>路径</TableCell>
                    <TableCell align='right'>延迟</TableCell>
                    <TableCell align='right'>错误率</TableCell>
                    <TableCell align='right'>缓存</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.performance.slice(0, 6).map((perf, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {perf.path}
                      </TableCell>
                      <TableCell align='right'>
                        <Chip
                          label={`${perf.avg_latency_ms}ms`}
                          size='small'
                          sx={{
                            fontSize: 10,
                            height: 18,
                            bgcolor: perf.avg_latency_ms < 200 ? '#d1fae5' : '#fef3c7',
                            color: perf.avg_latency_ms < 200 ? '#065f46' : '#92400e',
                          }}
                        />
                      </TableCell>
                      <TableCell align='right'>{(perf.error_rate * 100).toFixed(2)}%</TableCell>
                      <TableCell align='right'>{(perf.cache_hit_rate * 100).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <Box sx={{ textAlign: 'center', p: 1, bgcolor: `${color}10`, borderRadius: 1 }}>
    <Typography
      variant='h6'
      sx={{ fontWeight: 700, color, fontSize: 18 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      color='text.secondary'
    >
      {label}
    </Typography>
  </Box>
);

const AdaptiveUITab: React.FC<{
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
}> = ({ userProfile, setUserProfile }) => {
  const [device, setDevice] = React.useState<DeviceType>('desktop');
  const [layout, setLayout] = React.useState<'grid' | 'list' | 'mixed'>('grid');
  const [adaptedLayout, setAdaptedLayout] = React.useState<AdaptedLayout | null>(null);
  const [stats, setStats] = React.useState<AdaptationStats>(adaptiveUIEngine.getAdaptationStats());
  const [optimization, setOptimization] = React.useState<{
    improvements: string[];
    score: number;
  } | null>(null);

  const createDemoProfile = () => {
    const profile = adaptiveUIEngine.createProfile({
      id: 'demo-user',
      name: '演示用户',
      role: '管理员',
      department: '研发中心',
      preferences: {
        theme: 'light',
        density: 'normal',
        primary_language: 'zh',
        secondary_languages: ['en'],
        notifications_enabled: true,
        auto_save: true,
        compact_mode: false,
        show_favorites: true,
        sidebar_collapsed: false,
        fontSize: 14,
        accentColor: 'secondary.500',
        layout,
      },
      behavior_patterns: [
        {
          action: 'dashboard_view',
          frequency: 25,
          avg_duration_ms: 5000,
          peak_hours: [9, 14, 18],
          common_paths: ['/dashboard'],
          last_seen: Date.now(),
        },
        {
          action: 'analytics_view',
          frequency: 15,
          avg_duration_ms: 8000,
          peak_hours: [10, 15],
          common_paths: ['/bi/analytics'],
          last_seen: Date.now(),
        },
        {
          action: 'customer_manage',
          frequency: 8,
          avg_duration_ms: 12000,
          peak_hours: [11, 16],
          common_paths: ['/crm/customers'],
          last_seen: Date.now(),
        },
        {
          action: 'workflow_approval',
          frequency: 20,
          avg_duration_ms: 3000,
          peak_hours: [9, 10],
          common_paths: ['/workflow/tasks'],
          last_seen: Date.now(),
        },
      ],
      device,
      context: {
        device,
        screen_size:
          device === 'mobile'
            ? { width: 375, height: 812 }
            : device === 'tablet'
              ? { width: 768, height: 1024 }
              : { width: 1920, height: 1080 },
        network_type: 'wifi',
        connection_quality: 0.9,
        locale: 'zh-CN',
        timezone: 'Asia/Shanghai',
        is_online: true,
      },
      segments: ['管理员', '高频用户', '数据分析'],
      lastActiveAt: Date.now(),
    });
    adaptiveUIEngine.setCurrentUser(profile.id);
    setUserProfile(profile);
  };

  const handleAdapt = () => {
    if (!userProfile) {
      createDemoProfile();
    }
    const profile = adaptiveUIEngine.getCurrentProfile();
    if (profile) {
      const layout = adaptiveUIEngine.adaptLayout(profile.id);
      setAdaptedLayout(layout);
      setStats(adaptiveUIEngine.getAdaptationStats());
    }
  };

  const handleOptimize = () => {
    const profile = adaptiveUIEngine.getCurrentProfile();
    if (profile) {
      const result = adaptiveUIEngine.optimizeLayout(profile.id);
      setOptimization(result);
    }
  };

  const handleContentRec = () => {
    const profile = adaptiveUIEngine.getCurrentProfile();
    if (profile) {
      const items = [
        { id: '销售报表', type: 'report', tags: ['analytics', 'dashboard'] },
        { id: '客户列表', type: 'module', tags: ['customer', 'crm'] },
        { id: '审批任务', type: 'action', tags: ['workflow', 'approval'] },
        { id: '库存概览', type: 'dashboard', tags: ['inventory', 'stock'] },
        { id: 'AI 助手', type: 'module', tags: ['ai', 'assistant'] },
      ];
      const recs = adaptiveUIEngine.personalizeContent(profile.id, items);
      alert(
        `内容推荐结果:\n\n${recs
          .map((r) => `${r.title} - ${r.reason} (置信度: ${(r.confidence * 100).toFixed(0)}%)`)
          .join('\n')}`
      );
    }
  };

  React.useEffect(() => {
    createDemoProfile();
    setTimeout(handleAdapt, 100);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Eye size={16} />
              用户画像
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2 }}
            >
              <FormControl
                size='small'
                sx={{ minWidth: 100 }}
              >
                <InputLabel>设备</InputLabel>
                <Select
                  value={device}
                  label='设备'
                  onChange={(e) => setDevice(e.target.value as DeviceType)}
                >
                  <MenuItem value='desktop'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MonitorIcon size={14} /> 桌面
                    </Box>
                  </MenuItem>
                  <MenuItem value='tablet'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tablet size={14} /> 平板
                    </Box>
                  </MenuItem>
                  <MenuItem value='mobile'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Smartphone size={14} /> 手机
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 100 }}
              >
                <InputLabel>布局</InputLabel>
                <Select
                  value={layout}
                  label='布局'
                  onChange={(e) => setLayout(e.target.value as 'grid' | 'list' | 'mixed')}
                >
                  <MenuItem value='grid'>网格</MenuItem>
                  <MenuItem value='list'>列表</MenuItem>
                  <MenuItem value='mixed'>混合</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {userProfile && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {userProfile.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {userProfile.role} · {userProfile.department}
                  </Typography>
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ mb: 1, display: 'block' }}
                >
                  行为模式 ({userProfile.behavior_patterns.length})
                </Typography>
                <List
                  dense
                  sx={{ maxHeight: 150, overflow: 'auto' }}
                >
                  {userProfile.behavior_patterns.map((b, idx) => (
                    <ListItem
                      key={idx}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <MousePointerClick size={14} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{ fontSize: 12 }}
                          >
                            {b.action}
                          </Typography>
                        }
                        secondary={`频率: ${b.frequency} · 平均: ${(b.avg_duration_ms / 1000).toFixed(1)}s`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                  >
                    分群标签
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={0.5}
                    sx={{ flexWrap: 'wrap', gap: 0.5 }}
                  >
                    {userProfile.segments.map((s, idx) => (
                      <Chip
                        key={idx}
                        label={s}
                        size='small'
                        sx={{ fontSize: 10, height: 18 }}
                      />
                    ))}
                  </Stack>
                </Box>
              </>
            )}

            <Stack
              direction='row'
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Button
                variant='contained'
                size='small'
                startIcon={<Play size={14} />}
                onClick={handleAdapt}
                sx={{ bgcolor: 'warning.500', '&:hover': { bgcolor: 'warning.600' } }}
              >
                适配布局
              </Button>
              <Button
                variant='outlined'
                size='small'
                startIcon={<Star size={14} />}
                onClick={handleContentRec}
              >
                内容推荐
              </Button>
              <Button
                variant='outlined'
                size='small'
                startIcon={<TrendingUp size={14} />}
                onClick={handleOptimize}
              >
                优化建议
              </Button>
            </Stack>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <LayoutDashboard size={16} />
              自适应预览
            </Typography>
            {adaptedLayout ? (
              <>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #eff6ff 0%, #ede9fe 100%)',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Chip
                      label={`布局: ${adaptedLayout.layout}`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                    <Chip
                      label={`密度: ${adaptedLayout.density}`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                    <Chip
                      label={`置信度: ${(adaptedLayout.layout_confidence * 100).toFixed(0)}%`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={`主题: ${adaptedLayout.theme}`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                    <Chip
                      label={`字体缩放: ${adaptedLayout.font_scale.toFixed(2)}x`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                    <Chip
                      label={`侧边栏: ${adaptedLayout.sidebar_state}`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                  </Box>
                </Paper>

                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  推荐模块
                </Typography>
                <List dense>
                  {adaptedLayout.recommended_modules.length === 0 && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      暂无推荐
                    </Typography>
                  )}
                  {adaptedLayout.recommended_modules.map((mod, idx) => (
                    <ListItem
                      key={idx}
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Layers size={14} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{ fontSize: 12, fontWeight: 500 }}
                          >
                            {mod.module}
                          </Typography>
                        }
                        secondary={mod.reason}
                      />
                      <Chip
                        label={mod.priority}
                        size='small'
                        sx={{
                          fontSize: 10,
                          height: 18,
                          bgcolor: mod.priority === 'high' ? '#d1fae5' : '#fef3c7',
                          color: mod.priority === 'high' ? '#065f46' : '#92400e',
                        }}
                      />
                    </ListItem>
                  ))}
                </List>

                {optimization && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      <TrendingUp
                        size={14}
                        style={{ marginRight: 4 }}
                      />
                      优化建议 (得分: {(optimization.score * 100).toFixed(0)}%)
                    </Typography>
                    {optimization.improvements.map((imp, idx) => (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{ p: 1, mb: 0.5, bgcolor: 'background.default', borderRadius: 1 }}
                      >
                        <Typography variant='caption'>{imp}</Typography>
                      </Paper>
                    ))}
                  </>
                )}
              </>
            ) : (
              <Alert severity='info'>点击"适配布局"生成自适应预览</Alert>
            )}
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              适配统计
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label='总适配'
                  value={stats.total_adaptations}
                  color='#3b82f6'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='布局变更'
                  value={stats.layout_changes}
                  color='#10b981'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='内容推荐'
                  value={stats.content_recommendations}
                  color='#f59e0b'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='满意度'
                  value={`${(stats.user_satisfaction_score * 100).toFixed(0)}%`}
                  color='#8b5cf6'
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              设备分布
            </Typography>
            <Stack
              direction='column'
              spacing={1}
            >
              {(['desktop', 'tablet', 'mobile'] as DeviceType[]).map((dev) => (
                <Box key={dev}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 12 }}
                    >
                      {dev === 'desktop' ? '桌面' : dev === 'tablet' ? '平板' : '移动端'}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontSize: 12, fontWeight: 600 }}
                    >
                      {stats.by_device[dev] ?? 0}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant='determinate'
                    value={
                      stats.total_adaptations > 0
                        ? ((stats.by_device[dev] ?? 0) / stats.total_adaptations) * 100
                        : 0
                    }
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                </Box>
              ))}
            </Stack>

            <Divider sx={{ my: 1.5 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              平均延迟
            </Typography>
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'primary.500' }}
              >
                {stats.adaptation_latency_ms}ms
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                每次适配平均耗时
              </Typography>
            </Box>
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const SettingsTab: React.FC = () => {
  const [config, setConfig] = React.useState<PlatformConfig>(aiFirstPlatform.getConfig());
  const [status, setStatus] = React.useState<AIPlatformStatus>(aiFirstPlatform.getPlatformStatus());

  const handleChange = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    aiFirstPlatform.configurePlatform({ [key]: value } as Partial<PlatformConfig>);
    setStatus(aiFirstPlatform.getPlatformStatus());
  };

  const handleAddMockMiddleware = () => {
    aiFirstPlatform.addMiddleware(async (context, next) => {
      const result = await next();
      return {
        ...result,
        data: {
          ...(result.data as Record<string, unknown>),
          processed_by: 'mock-middleware',
          context_source: context.source,
        },
      };
    });
    setStatus(aiFirstPlatform.getPlatformStatus());
  };

  const handleExecuteMiddleware = async () => {
    const result = await aiFirstPlatform.executeThroughMiddleware({
      timestamp: Date.now(),
      requestId: `req-${Date.now()}`,
      source: 'v54-panel',
      metadata: { test: true },
    });
    alert(
      `中间件执行结果:\n\n` +
        `成功: ${result.success}\n` +
        `延迟: ${result.latency.toFixed(2)}ms\n` +
        `数据: ${JSON.stringify(result.data, null, 2)}`
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Settings size={16} />
              AI 平台配置
            </Typography>

            <Stack
              direction='column'
              spacing={2}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ai_enabled}
                    onChange={(e) => handleChange('ai_enabled', e.target.checked)}
                  />
                }
                label='AI 功能总开关'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.auto_optimize}
                    onChange={(e) => handleChange('auto_optimize', e.target.checked)}
                  />
                }
                label='自动性能优化'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.intelligent_routing}
                    onChange={(e) => handleChange('intelligent_routing', e.target.checked)}
                  />
                }
                label='智能路由'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.adaptive_ui}
                    onChange={(e) => handleChange('adaptive_ui', e.target.checked)}
                  />
                }
                label='自适应 UI'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.fallback_on_error}
                    onChange={(e) => handleChange('fallback_on_error', e.target.checked)}
                  />
                }
                label='错误回退'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.telemetry_enabled}
                    onChange={(e) => handleChange('telemetry_enabled', e.target.checked)}
                  />
                }
                label='遥测数据采集'
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              参数配置
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                gutterBottom
              >
                学习率: {config.learning_rate}
              </Typography>
              <Slider
                value={config.learning_rate}
                onChange={(_, v) => handleChange('learning_rate', v as number)}
                step={0.005}
                min={0.001}
                max={0.1}
                valueLabelDisplay='auto'
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                gutterBottom
              >
                最大并发能力: {config.max_concurrent_capabilities}
              </Typography>
              <Slider
                value={config.max_concurrent_capabilities}
                onChange={(_, v) => handleChange('max_concurrent_capabilities', v as number)}
                step={1}
                min={1}
                max={50}
                valueLabelDisplay='auto'
              />
            </Box>

            <Box
              sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                配置版本: {config.config_version}
              </Typography>
              <Chip
                label={status.initialized ? '已初始化' : '未初始化'}
                size='small'
                sx={{
                  bgcolor: status.initialized ? '#d1fae5' : '#fef2f2',
                  color: status.initialized ? '#065f46' : '#991b1b',
                  fontWeight: 600,
                }}
              />
            </Box>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Activity size={16} />
              中间件链
            </Typography>

            <Alert
              severity='info'
              sx={{ mb: 2 }}
            >
              AI 中间件链用于处理所有 AI 请求的前置/后置处理。可添加日志、缓存、限流等中间件。
            </Alert>

            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label='中间件数'
                  value={status.middleware.total}
                  color='#3b82f6'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='健康数'
                  value={status.middleware.healthy}
                  color='#10b981'
                />
              </Grid>
            </Grid>

            <Stack
              direction='row'
              spacing={1}
              sx={{ mt: 2 }}
            >
              <Button
                variant='contained'
                size='small'
                startIcon={<GitBranch size={14} />}
                onClick={handleAddMockMiddleware}
                sx={{ bgcolor: 'secondary.500', '&:hover': { bgcolor: 'secondary.700' } }}
              >
                添加示例中间件
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<Play size={14} />}
                onClick={handleExecuteMiddleware}
                sx={{ bgcolor: 'teal.500', '&:hover': { bgcolor: 'teal.600' } }}
              >
                执行中间件链
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              平台状态
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label='运行时间'
                  value={`${status.uptime}s`}
                  color='#8b5cf6'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='总能力'
                  value={status.capabilities.total}
                  color='#3b82f6'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='已激活'
                  value={status.capabilities.active}
                  color='#10b981'
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label='已降级'
                  value={status.capabilities.degraded}
                  color='#f59e0b'
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              AI 优先设计原则
            </Typography>
            <Stack
              direction='column'
              spacing={1}
            >
              {[
                { icon: <Brain size={14} />, text: 'AI 优先决策：所有模块集成 AI 能力' },
                { icon: <Zap size={14} />, text: '智能路由：基于意图的动态路径选择' },
                { icon: <Palette size={14} />, text: '自适应 UI：界面随用户行为进化' },
                { icon: <Shield size={14} />, text: '安全回退：AI 失败时自动降级' },
                { icon: <Monitor size={14} />, text: '可观测性：全链路 AI 监控与追踪' },
              ].map((item, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Box sx={{ color: 'secondary.500' }}>{item.icon}</Box>
                  <Typography variant='body2'>{item.text}</Typography>
                </Box>
              ))}
            </Stack>
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export { V54NativePanel };
export default V54NativePanel;
