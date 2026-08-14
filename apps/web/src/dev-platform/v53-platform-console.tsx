import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Chip,
  Stack,
  Tooltip,
  LinearProgress,
  Divider,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Tabs,
  Tab,
  Rating,
  Slider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  X as XIcon,
  Rocket,
  Code2,
  Blocks,
  Workflow,
  Activity,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  Plus,
  Settings,
  Download,
  Upload,
  Search,
  Star,
  Shield,
  Zap,
  GitBranch,
  Package,
  Cpu,
  Database,
  Sparkles,
  Layout,
  MousePointerClick,
  Box as BoxIcon,
  Palette,
  Layers,
} from 'lucide-react';
import {
  unifiedDevPlatform,
  type DevProject,
  type DevPlatformStats,
  type PipelineRun,
  type PipelineStage,
  type FrameworkType,
  type UIType,
  type EnvironmentName,
} from './unified-dev-platform';
import { lowCodeBuilder, type CanvasPage } from './lowcode-builder';
import {
  pluginMarketplace,
  type PluginManifest,
  type InstalledPlugin,
  type PluginMarketStats,
  type SearchResult,
  type CompatibilityCheck,
} from './plugin-marketplace';
import { designTokens, semanticTokens } from '@topems/tokens';

type ConsoleTabId = 'dashboard' | 'platform' | 'builder' | 'marketplace' | 'pipelines' | 'activity';

const FRAMEWORK_LABELS: Record<FrameworkType, string> = {
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  solid: 'Solid',
  angular: 'Angular',
};

const UI_LABELS: Record<UIType, string> = {
  mui: 'Material UI',
  antd: 'Ant Design',
  'element-plus': 'Element Plus',
  chakra: 'Chakra UI',
  tailwind: 'Tailwind CSS',
  shadcn: 'shadcn/ui',
};

const ENV_LABELS: Record<EnvironmentName, string> = {
  development: '开发环境',
  staging: '预发环境',
  production: '生产环境',
  preview: '预览环境',
};

const STATUS_COLORS: Record<string, string> = {
  drafting: '#9e9e9e',
  development: '#2196f3',
  building: '#ff9800',
  testing: '#9c27b0',
  staging: '#00bcd4',
  production: '#4caf50',
  archived: '#616161',
  pending: '#9e9e9e',
  running: '#2196f3',
  success: '#4caf50',
  failed: '#f44336',
  cancelled: '#616161',
};

const V53PlatformConsole: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<ConsoleTabId>('dashboard');
  const [platformStats, setPlatformStats] = React.useState<DevPlatformStats>(
    unifiedDevPlatform.getStats()
  );
  const [marketStats, setMarketStats] = React.useState<PluginMarketStats>(
    pluginMarketplace.getStats()
  );
  const [projects, setProjects] = React.useState<DevProject[]>(unifiedDevPlatform.listProjects());
  const [pages, setPages] = React.useState<CanvasPage[]>(lowCodeBuilder.listPages());
  const [installedPlugins, setInstalledPlugins] = React.useState<InstalledPlugin[]>(
    pluginMarketplace.listInstalled()
  );
  const [pipelineRuns, setPipelineRuns] = React.useState<PipelineRun[]>(
    unifiedDevPlatform.listPipelineRuns(undefined, 10)
  );

  React.useEffect(() => {
    const unsubPlatform = unifiedDevPlatform.subscribe((stats) => {
      setPlatformStats(stats);
      setProjects(unifiedDevPlatform.listProjects());
      setPipelineRuns(unifiedDevPlatform.listPipelineRuns(undefined, 10));
    });
    const unsubBuilder = lowCodeBuilder.subscribe((updatedPages) => {
      setPages([...updatedPages]);
    });
    const unsubMarket = pluginMarketplace.subscribe((stats) => {
      setMarketStats(stats);
      setInstalledPlugins(pluginMarketplace.listInstalled());
    });

    const interval = setInterval(() => {
      setPlatformStats(unifiedDevPlatform.getStats());
      setProjects(unifiedDevPlatform.listProjects());
      setMarketStats(pluginMarketplace.getStats());
      setPipelineRuns(unifiedDevPlatform.listPipelineRuns(undefined, 10));
    }, 3000);

    return () => {
      unsubPlatform();
      unsubBuilder();
      unsubMarket();
      clearInterval(interval);
    };
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
          maxWidth: 1600,
          height: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(99, 102, 241, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V53ConsoleHeader onClose={onClose} />
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as ConsoleTabId)}
            variant='scrollable'
            scrollButtons='auto'
            sx={{ px: 2 }}
          >
            <Tab
              icon={<Activity size={16} />}
              iconPosition='start'
              label='总览仪表盘'
              value='dashboard'
            />
            <Tab
              icon={<Rocket size={16} />}
              iconPosition='start'
              label='开发平台'
              value='platform'
            />
            <Tab
              icon={<Layout size={16} />}
              iconPosition='start'
              label='低代码搭建'
              value='builder'
            />
            <Tab
              icon={<Blocks size={16} />}
              iconPosition='start'
              label='插件市场'
              value='marketplace'
            />
            <Tab
              icon={<Workflow size={16} />}
              iconPosition='start'
              label='流水线'
              value='pipelines'
            />
            <Tab
              icon={<Zap size={16} />}
              iconPosition='start'
              label='活动'
              value='activity'
            />
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              platformStats={platformStats}
              marketStats={marketStats}
              projects={projects}
              pages={pages}
              installedPlugins={installedPlugins}
            />
          )}
          {activeTab === 'platform' && <PlatformTab projects={projects} />}
          {activeTab === 'builder' && <BuilderTab pages={pages} />}
          {activeTab === 'marketplace' && <MarketplaceTab installedPlugins={installedPlugins} />}
          {activeTab === 'pipelines' && (
            <PipelinesTab
              pipelineRuns={pipelineRuns}
              projects={projects}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityTab
              projects={projects}
              pipelineRuns={pipelineRuns}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const V53ConsoleHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      bgcolor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          bgcolor: 'action.disabledBackground',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Sparkles size={24} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          V53.0 微前端平台终局
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.9 }}
        >
          统一开发平台 · 低代码搭建 · 插件市场 · 流水线编排
        </Typography>
      </Box>
    </Box>
    <IconButton
      size='small'
      onClick={onClose}
      sx={{ color: 'common.white' }}
    >
      <XIcon size={20} />
    </IconButton>
  </Box>
);

