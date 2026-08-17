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
  Card,
} from '@mui/material';
import i18n from '@/i18n';
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
import { designTokens, semanticTokens } from '@topems/tokens';

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
          boxShadow: designTokens.darkShadows['3xl'],
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
      background: `linear-gradient(135deg, ${designTokens.colors.primary.main} 0%, ${designTokens.colors.primary.dark} 50%, ${designTokens.colors.secondary.main} 100%)`,
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
          {i18n.t('ai.v54-native-panel.v540ai_0')}
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          {i18n.t('ai.v54-native-panel.k1')}
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={`${status.capabilities.active}/${status.capabilities.total} ${i18n.t('ai.v54-native-panel.k2')}`}
        size='small'
        sx={{ bgcolor: 'action.disabledBackground', color: 'common.white', fontWeight: 600 }}
      />
      <Chip
        label={`${i18n.t('ai.v54-native-panel.k3')} ${status.uptime}s`}
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
  { id: 'dashboard', label: i18n.t('ai.v54-native-panel.k0'), icon: <Activity size={16} /> },
  { id: 'capabilities', label: i18n.t('ai.v54-native-panel.ai_4'), icon: <Cpu size={16} /> },
  { id: 'router', label: i18n.t('ai.v54-native-panel.k1'), icon: <Route size={16} /> },
  { id: 'ui', label: i18n.t('ai.v54-native-panel.ui_2'), icon: <LayoutDashboard size={16} /> },
  { id: 'settings', label: i18n.t('ai.v54-native-panel.k3'), icon: <Settings size={16} /> },
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
          bgcolor: activeTab === tab.id ? designTokens.colors.secondary.dark : 'transparent',
          color: activeTab === tab.id ? 'white' : 'text.secondary',
          fontWeight: activeTab === tab.id ? 600 : 400,
          '&:hover': {
            bgcolor: activeTab === tab.id ? 'colors.primary.dark' : 'action.hover',
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
            title={i18n.t('ai.v54-native-panel.ai_5')}
            value={`${activeCaps}/${caps.length}`}
            subtitle={i18n.t('ai.v54-native-panel.k4')}
            icon={
              <Cpu
                size={24}
                color={designTokens.colors.primary.main}
              />
            }
            color={designTokens.colors.primary.main}
            progress={caps.length > 0 ? (activeCaps / caps.length) * 100 : 0}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title={i18n.t('ai.v54-native-panel.k5')}
            value={routerStats.total_recommendations.toString()}
            subtitle={`${i18n.t('ai.v54-native-panel.k6')} ${(routerStats.acceptance_rate * 100).toFixed(1)}%`}
            icon={
              <Route
                size={24}
                color={designTokens.colors.success.dark}
              />
            }
            color={designTokens.colors.success.dark}
            progress={routerStats.acceptance_rate * 100}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title={i18n.t('ai.v54-native-panel.k6')}
            value={adaptationStats.total_adaptations.toString()}
            subtitle={`${i18n.t('ai.v54-native-panel.k7')} ${(adaptationStats.avg_layout_confidence * 100).toFixed(1)}%`}
            icon={
              <LayoutDashboard
                size={24}
                color={designTokens.colors.warning.main}
              />
            }
            color={designTokens.colors.warning.main}
            progress={adaptationStats.avg_layout_confidence * 100}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <MetricCard
            title={i18n.t('ai.v54-native-panel.k7')}
            value={
              status.initialized
                ? i18n.t('ai.v54-native-panel.k9')
                : i18n.t('ai.v54-native-panel.k8')
            }
            subtitle={`${i18n.t('ai.v54-native-panel.k8')} ${status.middleware.total} ${i18n.t('ai.v54-native-panel.k9')}`}
            icon={
              <Activity
                size={24}
                color={designTokens.colors.secondary.main}
              />
            }
            color={designTokens.colors.secondary.main}
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
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              {i18n.t('ai.v54-native-panel.top_10')}
            </Typography>
            {routerStats.top_routes.length === 0 ? (
              <Alert severity='info'>
                {i18n.t('ai.v54-native-panel.k11')}
                {i18n.t('ai.v54-native-panel.k10')}
                {i18n.t('ai.v54-native-panel.k12')}
              </Alert>
            ) : (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('ai.v54-native-panel.k11')}</TableCell>
                      <TableCell align='right'>{i18n.t('ai.v54-native-panel.k12')}</TableCell>
                      <TableCell align='right'>{i18n.t('ai.v54-native-panel.k13')}</TableCell>
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
                              bgcolor:
                                route.avg_confidence > 0.7
                                  ? 'colors.success.100'
                                  : 'colors.warning.100',
                              color:
                                route.avg_confidence > 0.7
                                  ? 'colors.success.dark'
                                  : 'colors.orange.800',
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
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Sliders size={16} />
              {i18n.t('ai.v54-native-panel.ai_13')}
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
                      label={
                        cap.enabled
                          ? i18n.t('ai.v54-native-panel.k15')
                          : i18n.t('ai.v54-native-panel.k14')
                      }
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 18,
                        bgcolor: cap.enabled ? 'colors.success.100' : 'colors.error.50',
                        color: cap.enabled ? 'colors.success.dark' : 'colors.error.800',
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
          </Card>
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
  <Card
    variant='outlined'
    sx={{ p: 2 }}
  >
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
  </Card>
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
    const discovered = aiFirstPlatform.discoverCapabilities(i18n.t('ai.v54-native-panel.k16'));
    alert(
      `${i18n.t('ai.v54-native-panel.k14')} ${discovered.length} ${i18n.t('ai.v54-native-panel.k15')}`
    );
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
          <InputLabel>{i18n.t('ai.v54-native-panel.k17')}</InputLabel>
          <Select
            value={filter}
            label={i18n.t('ai.v54-native-panel.k18')}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'inactive')}
          >
            <MenuItem value='all'>{i18n.t('ai.v54-native-panel.k19')}</MenuItem>
            <MenuItem value='active'>{i18n.t('ai.v54-native-panel.k20')}</MenuItem>
            <MenuItem value='inactive'>{i18n.t('ai.v54-native-panel.k21')}</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant='contained'
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={() => setCaps(aiFirstPlatform.getCapabilities())}
          sx={{ bgcolor: 'primary.500', '&:hover': { bgcolor: 'primary.600' } }}
        >
          {i18n.t('ai.v54-native-panel.k16')}
        </Button>
        <Button
          variant='outlined'
          size='small'
          startIcon={<Target size={16} />}
          onClick={handleDiscover}
          sx={{ borderColor: 'secondary.500', color: 'secondary.500' }}
        >
          {i18n.t('ai.v54-native-panel.k17')}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant='outlined'
          size='small'
          startIcon={<Trash2 size={16} />}
          onClick={handleReset}
          color='error'
        >
          {i18n.t('ai.v54-native-panel.k18')}
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
            <Card
              variant='outlined'
              sx={{ p: 2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: cap.enabled ? 'colors.success.100' : 'colors.error.50',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Cpu
                    size={18}
                    color={
                      cap.enabled
                        ? designTokens.colors.success.dark
                        : designTokens.colors.error.dark
                    }
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
                  label={cap.status === 'active' ? i18n.t('ai.v54-native-panel.k22') : cap.status}
                  size='small'
                  sx={{
                    fontSize: 10,
                    height: 18,
                    bgcolor: cap.status === 'active' ? 'colors.success.100' : 'colors.warning.100',
                    color: cap.status === 'active' ? 'colors.success.dark' : 'colors.orange.800',
                  }}
                />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  [i18n.t('ai.v54-native-panel.k19')]:{' '}
                  {new Date(cap.updatedAt).toLocaleTimeString()}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const RouterTab: React.FC = () => {
  const [intent, setIntent] = React.useState(i18n.t('ai.v54-native-panel.k23'));
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
          <InputLabel>{i18n.t('ai.v54-native-panel.k24')}</InputLabel>
          <Select
            value={strategy}
            label={i18n.t('ai.v54-native-panel.k25')}
            onChange={(e) => setStrategy(e.target.value as RoutingStrategy)}
          >
            <MenuItem value='hybrid'>{i18n.t('ai.v54-native-panel.k26')}</MenuItem>
            <MenuItem value='intent-based'>{i18n.t('ai.v54-native-panel.k27')}</MenuItem>
            <MenuItem value='performance-based'>{i18n.t('ai.v54-native-panel.k28')}</MenuItem>
            <MenuItem value='a/b-test'>{i18n.t('ai:v54-native-panel.ab_5')}</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1, display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 0.5, display: 'block' }}
            >
              {i18n.t('ai.v54-native-panel.k20')}
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
                <MenuItem value={i18n.t('ai.v54-native-panel.k29')}>
                  {i18n.t('ai.v54-native-panel.k30')}
                </MenuItem>
                <MenuItem value={i18n.t('ai.v54-native-panel.k31')}>
                  {i18n.t('ai.v54-native-panel.k32')}
                </MenuItem>
                <MenuItem value={i18n.t('ai.v54-native-panel.k33')}>
                  {i18n.t('ai.v54-native-panel.k34')}
                </MenuItem>
                <MenuItem value={i18n.t('ai.v54-native-panel.k35')}>
                  {i18n.t('ai.v54-native-panel.k36')}
                </MenuItem>
                <MenuItem value={i18n.t('ai.v54-native-panel.k37')}>
                  {i18n.t('ai.v54-native-panel.k38')}
                </MenuItem>
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
          {i18n.t('ai.v54-native-panel.k21')}
        </Button>
        <Button
          variant='outlined'
          startIcon={<TrendingUp size={16} />}
          onClick={handleLearn}
          sx={{ height: 36 }}
        >
          {i18n.t('ai.v54-native-panel.k22')}
        </Button>
      </Stack>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Route size={16} />
              {i18n.t('ai.v54-native-panel.k23')}
            </Typography>
            {recommendation && (
              <>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: `2px solid ${designTokens.colors.success.dark}`,
                    background: `linear-gradient(135deg, ${designTokens.colors.success['50']} 0%, ${designTokens.colors.success['100']} 100%)`,
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
                      label={`${i18n.t('ai.v54-native-panel.k24')} ${(recommendation.confidence * 100).toFixed(0)}%`}
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
                      label={`${i18n.t('ai.v54-native-panel.k25')} ${recommendation.predicted_latency_ms}ms`}
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
                  {i18n.t('ai.v54-native-panel.k26')}
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
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              {i18n.t('ai.v54-native-panel.k27')}
            </Typography>
            <Grid
              container
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k39')}
                  value={stats.total_recommendations}
                  color={designTokens.colors.primary.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k40')}
                  value={`${(stats.acceptance_rate * 100).toFixed(1)}%`}
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k41')}
                  value={`${(stats.avg_confidence * 100).toFixed(1)}%`}
                  color={designTokens.colors.warning.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k42')}
                  value={Object.keys(stats.by_strategy).length}
                  color={designTokens.colors.secondary.main}
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {i18n.t('ai.v54-native-panel.k28')}
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('ai.v54-native-panel.k43')}</TableCell>
                    <TableCell align='right'>{i18n.t('ai.v54-native-panel.k44')}</TableCell>
                    <TableCell align='right'>{i18n.t('ai.v54-native-panel.k45')}</TableCell>
                    <TableCell align='right'>{i18n.t('ai.v54-native-panel.k46')}</TableCell>
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
                            bgcolor:
                              perf.avg_latency_ms < 200
                                ? 'colors.success.100'
                                : 'colors.warning.100',
                            color:
                              perf.avg_latency_ms < 200
                                ? 'colors.success.dark'
                                : 'colors.orange.800',
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
          </Card>
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
      name: i18n.t('ai.v54-native-panel.k47'),
      role: i18n.t('ai.v54-native-panel.k48'),
      department: i18n.t('ai.v54-native-panel.k49'),
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
      segments: [
        i18n.t('ai.v54-native-panel.k52'),
        i18n.t('ai.v54-native-panel.k51'),
        i18n.t('ai.v54-native-panel.k50'),
      ],
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
        { id: i18n.t('ai.v54-native-panel.k53'), type: 'report', tags: ['analytics', 'dashboard'] },
        { id: i18n.t('ai.v54-native-panel.k54'), type: 'module', tags: ['customer', 'crm'] },
        { id: i18n.t('ai.v54-native-panel.k55'), type: 'action', tags: ['workflow', 'approval'] },
        { id: i18n.t('ai.v54-native-panel.k56'), type: 'dashboard', tags: ['inventory', 'stock'] },
        { id: i18n.t('ai.v54-native-panel.ai_29'), type: 'module', tags: ['ai', 'assistant'] },
      ];
      const recs = adaptiveUIEngine.personalizeContent(profile.id, items);
      alert(
        `内容推荐结果:\n\n${recs
          .map(
            (r) =>
              `${r.title} - ${r.reason} ${i18n.t('ai.v54-native-panel.k30')} ${(r.confidence * 100).toFixed(0)}%)`
          )
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
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Eye size={16} />
              {i18n.t('ai.v54-native-panel.k31')}
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
                <InputLabel>{i18n.t('ai.v54-native-panel.k57')}</InputLabel>
                <Select
                  value={device}
                  label={i18n.t('ai.v54-native-panel.k58')}
                  onChange={(e) => setDevice(e.target.value as DeviceType)}
                >
                  <MenuItem value='desktop'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <MonitorIcon size={14} />
                      {i18n.t('ai:v54-native-panel.k4')}
                    </Box>
                  </MenuItem>
                  <MenuItem value='tablet'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Tablet size={14} />
                      {i18n.t('ai:v54-native-panel.k3')}
                    </Box>
                  </MenuItem>
                  <MenuItem value='mobile'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Smartphone size={14} />
                      {i18n.t('ai:v54-native-panel.k2')}
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl
                size='small'
                sx={{ minWidth: 100 }}
              >
                <InputLabel>{i18n.t('ai.v54-native-panel.k59')}</InputLabel>
                <Select
                  value={layout}
                  label={i18n.t('ai.v54-native-panel.k60')}
                  onChange={(e) => setLayout(e.target.value as 'grid' | 'list' | 'mixed')}
                >
                  <MenuItem value='grid'>{i18n.t('ai.v54-native-panel.k61')}</MenuItem>
                  <MenuItem value='list'>{i18n.t('ai.v54-native-panel.k62')}</MenuItem>
                  <MenuItem value='mixed'>{i18n.t('ai.v54-native-panel.k63')}</MenuItem>
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
                  {i18n.t('ai:v54-native-panel.k1', { v0: userProfile.behavior_patterns.length })}
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
                        secondary={`${i18n.t('ai.v54-native-panel.k32')} ${b.frequency} ${i18n.t('ai.v54-native-panel.k33')} ${(b.avg_duration_ms / 1000).toFixed(1)}s`}
                      />
                    </ListItem>
                  ))}
                </List>
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}
                  >
                    {i18n.t('ai.v54-native-panel.k34')}
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
                {i18n.t('ai.v54-native-panel.k35')}
              </Button>
              <Button
                variant='outlined'
                size='small'
                startIcon={<Star size={14} />}
                onClick={handleContentRec}
              >
                {i18n.t('ai.v54-native-panel.k36')}
              </Button>
              <Button
                variant='outlined'
                size='small'
                startIcon={<TrendingUp size={14} />}
                onClick={handleOptimize}
              >
                {i18n.t('ai.v54-native-panel.k37')}
              </Button>
            </Stack>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <LayoutDashboard size={16} />
              {i18n.t('ai.v54-native-panel.k38')}
            </Typography>
            {adaptedLayout ? (
              <>
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${designTokens.colors.primary['50']} 0%, ${designTokens.colors.secondary['100']} 100%)`,
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k39')} ${adaptedLayout.layout}`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k40')} ${adaptedLayout.density}`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k41')} ${(adaptedLayout.layout_confidence * 100).toFixed(0)}%`}
                      size='small'
                      sx={{ bgcolor: 'common.white', fontWeight: 600 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k42')} ${adaptedLayout.theme}`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k43')} ${adaptedLayout.font_scale.toFixed(2)}x`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                    <Chip
                      label={`${i18n.t('ai.v54-native-panel.k44')} ${adaptedLayout.sidebar_state}`}
                      size='small'
                      sx={{ fontSize: 10 }}
                    />
                  </Box>
                </Paper>

                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('ai.v54-native-panel.k45')}
                </Typography>
                <List dense>
                  {adaptedLayout.recommended_modules.length === 0 && (
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v54-native-panel.k46')}
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
                          bgcolor:
                            mod.priority === 'high' ? 'colors.success.100' : 'colors.warning.100',
                          color:
                            mod.priority === 'high' ? 'colors.success.dark' : 'colors.orange.800',
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
                      {i18n.t('ai:v54-native-panel.k0', {
                        v0: (optimization.score * 100).toFixed(0),
                      })}
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
              <Alert severity='info'>
                {i18n.t('ai.v54-native-panel.i18nt_47')}
                {i18n.t('ai.v54-native-panel.k64')}
                {i18n.t('ai.v54-native-panel.k48')}
              </Alert>
            )}
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <BarChart3 size={16} />
              {i18n.t('ai.v54-native-panel.k49')}
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k65')}
                  value={stats.total_adaptations}
                  color={designTokens.colors.primary.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k66')}
                  value={stats.layout_changes}
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k67')}
                  value={stats.content_recommendations}
                  color={designTokens.colors.warning.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k68')}
                  value={`${(stats.user_satisfaction_score * 100).toFixed(0)}%`}
                  color={designTokens.colors.secondary.main}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1.5 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {i18n.t('ai.v54-native-panel.k50')}
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
                      {dev === 'desktop'
                        ? i18n.t('ai.v54-native-panel.k71')
                        : dev === 'tablet'
                          ? i18n.t('ai.v54-native-panel.k70')
                          : i18n.t('ai.v54-native-panel.k69')}
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
              {i18n.t('ai.v54-native-panel.k51')}
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
                {i18n.t('ai.v54-native-panel.k52')}
              </Typography>
            </Box>
          </Card>
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
      `${i18n.t(
        'ai.v54-native-panel.nn_53'
      )}${i18n.t('ai.v54-native-panel.k54')} ${result.success}\n` +
        `${i18n.t('ai.v54-native-panel.k55')} ${result.latency.toFixed(2)}ms\n` +
        `${i18n.t('ai.v54-native-panel.k56')} ${JSON.stringify(result.data, null, 2)}`
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Settings size={16} />
              {i18n.t('ai.v54-native-panel.ai_57')}
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
                label={i18n.t('ai.v54-native-panel.ai_58')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.auto_optimize}
                    onChange={(e) => handleChange('auto_optimize', e.target.checked)}
                  />
                }
                label={i18n.t('ai.v54-native-panel.k72')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.intelligent_routing}
                    onChange={(e) => handleChange('intelligent_routing', e.target.checked)}
                  />
                }
                label={i18n.t('ai.v54-native-panel.k73')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.adaptive_ui}
                    onChange={(e) => handleChange('adaptive_ui', e.target.checked)}
                  />
                }
                label={i18n.t('ai.v54-native-panel.ui_74')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.fallback_on_error}
                    onChange={(e) => handleChange('fallback_on_error', e.target.checked)}
                  />
                }
                label={i18n.t('ai.v54-native-panel.k75')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.telemetry_enabled}
                    onChange={(e) => handleChange('telemetry_enabled', e.target.checked)}
                  />
                }
                label={i18n.t('ai.v54-native-panel.k76')}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('ai.v54-native-panel.k59')}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography
                variant='body2'
                gutterBottom
              >
                [i18n.t('ai.v54-native-panel.k60')]: {config.learning_rate}
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
                [i18n.t('ai.v54-native-panel.k61')]: {config.max_concurrent_capabilities}
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
                [i18n.t('ai.v54-native-panel.k62')]: {config.config_version}
              </Typography>
              <Chip
                label={
                  status.initialized
                    ? i18n.t('ai.v54-native-panel.k78')
                    : i18n.t('ai.v54-native-panel.k77')
                }
                size='small'
                sx={{
                  bgcolor: status.initialized ? 'colors.success.100' : 'colors.error.50',
                  color: status.initialized ? 'colors.success.dark' : 'colors.error.800',
                  fontWeight: 600,
                }}
              />
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Activity size={16} />
              {i18n.t('ai.v54-native-panel.k63')}
            </Typography>

            <Alert
              severity='info'
              sx={{ mb: 2 }}
            >
              {i18n.t('ai.v54-native-panel.k64')}
            </Alert>

            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k79')}
                  value={status.middleware.total}
                  color={designTokens.colors.primary.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k80')}
                  value={status.middleware.healthy}
                  color={designTokens.colors.success.dark}
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
                {i18n.t('ai.v54-native-panel.k65')}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<Play size={14} />}
                onClick={handleExecuteMiddleware}
                sx={{ bgcolor: 'teal.500', '&:hover': { bgcolor: 'teal.600' } }}
              >
                {i18n.t('ai.v54-native-panel.k66')}
              </Button>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('ai.v54-native-panel.k67')}
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k81')}
                  value={`${status.uptime}s`}
                  color={designTokens.colors.secondary.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k82')}
                  value={status.capabilities.total}
                  color={designTokens.colors.primary.main}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k83')}
                  value={status.capabilities.active}
                  color={designTokens.colors.success.dark}
                />
              </Grid>
              <Grid size={6}>
                <StatBox
                  label={i18n.t('ai.v54-native-panel.k84')}
                  value={status.capabilities.degraded}
                  color={designTokens.colors.warning.main}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {i18n.t('ai.v54-native-panel.ai_68')}
            </Typography>
            <Stack
              direction='column'
              spacing={1}
            >
              {[
                { icon: <Brain size={14} />, text: i18n.t('ai.v54-native-panel.k69') },
                { icon: <Zap size={14} />, text: i18n.t('ai.v54-native-panel.k85') },
                { icon: <Palette size={14} />, text: i18n.t('ai.v54-native-panel.ui_86') },
                { icon: <Shield size={14} />, text: i18n.t('ai.v54-native-panel.ai_87') },
                { icon: <Monitor size={14} />, text: i18n.t('ai.v54-native-panel.ai_88') },
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
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export { V54NativePanel };
export default V54NativePanel;