// ==================== Dashboard Tab ====================

const DashboardTab: React.FC<{
  platformStats: DevPlatformStats;
  marketStats: PluginMarketStats;
  projects: DevProject[];
  pages: CanvasPage[];
  installedPlugins: InstalledPlugin[];
}> = ({ platformStats, marketStats, projects, pages, installedPlugins }) => {
  const healthyProjects = projects.filter((p) => p.health.buildStatus === 'healthy').length;
  const recentRuns = unifiedDevPlatform.listPipelineRuns(undefined, 5);

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title='项目总数'
            value={platformStats.totalProjects}
            icon={<Package size={24} />}
            color={designTokens.colors.secondary.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title='运行中流水线'
            value={platformStats.totalPipelines}
            icon={<Workflow size={24} />}
            color={designTokens.colors.pink.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title='插件总数'
            value={marketStats.totalPlugins}
            icon={<Blocks size={24} />}
            color='#14b8a6'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title='健康项目'
            value={`${healthyProjects}/${platformStats.totalProjects || 0}`}
            icon={<Shield size={24} />}
            color='#22c55e'
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader
              title='项目状态'
              avatar={<Rocket size={18} />}
            />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>项目名</TableCell>
                      <TableCell>技术栈</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell align='right'>健康度</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align='center'
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          暂无项目，前往"开发平台"创建第一个项目
                        </TableCell>
                      </TableRow>
                    ) : (
                      projects.slice(0, 5).map((project) => (
                        <TableRow
                          key={project.id}
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {project.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack
                              direction='row'
                              spacing={0.5}
                            >
                              <Chip
                                label={FRAMEWORK_LABELS[project.stack.framework]}
                                size='small'
                                variant='outlined'
                              />
                              <Chip
                                label={UI_LABELS[project.stack.ui] || project.stack.ui}
                                size='small'
                                variant='outlined'
                              />
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={project.status}
                              size='small'
                              sx={{ bgcolor: STATUS_COLORS[project.status], color: 'common.white' }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                justifyContent: 'flex-end',
                              }}
                            >
                              <LinearProgress
                                variant='determinate'
                                value={project.health.score}
                                sx={{ width: 60, height: 6, borderRadius: 3 }}
                                color={
                                  project.health.score >= 80
                                    ? 'success'
                                    : project.health.score >= 60
                                      ? 'warning'
                                      : 'error'
                                }
                              />
                              <Typography
                                variant='caption'
                                sx={{ fontWeight: 600 }}
                              >
                                {project.health.score}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant='outlined'>
            <CardHeader
              title='插件安装状态'
              avatar={<Blocks size={18} />}
            />
            <CardContent>
              <Stack spacing={1.5}>
                <InfoRow
                  icon={
                    <Package
                      size={16}
                      color={designTokens.colors.secondary.dark}
                    />
                  }
                  label='已安装插件'
                  value={`${installedPlugins.length} 个`}
                />
                <InfoRow
                  icon={
                    <Download
                      size={16}
                      color='#14b8a6'
                    />
                  }
                  label='可更新插件'
                  value={`${installedPlugins.filter((p) => p.updateAvailable).length} 个`}
                />
                <InfoRow
                  icon={
                    <Star
                      size={16}
                      color={designTokens.colors.warning.main}
                    />
                  }
                  label='精选推荐'
                  value={`${marketStats.featuredPlugins} 个`}
                />
                <InfoRow
                  icon={
                    <Shield
                      size={16}
                      color='#22c55e'
                    />
                  }
                  label='认证插件'
                  value={`${marketStats.verifiedPlugins} 个`}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader
              title='最近流水线运行'
              avatar={<Workflow size={18} />}
            />
            <CardContent>
              <Stack spacing={1}>
                {recentRuns.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    暂无流水线记录
                  </Typography>
                ) : (
                  recentRuns.map((run) => (
                    <Paper
                      key={run.id}
                      variant='outlined'
                      sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      {run.status === 'success' ? (
                        <CheckCircle2
                          size={18}
                          color='#22c55e'
                        />
                      ) : run.status === 'failed' ? (
                        <XCircle
                          size={18}
                          color={designTokens.colors.error.main}
                        />
                      ) : (
                        <Loader2
                          size={18}
                          color={designTokens.colors.primary.main}
                          className='animate-spin'
                        />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {run.pipelineId}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {run.status} · {run.stages.length} stages
                        </Typography>
                      </Box>
                      {run.totalDurationMs && (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {(run.totalDurationMs / 1000).toFixed(1)}s
                        </Typography>
                      )}
                    </Paper>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader
              title='低代码页面'
              avatar={<Layout size={18} />}
            />
            <CardContent>
              <Stack spacing={1}>
                {pages.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    暂无低代码页面
                  </Typography>
                ) : (
                  pages.map((page) => (
                    <Paper
                      key={page.id}
                      variant='outlined'
                      sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <BoxIcon
                        size={18}
                        color={designTokens.colors.secondary.main}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {page.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {page.status} · {page.components.length} 组件
                        </Typography>
                      </Box>
                      <Chip
                        label={page.version}
                        size='small'
                        variant='outlined'
                      />
                    </Paper>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card variant='outlined'>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: `${color}15`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {title}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {icon}
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
    </Box>
    <Typography
      variant='body2'
      sx={{ fontWeight: 600 }}
    >
      {value}
    </Typography>
  </Box>
);

// ==================== Platform Tab ====================

const PlatformTab: React.FC<{ projects: DevProject[] }> = ({ projects }) => {
  const [showCreate, setShowCreate] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [selectedStack, setSelectedStack] = React.useState<string>('react-mui');
  const [selectedProject, setSelectedProject] = React.useState<DevProject | null>(null);

  const presetStacks = unifiedDevPlatform.listPresetStacks();

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    const project = unifiedDevPlatform.createProject({
      name: newProjectName.trim(),
      stackPreset: selectedStack,
    });
    setNewProjectName('');
    setShowCreate(false);
  };

  const handleRunPipeline = (projectId: string, pipelineId: string) => {
    unifiedDevPlatform.runPipeline(projectId, pipelineId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          开发平台
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={() => setShowCreate(true)}
          sx={{
            bgcolor: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        >
          创建项目
        </Button>
      </Box>

      <Grid
        container
        spacing={3}
      >
        {projects.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Rocket
                size={48}
                color='#9e9e9e'
              />
              <Typography
                variant='h6'
                sx={{ mt: 2, color: 'text.secondary' }}
              >
                还没有项目
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 2 }}
              >
                点击"创建项目"开始你的第一个 V53 微前端项目
              </Typography>
              <Button
                variant='contained'
                startIcon={<Plus size={16} />}
                onClick={() => setShowCreate(true)}
              >
                立即创建
              </Button>
            </Paper>
          </Grid>
        ) : (
          projects.map((project) => (
            <Grid
              size={{ xs: 12, md: 6, lg: 4 }}
              key={project.id}
            >
              <Card variant='outlined'>
                <CardHeader
                  title={project.name}
                  avatar={<Code2 size={18} />}
                  action={
                    <Tooltip title='查看详情'>
                      <IconButton
                        size='small'
                        onClick={() => setSelectedProject(project)}
                      >
                        <ChevronRight size={18} />
                      </IconButton>
                    </Tooltip>
                  }
                />
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      <Chip
                        label={FRAMEWORK_LABELS[project.stack.framework]}
                        size='small'
                        color='primary'
                        variant='outlined'
                      />
                      <Chip
                        label={UI_LABELS[project.stack.ui] || project.stack.ui}
                        size='small'
                        variant='outlined'
                      />
                      <Chip
                        label={project.stack.buildTool}
                        size='small'
                        variant='outlined'
                      />
                    </Box>

                    <Typography
                      variant='body2'
                      color='text.secondary'
                      noWrap
                    >
                      {project.description}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={project.status}
                        size='small'
                        sx={{
                          bgcolor: STATUS_COLORS[project.status] || '#9e9e9e',
                          color: 'common.white',
                          height: 22,
                        }}
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        健康度: {project.health.score}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size='small'
                        variant='outlined'
                        startIcon={<Play size={14} />}
                        onClick={() => handleRunPipeline(project.id, 'build-only')}
                      >
                        构建
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        color='secondary'
                        startIcon={<Rocket size={14} />}
                        onClick={() => handleRunPipeline(project.id, 'build-deploy')}
                      >
                        部署
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      {showCreate && (
        <Box sx={{ mt: 3 }}>
          <Paper sx={{ p: 3, border: '2px dashed', borderColor: 'primary.main' }}>
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
              gutterBottom
            >
              创建新项目
            </Typography>
            <Grid
              container
              spacing={2}
            >
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label='项目名称'
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder='输入项目名称'
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>技术栈预设</InputLabel>
                  <Select
                    value={selectedStack}
                    label='技术栈预设'
                    onChange={(e) => setSelectedStack(e.target.value)}
                  >
                    {presetStacks.map((s) => (
                      <MenuItem
                        key={s.id}
                        value={s.id}
                      >
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: 'flex', gap: 1, height: '100%', alignItems: 'flex-end' }}>
                  <Button
                    variant='contained'
                    onClick={handleCreate}
                    sx={{ flex: 1 }}
                  >
                    创建
                  </Button>
                  <Button onClick={() => setShowCreate(false)}>取消</Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}

      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </Box>
  );
};

const ProjectDetailDialog: React.FC<{ project: DevProject; onClose: () => void }> = ({
  project,
  onClose,
}) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'action.active',
      zIndex: 10001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    onClick={onClose}
  >
    <Paper
      sx={{ width: 600, maxWidth: '90vw', p: 3 }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          {project.name}
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
        >
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Stack spacing={2}>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            技术栈
          </Typography>
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ mt: 0.5 }}
          >
            <Chip
              label={FRAMEWORK_LABELS[project.stack.framework]}
              size='small'
            />
            <Chip
              label={UI_LABELS[project.stack.ui] || project.stack.ui}
              size='small'
            />
            <Chip
              label={project.stack.buildTool}
              size='small'
            />
            <Chip
              label={project.stack.packageManager}
              size='small'
            />
          </Stack>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            环境配置
          </Typography>
          <Grid
            container
            spacing={1}
            sx={{ mt: 0.5 }}
          >
            {Object.entries(project.config.environments).map(([key, env]) => (
              <Grid
                size={{ xs: 6 }}
                key={key}
              >
                <Paper
                  variant='outlined'
                  sx={{ p: 1 }}
                >
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600 }}
                  >
                    {ENV_LABELS[key as EnvironmentName]}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ display: 'block' }}
                    color='text.secondary'
                  >
                    {env.baseUrl}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            健康状况
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <LinearProgress
              variant='determinate'
              value={project.health.score}
              sx={{ flex: 1, height: 8, borderRadius: 4 }}
              color={project.health.score >= 80 ? 'success' : 'warning'}
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 600 }}
            >
              {project.health.score}/100
            </Typography>
          </Box>
          {project.health.issues.length > 0 && (
            <Stack
              spacing={0.5}
              sx={{ mt: 1 }}
            >
              {project.health.issues.map((issue) => (
                <Alert
                  key={issue.id}
                  severity={
                    issue.severity === 'critical'
                      ? 'error'
                      : issue.severity === 'high'
                        ? 'warning'
                        : 'info'
                  }
                  variant='outlined'
                  sx={{ py: 0.5 }}
                >
                  <Typography variant='caption'>{issue.title}</Typography>
                </Alert>
              ))}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  </Box>
);

// ==================== Builder Tab ====================

const BuilderTab: React.FC<{ pages: CanvasPage[] }> = ({ pages }) => {
  const [selectedPage, setSelectedPage] = React.useState<CanvasPage | null>(
    pages.length > 0 ? pages[0] : null
  );
  const [newPageName, setNewPageName] = React.useState('');

  const handleCreatePage = () => {
    if (!newPageName.trim()) return;
    const page = lowCodeBuilder.createPage(newPageName.trim());
    setSelectedPage(page);
    setNewPageName('');
  };

  const handleAddComponent = (type: string) => {
    if (!selectedPage) return;
    lowCodeBuilder.addComponent(selectedPage.id, {
      type: type as never,
      x: Math.random() * 400,
      y: Math.random() * 300,
      width: 200,
      height: 60,
    });
    const updated = lowCodeBuilder.getPage(selectedPage.id);
    if (updated) setSelectedPage({ ...updated });
  };

  const handlePublish = () => {
    if (!selectedPage) return;
    lowCodeBuilder.publish(selectedPage.id);
  };

  const componentTypes: Array<{ type: string; label: string; icon: React.ReactNode }> = [
    { type: 'text', label: '文本', icon: <MousePointerClick size={16} /> },
    { type: 'heading', label: '标题', icon: <MousePointerClick size={16} /> },
    { type: 'button', label: '按钮', icon: <MousePointerClick size={16} /> },
    { type: 'input', label: '输入框', icon: <MousePointerClick size={16} /> },
    { type: 'card', label: '卡片', icon: <MousePointerClick size={16} /> },
    { type: 'table', label: '表格', icon: <MousePointerClick size={16} /> },
    { type: 'chart', label: '图表', icon: <MousePointerClick size={16} /> },
    { type: 'container', label: '容器', icon: <BoxIcon size={16} /> },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant='outlined'>
            <CardHeader
              title='页面列表'
              avatar={<Layout size={18} />}
            />
            <CardContent>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size='small'
                    placeholder='新建页面...'
                    value={newPageName}
                    onChange={(e) => setNewPageName(e.target.value)}
                    sx={{ flex: 1 }}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
                  />
                  <Button
                    size='small'
                    variant='contained'
                    onClick={handleCreatePage}
                  >
                    <Plus size={16} />
                  </Button>
                </Box>
                <Divider />
                <List
                  dense
                  sx={{ maxHeight: 300, overflow: 'auto' }}
                >
                  {pages.map((page) => (
                    <ListItem
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor:
                          selectedPage?.id === page.id ? 'action.selected' : undefined,
                        borderRadius: 1,
                        '&.Mui-selected': { bgcolor: 'primary.light' },
                      }}
                    >
                      <ListItemText
                        primary={page.name}
                        secondary={`${page.components.length} 组件 · ${page.status}`}
                      />
                    </ListItem>
                  ))}
                  {pages.length === 0 && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ p: 2, textAlign: 'center' }}
                    >
                      暂无页面
                    </Typography>
                  )}
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader
              title={selectedPage ? selectedPage.name : '画布'}
              avatar={<BoxIcon size={18} />}
              action={
                selectedPage && (
                  <Button
                    size='small'
                    variant='contained'
                    onClick={handlePublish}
                  >
                    <Upload
                      size={14}
                      style={{ marginRight: 4 }}
                    />{' '}
                    发布
                  </Button>
                )
              }
            />
            <CardContent>
              {selectedPage ? (
                <Box sx={{ minHeight: 400, bgcolor: 'grey.100', borderRadius: 1, p: 2 }}>
                  {selectedPage.components.length === 0 ? (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: 300,
                        color: 'text.secondary',
                      }}
                    >
                      <MousePointerClick size={32} />
                      <Typography
                        variant='body2'
                        sx={{ mt: 1 }}
                      >
                        从左侧拖拽或点击组件添加到画布
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1}>
                      {selectedPage.components.map((comp) => (
                        <Paper
                          key={comp.id}
                          sx={{
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            border: '1px dashed',
                            borderColor: 'primary.main',
                          }}
                        >
                          <BoxIcon
                            size={16}
                            color={designTokens.colors.secondary.dark}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {comp.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {comp.type} · ({comp.position.x}, {comp.position.y})
                            </Typography>
                          </Box>
                          <Chip
                            label={`${comp.position.width}x${comp.position.height}`}
                            size='small'
                            variant='outlined'
                          />
                        </Paper>
                      ))}
                    </Stack>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                  }}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    选择或创建一个页面开始搭建
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card variant='outlined'>
            <CardHeader
              title='组件库'
              avatar={<Layers size={18} />}
            />
            <CardContent>
              <Stack spacing={1}>
                {componentTypes.map((ct) => (
                  <Button
                    key={ct.type}
                    variant='outlined'
                    size='small'
                    startIcon={ct.icon}
                    onClick={() => handleAddComponent(ct.type)}
                    sx={{ justifyContent: 'flex-start' }}
                    fullWidth
                  >
                    {ct.label}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {selectedPage && (
            <Card
              variant='outlined'
              sx={{ mt: 2 }}
            >
              <CardHeader
                title='页面属性'
                avatar={<Settings size={18} />}
              />
              <CardContent>
                <Stack spacing={1.5}>
                  <InfoRow
                    icon={
                      <Database
                        size={16}
                        color={designTokens.colors.secondary.dark}
                      />
                    }
                    label='数据源'
                    value={`${selectedPage.dataSources.length} 个`}
                  />
                  <InfoRow
                    icon={
                      <Palette
                        size={16}
                        color={designTokens.colors.pink.main}
                      />
                    }
                    label='主题模式'
                    value={selectedPage.theme.mode}
                  />
                  <InfoRow
                    icon={
                      <GitBranch
                        size={16}
                        color='#14b8a6'
                      />
                    }
                    label='版本'
                    value={selectedPage.version}
                  />
                </Stack>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== Marketplace Tab ====================

const MarketplaceTab: React.FC<{ installedPlugins: InstalledPlugin[] }> = ({
  installedPlugins,
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<SearchResult>(() =>
    pluginMarketplace.search({ pageSize: 12 })
  );
  const [selectedPlugin, setSelectedPlugin] = React.useState<PluginManifest | null>(null);
  const [compatibility, setCompatibility] = React.useState<CompatibilityCheck | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const results = pluginMarketplace.search({ query, pageSize: 12 });
    setSearchResults(results);
  };

  const handleInstall = (pluginId: string) => {
    pluginMarketplace.install(pluginId);
  };

  const handleUninstall = (pluginId: string) => {
    pluginMarketplace.uninstall(pluginId);
  };

  const handleCheckCompat = (plugin: PluginManifest) => {
    setSelectedPlugin(plugin);
    const check = pluginMarketplace.checkCompatibility(plugin.id);
    setCompatibility(check);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          size='small'
          placeholder='搜索插件...'
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search size={16} />,
            },
          }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
      </Box>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader
              title={`插件市场 (${searchResults.total})`}
              avatar={<Blocks size={18} />}
            />
            <CardContent>
              <Grid
                container
                spacing={2}
              >
                {searchResults.items.map((plugin) => {
                  const installed = installedPlugins.find((p) => p.manifest.id === plugin.id);
                  return (
                    <Grid
                      size={{ xs: 12, sm: 6, md: 4 }}
                      key={plugin.id}
                    >
                      <Paper
                        variant='outlined'
                        sx={{
                          p: 2,
                          height: '100%',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { boxShadow: 2, transform: 'translateY(-2px)' },
                        }}
                        onClick={() => handleCheckCompat(plugin)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 1,
                              bgcolor: 'primary.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Blocks
                              size={18}
                              color={designTokens.colors.secondary.dark}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600 }}
                            >
                              {plugin.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              v{plugin.version}
                            </Typography>
                          </Box>
                          {installed && (
                            <CheckCircle2
                              size={18}
                              color='#22c55e'
                            />
                          )}
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ display: 'block', mb: 1, height: 32, overflow: 'hidden' }}
                        >
                          {plugin.description}
                        </Typography>
                        <Stack
                          direction='row'
                          spacing={0.5}
                          sx={{ mb: 1 }}
                        >
                          <Chip
                            label={plugin.category}
                            size='small'
                            variant='outlined'
                          />
                          {plugin.isVerified && (
                            <Chip
                              label='认证'
                              size='small'
                              color='success'
                              variant='outlined'
                            />
                          )}
                        </Stack>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {installed ? (
                            <Button
                              size='small'
                              variant='outlined'
                              color='error'
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUninstall(plugin.id);
                              }}
                            >
                              卸载
                            </Button>
                          ) : (
                            <Button
                              size='small'
                              variant='contained'
                              fullWidth
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInstall(plugin.id);
                              }}
                            >
                              安装
                            </Button>
                          )}
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant='outlined'>
            <CardHeader
              title='已安装'
              avatar={<Package size={18} />}
            />
            <CardContent>
              <Stack spacing={1}>
                {installedPlugins.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ py: 2, textAlign: 'center' }}
                  >
                    暂无已安装插件
                  </Typography>
                ) : (
                  installedPlugins.map((p) => (
                    <Paper
                      key={p.manifest.id}
                      variant='outlined'
                      sx={{ p: 1.5 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Blocks
                          size={16}
                          color={designTokens.colors.secondary.dark}
                        />
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500, flex: 1 }}
                        >
                          {p.manifest.name}
                        </Typography>
                        <Chip
                          label={p.enabled ? '启用' : '禁用'}
                          size='small'
                          color={p.enabled ? 'success' : 'default'}
                        />
                      </Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        v{p.installedVersion} · {p.manifest.category}
                      </Typography>
                    </Paper>
                  ))
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {selectedPlugin && compatibility && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'action.active',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedPlugin(null)}
        >
          <Paper
            sx={{ width: 500, maxWidth: '90vw', p: 3 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {selectedPlugin.name}
              </Typography>
              <IconButton
                size='small'
                onClick={() => setSelectedPlugin(null)}
              >
                <XIcon size={18} />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              <Typography variant='body2'>{selectedPlugin.description}</Typography>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  兼容性检查
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {compatibility.compatible ? (
                    <Alert
                      severity='success'
                      variant='outlined'
                    >
                      此插件与当前环境兼容
                    </Alert>
                  ) : (
                    <Alert
                      severity='error'
                      variant='outlined'
                    >
                      <Stack spacing={0.5}>
                        {compatibility.conflicts.map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                  {compatibility.warnings.length > 0 && (
                    <Alert
                      severity='warning'
                      variant='outlined'
                      sx={{ mt: 1 }}
                    >
                      <Stack spacing={0.5}>
                        {compatibility.warnings.map((w, i) => (
                          <span key={i}>{w}</span>
                        ))}
                      </Stack>
                    </Alert>
                  )}
                </Box>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  权限要求
                </Typography>
                <Stack
                  direction='row'
                  spacing={0.5}
                  sx={{ mt: 0.5 }}
                >
                  {selectedPlugin.permissions.map((perm) => (
                    <Chip
                      key={perm}
                      label={perm}
                      size='small'
                      variant='outlined'
                      icon={<Shield size={14} />}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

// ==================== Pipelines Tab ====================

const PipelinesTab: React.FC<{
  pipelineRuns: PipelineRun[];
  projects: DevProject[];
}> = ({ pipelineRuns, projects }) => {
  const [selectedRun, setSelectedRun] = React.useState<PipelineRun | null>(null);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
        gutterBottom
      >
        流水线运行历史
      </Typography>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader
              title='运行记录'
              avatar={<Workflow size={18} />}
            />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>流水线</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>阶段</TableCell>
                      <TableCell>耗时</TableCell>
                      <TableCell align='right'>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pipelineRuns.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align='center'
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          暂无流水线记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      pipelineRuns.map((run) => (
                        <TableRow
                          key={run.id}
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {run.pipelineId}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(run.startedAt).toLocaleTimeString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={run.status}
                              size='small'
                              sx={{
                                bgcolor: STATUS_COLORS[run.status],
                                color: 'common.white',
                                height: 22,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {run.stages.map((stage, i) => (
                                <Tooltip
                                  key={i}
                                  title={`${stage.name}: ${stage.status}`}
                                >
                                  <Box
                                    sx={{
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      bgcolor: STATUS_COLORS[stage.status] || '#9e9e9e',
                                    }}
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {run.totalDurationMs ? (
                              <Typography variant='caption'>
                                {(run.totalDurationMs / 1000).toFixed(1)}s
                              </Typography>
                            ) : (
                              <CircularProgress size={14} />
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            <IconButton
                              size='small'
                              onClick={() => setSelectedRun(run)}
                            >
                              <ChevronRight size={18} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant='outlined'>
            <CardHeader
              title='快速操作'
              avatar={<Play size={18} />}
            />
            <CardContent>
              <Stack spacing={1.5}>
                {projects.map((project) => (
                  <Paper
                    key={project.id}
                    variant='outlined'
                    sx={{ p: 1.5 }}
                  >
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                      gutterBottom
                    >
                      {project.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => unifiedDevPlatform.runPipeline(project.id, 'build-only')}
                      >
                        仅构建
                      </Button>
                      <Button
                        size='small'
                        variant='contained'
                        onClick={() => unifiedDevPlatform.runPipeline(project.id, 'build-deploy')}
                      >
                        构建部署
                      </Button>
                    </Box>
                  </Paper>
                ))}
                {projects.length === 0 && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ textAlign: 'center' }}
                  >
                    暂无项目
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {selectedRun && (
        <PipelineDetailDialog
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </Box>
  );
};

const PipelineDetailDialog: React.FC<{ run: PipelineRun; onClose: () => void }> = ({
  run,
  onClose,
}) => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'action.active',
      zIndex: 10001,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
    onClick={onClose}
  >
    <Paper
      sx={{ width: 600, maxWidth: '90vw', p: 3, maxHeight: '80vh', overflow: 'auto' }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          {run.pipelineId}
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
        >
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Stack spacing={2}>
        <Box>
          <Chip
            label={run.status}
            size='small'
            sx={{ bgcolor: STATUS_COLORS[run.status], color: 'common.white' }}
          />
          {run.totalDurationMs && (
            <Typography
              variant='caption'
              sx={{ ml: 1 }}
            >
              耗时: {(run.totalDurationMs / 1000).toFixed(1)}s
            </Typography>
          )}
        </Box>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
            gutterBottom
          >
            阶段详情
          </Typography>
          <Stack spacing={1}>
            {run.stages.map((stage, i) => (
              <StageTimeline
                key={i}
                stage={stage}
                index={i}
              />
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  </Box>
);

const StageTimeline: React.FC<{ stage: PipelineStage; index: number }> = ({ stage, index }) => (
  <Box sx={{ display: 'flex', gap: 1.5 }}>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 24,
      }}
    >
      <Box
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: STATUS_COLORS[stage.status] || '#9e9e9e',
          color: 'common.white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          fontWeight: 700,
        }}
      >
        {index + 1}
      </Box>
      {index < 10 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5 }} />}
    </Box>
    <Box sx={{ flex: 1, pb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          {stage.name}
        </Typography>
        {stage.status === 'running' && (
          <Loader2
            size={14}
            className='animate-spin'
          />
        )}
        {stage.status === 'success' && (
          <CheckCircle2
            size={14}
            color='#22c55e'
          />
        )}
        {stage.status === 'failed' && (
          <XCircle
            size={14}
            color={designTokens.colors.error.main}
          />
        )}
      </Box>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {stage.type}
        {stage.durationMs && ` · ${stage.durationMs}ms`}
      </Typography>
      {stage.logs.length > 0 && (
        <Paper
          variant='outlined'
          sx={{
            mt: 0.5,
            p: 1,
            bgcolor: 'grey.50',
            fontFamily: 'monospace',
            fontSize: 11,
          }}
        >
          {stage.logs.slice(-3).map((log, i) => (
            <Typography
              key={i}
              variant='caption'
              component='span'
              sx={{ display: 'block' }}
            >
              {log}
            </Typography>
          ))}
        </Paper>
      )}
    </Box>
  </Box>
);

// ==================== Activity Tab ====================

const ActivityTab: React.FC<{
  projects: DevProject[];
  pipelineRuns: PipelineRun[];
}> = ({ projects, pipelineRuns }) => {
  const activities: Array<{
    id: string;
    time: string;
    type: 'project' | 'pipeline' | 'plugin';
    message: string;
    color: string;
  }> = [];

  projects.forEach((p) => {
    activities.push({
      id: `p_${p.id}`,
      time: new Date(p.updated_at).toLocaleString(),
      type: 'project',
      message: `项目 "${p.name}" 状态更新为 ${p.status}`,
      color: 'secondary.500',
    });
  });

  pipelineRuns.forEach((r) => {
    activities.push({
      id: `r_${r.id}`,
      time: new Date(r.startedAt).toLocaleString(),
      type: 'pipeline',
      message: `流水线 ${r.pipelineId} ${r.status}`,
      color: STATUS_COLORS[r.status] || '#9e9e9e',
    });
  });

  activities.sort((a, b) => b.time.localeCompare(a.time));

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
        gutterBottom
      >
        活动日志
      </Typography>
      <Card variant='outlined'>
        <CardHeader
          title='最近活动'
          avatar={<Activity size={18} />}
        />
        <CardContent>
          <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
            {activities.length === 0 ? (
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ py: 4, textAlign: 'center' }}
              >
                暂无活动记录
              </Typography>
            ) : (
              <Stack spacing={1}>
                {activities.slice(0, 50).map((activity) => (
                  <Paper
                    key={activity.id}
                    variant='outlined'
                    sx={{ p: 1.5 }}
                  >
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: activity.color,
                          mt: 0.5,
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant='body2'>{activity.message}</Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {activity.time}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default V53PlatformConsole;
export { V53PlatformConsole };
