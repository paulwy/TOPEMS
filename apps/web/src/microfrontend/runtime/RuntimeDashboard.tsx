import { designTokens, semanticTokens } from '@topems/tokens';
import i18n from '@/i18n';
/**
 * V45.0 Track F: 微前端终极形态 — 运行时控制台
 *
 * 可视化控制台，包含四个 Tab：
 * 1. 动态加载：已加载模块列表 + 加载状态 + 加载耗时 + 卸载/重载按钮
 * 2. 跨框架：框架适配器列表 + 挂载的组件 + 属性/事件传递测试
 * 3. 设计系统：设计令牌浏览 + 主题切换 + CSS 变量预览 + 实时同步状态
 * 4. 生命周期：模块状态列表 + 生命周期事件时间线 + 状态转换图
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  Grid,
  Paper,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  X as XIcon,
  Package as PackageIcon,
  Layers as LayersIcon,
  Palette as PaletteIcon,
  Activity as ActivityIcon,
  RefreshCw as RefreshIcon,
  Trash2 as TrashIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Zap as ZapIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  Clock as ClockIcon,
  AlertCircle as AlertCircleIcon,
  ChevronDown as ChevronDownIcon,
  Play as PlayIcon,
  Code as CodeIcon,
  Cpu as CpuIcon,
  Boxes as BoxesIcon,
} from 'lucide-react';
import { dynamicLoader, ModuleLoadStatus, type RuntimeModule } from './dynamic-loader';
import {
  crossFrameworkBridge,
  FrameworkType,
  type MountedComponent,
  type UnifiedProps,
} from './cross-framework';
import {
  designSystemManager,
  TokenType,
  type DesignToken,
  type ThemeConfig,
} from './design-system';
import {
  lifecycleManager,
  LifecycleState,
  LifecycleEventType,
  type ModuleLifecycleRecord,
  type LifecycleEvent,
} from './module-lifecycle';

// ==================== 通用组件 ====================

interface RuntimeDashboardProps {
  onClose?: () => void;
}

type TabType = 'loader' | 'framework' | 'design' | 'lifecycle';

const statusColors: Record<ModuleLoadStatus, string> = {
  [ModuleLoadStatus.UNLOADED]: 'colors.grey.500',
  [ModuleLoadStatus.LOADING]: designTokens.colors.warning.main,
  [ModuleLoadStatus.LOADED]: designTokens.colors.success.dark,
  [ModuleLoadStatus.FAILED]: designTokens.colors.error.main,
};

const statusLabels: Record<ModuleLoadStatus, string> = {
  [ModuleLoadStatus.UNLOADED]: i18n.t('microfrontend.runtime_dashboard.k0'),
  [ModuleLoadStatus.LOADING]: i18n.t('microfrontend.runtime_dashboard.k1'),
  [ModuleLoadStatus.LOADED]: i18n.t('microfrontend.runtime_dashboard.k2'),
  [ModuleLoadStatus.FAILED]: i18n.t('microfrontend.runtime_dashboard.k3'),
};

const lifecycleStateColors: Record<LifecycleState, string> = {
  [LifecycleState.REGISTERED]: 'colors.grey.500',
  [LifecycleState.PRELOADING]: designTokens.colors.warning.main,
  [LifecycleState.LOADED]: designTokens.colors.primary.main,
  [LifecycleState.MOUNTING]: designTokens.colors.secondary.main,
  [LifecycleState.MOUNTED]: designTokens.colors.success.dark,
  [LifecycleState.UPDATING]: 'colors.cyan.500',
  [LifecycleState.ERROR]: designTokens.colors.error.main,
  [LifecycleState.UNMOUNTING]: 'colors.orange.500',
  [LifecycleState.UNMOUNTED]: designTokens.colors.grey['400'],
};

const lifecycleStateLabels: Record<LifecycleState, string> = {
  [LifecycleState.REGISTERED]: i18n.t('microfrontend.runtime_dashboard.k4'),
  [LifecycleState.PRELOADING]: i18n.t('microfrontend.runtime_dashboard.k5'),
  [LifecycleState.LOADED]: i18n.t('microfrontend.runtime_dashboard.k6'),
  [LifecycleState.MOUNTING]: i18n.t('microfrontend.runtime_dashboard.k7'),
  [LifecycleState.MOUNTED]: i18n.t('microfrontend.runtime_dashboard.k8'),
  [LifecycleState.UPDATING]: i18n.t('microfrontend.runtime_dashboard.k9'),
  [LifecycleState.ERROR]: i18n.t('microfrontend.runtime_dashboard.k10'),
  [LifecycleState.UNMOUNTING]: i18n.t('microfrontend.runtime_dashboard.k11'),
  [LifecycleState.UNMOUNTED]: i18n.t('microfrontend.runtime_dashboard.k12'),
};

const frameworkColors: Record<FrameworkType, string> = {
  [FrameworkType.REACT]: 'var(--color-info-light)',
  [FrameworkType.VUE]: 'var(--color-success-400)',
  [FrameworkType.ANGULAR]: designTokens.colors.error[700],
  [FrameworkType.SVELTE]: designTokens.colors.error[600],
  [FrameworkType.VANILLA]: 'colors.grey.500',
};

const frameworkLabels: Record<FrameworkType, string> = {
  [FrameworkType.REACT]: 'React',
  [FrameworkType.VUE]: 'Vue',
  [FrameworkType.ANGULAR]: 'Angular',
  [FrameworkType.SVELTE]: 'Svelte',
  [FrameworkType.VANILLA]: 'Vanilla',
};

const tokenTypeLabels: Record<TokenType, string> = {
  [TokenType.COLOR]: i18n.t('microfrontend.runtime_dashboard.k13'),
  [TokenType.TYPOGRAPHY]: i18n.t('microfrontend.runtime_dashboard.k14'),
  [TokenType.SPACING]: i18n.t('microfrontend.runtime_dashboard.k15'),
  [TokenType.BORDER]: i18n.t('microfrontend.runtime_dashboard.k16'),
  [TokenType.SHADOW]: i18n.t('microfrontend.runtime_dashboard.k17'),
  [TokenType.ANIMATION]: i18n.t('microfrontend.runtime_dashboard.k18'),
  [TokenType.ZINDEX]: i18n.t('microfrontend.runtime_dashboard.k19'),
  [TokenType.BREAKPOINT]: i18n.t('microfrontend.runtime_dashboard.k20'),
};

const eventTypeLabels: Record<LifecycleEventType, string> = {
  [LifecycleEventType.REGISTERED]: i18n.t('microfrontend.runtime_dashboard.k21'),
  [LifecycleEventType.PRELOADSTART]: i18n.t('microfrontend.runtime_dashboard.k22'),
  [LifecycleEventType.PRELOADEND]: i18n.t('microfrontend.runtime_dashboard.k23'),
  [LifecycleEventType.LOADSTART]: i18n.t('microfrontend.runtime_dashboard.k24'),
  [LifecycleEventType.LOADEND]: i18n.t('microfrontend.runtime_dashboard.k25'),
  [LifecycleEventType.MOUNTSTART]: i18n.t('microfrontend.runtime_dashboard.k26'),
  [LifecycleEventType.MOUNTEND]: i18n.t('microfrontend.runtime_dashboard.k27'),
  [LifecycleEventType.UPDATESTART]: i18n.t('microfrontend.runtime_dashboard.k28'),
  [LifecycleEventType.UPDATEEND]: i18n.t('microfrontend.runtime_dashboard.k29'),
  [LifecycleEventType.UNMOUNTSTART]: i18n.t('microfrontend.runtime_dashboard.k30'),
  [LifecycleEventType.UNMOUNTEND]: i18n.t('microfrontend.runtime_dashboard.k31'),
  [LifecycleEventType.ERROR]: i18n.t('microfrontend.runtime_dashboard.k32'),
  [LifecycleEventType.DESTROYED]: i18n.t('microfrontend.runtime_dashboard.k33'),
  [LifecycleEventType.STATECHANGE]: i18n.t('microfrontend.runtime_dashboard.k34'),
};

// ==================== 主组件 ====================

const RuntimeDashboard: React.FC<RuntimeDashboardProps> = ({ onClose }) => {
  const [tab, setTab] = useState<TabType>('loader');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 顶部标题栏 */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'text.primary',
          color: 'common.white',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BoxesIcon size={22} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k0')}
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        )}
      </Box>

      {/* Tab 导航 */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Tab
          icon={<PackageIcon size={16} />}
          iconPosition='start'
          label={i18n.t('microfrontend.runtime_dashboard.k35')}
          value='loader'
        />
        <Tab
          icon={<LayersIcon size={16} />}
          iconPosition='start'
          label={i18n.t('microfrontend.runtime_dashboard.k36')}
          value='framework'
        />
        <Tab
          icon={<PaletteIcon size={16} />}
          iconPosition='start'
          label={i18n.t('microfrontend.runtime_dashboard.k37')}
          value='design'
        />
        <Tab
          icon={<ActivityIcon size={16} />}
          iconPosition='start'
          label={i18n.t('microfrontend.runtime_dashboard.k38')}
          value='lifecycle'
        />
      </Tabs>

      {/* Tab 内容 */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {tab === 'loader' && <DynamicLoaderTab />}
        {tab === 'framework' && <CrossFrameworkTab />}
        {tab === 'design' && <DesignSystemTab />}
        {tab === 'lifecycle' && <LifecycleTab />}
      </Box>
    </Box>
  );
};

// ==================== Tab 1: 动态加载 ====================

const DynamicLoaderTab: React.FC = () => {
  const [modules, setModules] = useState<RuntimeModule[]>([]);
  const [currentLoads, setCurrentLoads] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const [newModuleId, setNewModuleId] = useState('');
  const [newModuleUrl, setNewModuleUrl] = useState('');

  const refresh = useCallback(() => {
    setModules(dynamicLoader.getRegisteredModules());
    setCurrentLoads(dynamicLoader.currentLoads);
    setPendingCount(dynamicLoader.pendingCount);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = dynamicLoader.onStatusChange(() => refresh());
    const interval = setInterval(refresh, 2000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleLoad = async (id: string) => {
    try {
      await dynamicLoader.loadModule(id);
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k0')}${id}${i18n.t('microfrontend.runtime_dashboard.k1')}`,
        type: 'success',
      });
      refresh();
    } catch (err) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k2')}${(err as Error).message}`,
        type: 'error',
      });
    }
  };

  const handleUnload = (id: string) => {
    dynamicLoader.unloadModule(id);
    setSnack({
      open: true,
      msg: `${i18n.t('microfrontend.runtime_dashboard.k3')}${id}${i18n.t('microfrontend.runtime_dashboard.k4')}`,
      type: 'success',
    });
    refresh();
  };

  const handleReload = async (id: string) => {
    try {
      await dynamicLoader.reloadModule(id);
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k5')}${id}${i18n.t('microfrontend.runtime_dashboard.k6')}`,
        type: 'success',
      });
      refresh();
    } catch (err) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k7')}${(err as Error).message}`,
        type: 'error',
      });
    }
  };

  const handlePreload = async (id: string) => {
    await dynamicLoader.preloadModule(id);
    setSnack({
      open: true,
      msg: `${i18n.t('microfrontend.runtime_dashboard.k8')}${id}${i18n.t('microfrontend.runtime_dashboard.k9')}`,
      type: 'success',
    });
    refresh();
  };

  const handleRegister = async () => {
    if (!newModuleId.trim()) {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.id_39'), type: 'error' });
      return;
    }
    try {
      if (newModuleUrl.trim()) {
        await dynamicLoader.loadModuleFromString(newModuleId.trim(), newModuleUrl.trim());
      } else {
        dynamicLoader.registerModule(newModuleId.trim(), () =>
          Promise.resolve({ default: () => null })
        );
      }
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k10')}${newModuleId}${i18n.t('microfrontend.runtime_dashboard.k11')}`,
        type: 'success',
      });
      setNewModuleId('');
      setNewModuleUrl('');
      refresh();
    } catch (err) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k12')}${(err as Error).message}`,
        type: 'error',
      });
    }
  };

  const loadedCount = modules.filter((m) => m.status === ModuleLoadStatus.LOADED).length;
  const failedCount = modules.filter((m) => m.status === ModuleLoadStatus.FAILED).length;

  return (
    <Box>
      {/* 统计卡片 */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k40')}
            value={modules.length}
            icon={<PackageIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k41')}
            value={loadedCount}
            icon={<CheckCircleIcon size={20} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k42')}
            value={failedCount}
            icon={<XCircleIcon size={20} />}
            color={designTokens.colors.error.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k43')}
            value={`${currentLoads}/${pendingCount}`}
            icon={<CpuIcon size={20} />}
            color={designTokens.colors.warning.main}
          />
        </Grid>
      </Grid>

      {/* 注册新模块 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k1')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size='small'
              label={i18n.t('microfrontend.runtime_dashboard.id_44')}
              value={newModuleId}
              onChange={(e) => setNewModuleId(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size='small'
              label={i18n.t('microfrontend.runtime_dashboard.url_45')}
              value={newModuleUrl}
              onChange={(e) => setNewModuleUrl(e.target.value)}
              sx={{ minWidth: 250 }}
            />
            <Button
              variant='contained'
              size='small'
              startIcon={<DownloadIcon size={16} />}
              onClick={handleRegister}
            >
              {i18n.t('microfrontend.runtime_dashboard.k2')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<RefreshIcon size={16} />}
              onClick={() => dynamicLoader.clearCache()}
            >
              {i18n.t('microfrontend.runtime_dashboard.k3')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 模块列表 */}
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('microfrontend.runtime_dashboard.k4')}
            </Typography>
            <Button
              size='small'
              startIcon={<RefreshIcon size={14} />}
              onClick={refresh}
            >
              {i18n.t('microfrontend.runtime_dashboard.k5')}
            </Button>
          </Box>
          {modules.length === 0 ? (
            <Typography
              color='text.secondary'
              sx={{ py: 3, textAlign: 'center' }}
            >
              {i18n.t('microfrontend.runtime_dashboard.k6')}
            </Typography>
          ) : (
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k46')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k47')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k48')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k49')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k50')}</TableCell>
                    <TableCell align='right'>
                      {i18n.t('microfrontend.runtime_dashboard.k51')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.map((mod) => (
                    <TableRow
                      key={mod.id}
                      hover
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>{mod.id}</TableCell>
                      <TableCell>{mod.name}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={statusLabels[mod.status]}
                          sx={{
                            bgcolor: statusColors[mod.status],
                            color: 'common.white',
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {mod.load_duration != null ? `${mod.load_duration}ms` : '-'}
                      </TableCell>
                      <TableCell>{mod.retry_count > 0 ? mod.retry_count : '-'}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {mod.error ? (
                          <Tooltip title={mod.error.message}>
                            <AlertCircleIcon
                              size={16}
                              color={designTokens.colors.error.main}
                            />
                          </Tooltip>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell align='right'>
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {mod.status !== ModuleLoadStatus.LOADED && (
                            <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k52')}>
                              <IconButton
                                size='small'
                                onClick={() => handleLoad(mod.id)}
                              >
                                <DownloadIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {mod.status === ModuleLoadStatus.LOADED && (
                            <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k53')}>
                              <IconButton
                                size='small'
                                onClick={() => handlePreload(mod.id)}
                              >
                                <UploadIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {mod.status === ModuleLoadStatus.LOADED && (
                            <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k54')}>
                              <IconButton
                                size='small'
                                onClick={() => handleUnload(mod.id)}
                              >
                                <TrashIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k55')}>
                            <IconButton
                              size='small'
                              onClick={() => handleReload(mod.id)}
                            >
                              <RefreshIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.type}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== Tab 2: 跨框架 ====================

const CrossFrameworkTab: React.FC = () => {
  const [mountedComponents, setMountedComponents] = useState<MountedComponent[]>([]);
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>(FrameworkType.REACT);
  const [propsInput, setPropsInput] = useState(
    `{\n  "title": "${i18n.t('microfrontend.runtime_dashboard.k56')}",\n  "count": 42\n}`
  );
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const testMountRef = useRef<HTMLDivElement>(null);
  const componentCounter = useRef(0);

  const refresh = useCallback(() => {
    setMountedComponents(crossFrameworkBridge.listMountedComponents());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = crossFrameworkBridge.onComponentsChange(() => refresh());
    return unsub;
  }, [refresh]);

  const handleTestMount = () => {
    if (!testMountRef.current) return;
    let props: UnifiedProps = {};
    try {
      props = JSON.parse(propsInput);
    } catch {
      setSnack({
        open: true,
        msg: i18n.t('microfrontend.runtime_dashboard.propsjson_13'),
        type: 'error',
      });
      return;
    }

    componentCounter.current += 1;
    const id = `test-${selectedFramework}-${componentCounter.current}`;

    // 创建一个模拟组件
    const mockComponent = selectedFramework === FrameworkType.REACT ? () => null : {};

    try {
      const adapter = crossFrameworkBridge.createAdapter(selectedFramework, mockComponent);
      crossFrameworkBridge.mountComponent(id, adapter, testMountRef.current, props, {
        onClick: () =>
          setSnack({
            open: true,
            msg: `${frameworkLabels[selectedFramework]}${i18n.t('microfrontend.runtime_dashboard.k14')}`,
            type: 'success',
          }),
      });
      setSnack({
        open: true,
        msg: `${frameworkLabels[selectedFramework]}${i18n.t('microfrontend.runtime_dashboard.k15')}`,
        type: 'success',
      });
      refresh();
    } catch (err) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k16')}${(err as Error).message}`,
        type: 'error',
      });
    }
  };

  const handleUnmount = (id: string) => {
    crossFrameworkBridge.unmountComponent(id);
    setSnack({
      open: true,
      msg: `${i18n.t('microfrontend.runtime_dashboard.k17')}${id}${i18n.t('microfrontend.runtime_dashboard.k18')}`,
      type: 'success',
    });
    refresh();
  };

  const handleUnmountAll = () => {
    crossFrameworkBridge.unmountAll();
    setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k57'), type: 'success' });
    refresh();
  };

  return (
    <Box>
      {/* 统计 */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k58')}
            value={mountedComponents.length}
            icon={<LayersIcon size={20} />}
            color={designTokens.colors.secondary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='React'
            value={mountedComponents.filter((c) => c.framework === FrameworkType.REACT).length}
            icon={<CodeIcon size={20} />}
            color='var(--color-info-light)'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='Vue'
            value={mountedComponents.filter((c) => c.framework === FrameworkType.VUE).length}
            icon={<CodeIcon size={20} />}
            color='var(--color-success-400)'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='Angular+Svelte'
            value={
              mountedComponents.filter(
                (c) => c.framework === FrameworkType.ANGULAR || c.framework === FrameworkType.SVELTE
              ).length
            }
            icon={<CodeIcon size={20} />}
            color={designTokens.colors.error[700]}
          />
        </Grid>
      </Grid>

      {/* 组件挂载测试区 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k7')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <FormControl
              size='small'
              sx={{ minWidth: 150 }}
            >
              <InputLabel>{i18n.t('microfrontend.runtime_dashboard.k59')}</InputLabel>
              <Select
                value={selectedFramework}
                label={i18n.t('microfrontend.runtime_dashboard.k60')}
                onChange={(e) => setSelectedFramework(e.target.value as FrameworkType)}
              >
                {Object.values(FrameworkType).map((ft) => (
                  <MenuItem
                    key={ft}
                    value={ft}
                  >
                    {frameworkLabels[ft]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant='contained'
              size='small'
              startIcon={<PlayIcon size={16} />}
              onClick={handleTestMount}
            >
              {i18n.t('microfrontend.runtime_dashboard.k8')}
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<TrashIcon size={16} />}
              onClick={handleUnmountAll}
            >
              {i18n.t('microfrontend.runtime_dashboard.k9')}
            </Button>
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            size='small'
            label='Props (JSON)'
            value={propsInput}
            onChange={(e) => setPropsInput(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Box
            ref={testMountRef}
            sx={{
              minHeight: 80,
              border: '2px dashed',
              borderColor: frameworkColors[selectedFramework],
              borderRadius: 1,
              p: 1,
              bgcolor: 'grey.50',
            }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('microfrontend.runtime_dashboard.k10')}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 已挂载组件列表 */}
      <Card>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k11')}
          </Typography>
          {mountedComponents.length === 0 ? (
            <Typography
              color='text.secondary'
              sx={{ py: 3, textAlign: 'center' }}
            >
              {i18n.t('microfrontend.runtime_dashboard.k12')}
            </Typography>
          ) : (
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k61')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k62')}</TableCell>
                    <TableCell>{i18n.t('microfrontend.runtime_dashboard.k63')}</TableCell>
                    <TableCell align='right'>
                      {i18n.t('microfrontend.runtime_dashboard.k64')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mountedComponents.map((comp) => (
                    <TableRow
                      key={comp.id}
                      hover
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {comp.id}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={frameworkLabels[comp.framework]}
                          sx={{
                            bgcolor: frameworkColors[comp.framework],
                            color: 'common.white',
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell>{Object.keys(comp.props).length}</TableCell>
                      <TableCell>{new Date(comp.mountedAt).toLocaleTimeString('zh-CN')}</TableCell>
                      <TableCell align='right'>
                        <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k65')}>
                          <IconButton
                            size='small'
                            onClick={() => handleUnmount(comp.id)}
                          >
                            <TrashIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.type}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== Tab 3: 设计系统 ====================

const DesignSystemTab: React.FC = () => {
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [theme, setTheme] = useState<ThemeConfig>(designSystemManager.getTheme());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });

  const refresh = useCallback(() => {
    setTokens(designSystemManager.getAllTokens());
    setTheme(designSystemManager.getTheme());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = designSystemManager.watchThemeChange(() => refresh());
    return unsub;
  }, [refresh]);

  const handleThemeToggle = () => {
    designSystemManager.toggleTheme();
    setSnack({
      open: true,
      msg: `${i18n.t('microfrontend.runtime_dashboard.k19')}${theme.mode === 'dark' ? i18n.t('microfrontend.runtime_dashboard.k67') : i18n.t('microfrontend.runtime_dashboard.k66')}${i18n.t('microfrontend.runtime_dashboard.k20')}`,
      type: 'success',
    });
    refresh();
  };

  const handleSync = () => {
    designSystemManager.syncToFramework();
    setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k68'), type: 'success' });
  };

  const categories = ['all', ...Array.from(new Set(tokens.map((t) => t.category)))];
  const filteredTokens =
    categoryFilter === 'all' ? tokens : tokens.filter((t) => t.category === categoryFilter);
  const cssVars = designSystemManager.getCssVariables();

  return (
    <Box>
      {/* 统计 */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k69')}
            value={tokens.length}
            icon={<PaletteIcon size={20} />}
            color='colors.secondary.dark'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.css_21')}
            value={cssVars.length}
            icon={<CodeIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k70')}
            value={
              theme.mode === 'dark'
                ? i18n.t('microfrontend.runtime_dashboard.k72')
                : i18n.t('microfrontend.runtime_dashboard.k71')
            }
            icon={theme.mode === 'dark' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            color={theme.mode === 'dark' ? 'colors.grey.800' : designTokens.colors.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k73')}
            value={Object.keys(theme.component_overrides).length}
            icon={<BoxesIcon size={20} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
      </Grid>

      {/* 主题控制 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('microfrontend.runtime_dashboard.k13')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={theme.mode === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                onClick={handleThemeToggle}
              >
                {theme.mode === 'dark'
                  ? i18n.t('microfrontend.runtime_dashboard.k75')
                  : i18n.t('microfrontend.runtime_dashboard.k74')}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<ZapIcon size={16} />}
                onClick={handleSync}
              >
                {i18n.t('microfrontend.runtime_dashboard.k14')}
              </Button>
            </Box>
          </Box>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: theme.background,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography
                  sx={{ color: theme.text_colors.primary, fontSize: 14, fontWeight: 600 }}
                >
                  {i18n.t('microfrontend.runtime_dashboard.k15')}
                </Typography>
                <Typography sx={{ color: theme.text_colors.secondary, fontSize: 13 }}>
                  {i18n.t('microfrontend.runtime_dashboard.k16')}
                </Typography>
                <Typography sx={{ color: theme.text_colors.disabled, fontSize: 12 }}>
                  {i18n.t('microfrontend.runtime_dashboard.k17')}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    size='small'
                    label={i18n.t('microfrontend.runtime_dashboard.k76')}
                    sx={{
                      bgcolor: theme.primary_color,
                      color: 'common.white',
                    }}
                  />
                  <Chip
                    size='small'
                    label={i18n.t('microfrontend.runtime_dashboard.k77')}
                    sx={{
                      bgcolor: theme.secondary_color,
                      color: 'common.white',
                    }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('microfrontend.runtime_dashboard.css_18')}
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip
                  size='small'
                  color='success'
                  label='--ds-color-primary'
                  sx={{ m: 0.25, fontFamily: 'monospace', fontSize: 10 }}
                />
                <Chip
                  size='small'
                  color='success'
                  label='--ds-color-secondary'
                  sx={{ m: 0.25, fontFamily: 'monospace', fontSize: 10 }}
                />
                <Chip
                  size='small'
                  color='success'
                  label='--ds-spacing-md'
                  sx={{ m: 0.25, fontFamily: 'monospace', fontSize: 10 }}
                />
                <Chip
                  size='small'
                  color='success'
                  label='--ds-typography-font-family'
                  sx={{ m: 0.25, fontFamily: 'monospace', fontSize: 10 }}
                />
              </Box>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', mt: 1 }}
              >
                [i18n.t('microfrontend.runtime_dashboard.k19')]: CustomEvent + CSS Variables +
                SharedState
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 设计令牌浏览 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('microfrontend.runtime_dashboard.k0')}
              {filteredTokens.length})
            </Typography>
            <FormControl
              size='small'
              sx={{ minWidth: 150 }}
            >
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map((cat) => (
                  <MenuItem
                    key={cat}
                    value={cat}
                  >
                    {cat === 'all' ? i18n.t('microfrontend.runtime_dashboard.k78') : cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <TableContainer
            component={Paper}
            variant='outlined'
            sx={{ maxHeight: 400 }}
          >
            <Table
              size='small'
              stickyHeader
            >
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k79')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k80')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k81')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k20')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k82')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k0')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTokens.map((token) => (
                  <TableRow
                    key={token.name}
                    hover
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {token.name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={token.category}
                        sx={{ fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{tokenTypeLabels[token.type]}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {String(token.value)}
                    </TableCell>
                    <TableCell>
                      {token.type === TokenType.COLOR ? (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: 0.5,
                            bgcolor: String(token.value),
                            border: 1,
                            borderColor: 'divider',
                          }}
                        />
                      ) : token.type === TokenType.SPACING ? (
                        <Box
                          sx={{
                            width: String(token.value),
                            height: 16,
                            bgcolor: 'secondary.600',
                            borderRadius: 0.5,
                          }}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell
                      sx={{ fontFamily: 'monospace', fontSize: 11, color: 'text.secondary' }}
                    >
                      {designSystemManager.toCssVarName(token)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* CSS 变量预览 */}
      <Card>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.css_1')}
            {cssVars.length})
          </Typography>
          <Box
            sx={{
              bgcolor: 'text.primary',
              color: 'primary.300',
              p: 2,
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: 12,
              maxHeight: 250,
              overflow: 'auto',
            }}
          >
            {cssVars.map((v) => (
              <Box
                key={v.name}
                sx={{ mb: 0.5 }}
              >
                <span style={{ color: 'primary.300' }}>{v.name}</span>
                <span style={{ color: 'text.secondary' }}>: </span>
                <span style={{ color: 'warning.400' }}>{v.value}</span>
                <span style={{ color: 'text.secondary' }}>;</span>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.type}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== Tab 4: 生命周期 ====================

const LifecycleTab: React.FC = () => {
  const [records, setRecords] = useState<ModuleLifecycleRecord[]>([]);
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [snack, setSnack] = useState<{ open: boolean; msg: string; type: 'success' | 'error' }>({
    open: false,
    msg: '',
    type: 'success',
  });
  const [newModuleId, setNewModuleId] = useState('');
  const [newModuleName, setNewModuleName] = useState('');

  const refresh = useCallback(() => {
    setRecords(lifecycleManager.listRecords());
    setEvents(lifecycleManager.getAllEvents().slice(-50).reverse());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = lifecycleManager.onEvent(() => refresh());
    return unsub;
  }, [refresh]);

  const handleRegister = () => {
    if (!newModuleId.trim()) {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.id_83'), type: 'error' });
      return;
    }
    lifecycleManager.register(newModuleId.trim(), {
      name: newModuleName.trim() || newModuleId.trim(),
    });
    setSnack({
      open: true,
      msg: `${i18n.t('microfrontend.runtime_dashboard.k22')}${newModuleId}${i18n.t('microfrontend.runtime_dashboard.k23')}`,
      type: 'success',
    });
    setNewModuleId('');
    setNewModuleName('');
    refresh();
  };

  const handlePreload = (id: string) => {
    if (lifecycleManager.preload(id)) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k24')}${id}${i18n.t('microfrontend.runtime_dashboard.k25')}`,
        type: 'success',
      });
    } else {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k21'), type: 'error' });
    }
    refresh();
  };

  const handleMount = (id: string) => {
    const el = document.createElement('div');
    el.id = `lifecycle-mount-${id}`;
    if (lifecycleManager.mount(id, el, { timestamp: Date.now() })) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k26')}${id}${i18n.t('microfrontend.runtime_dashboard.k27')}`,
        type: 'success',
      });
    } else {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k22'), type: 'error' });
    }
    refresh();
  };

  const handleUnmount = (id: string) => {
    if (lifecycleManager.unmount(id)) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k28')}${id}${i18n.t('microfrontend.runtime_dashboard.k29')}`,
        type: 'success',
      });
    } else {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k23'), type: 'error' });
    }
    refresh();
  };

  const handleDestroy = (id: string) => {
    if (lifecycleManager.destroy(id)) {
      setSnack({
        open: true,
        msg: `${i18n.t('microfrontend.runtime_dashboard.k30')}${id}${i18n.t('microfrontend.runtime_dashboard.k31')}`,
        type: 'success',
      });
    } else {
      setSnack({ open: true, msg: i18n.t('microfrontend.runtime_dashboard.k24'), type: 'error' });
    }
    refresh();
  };

  // 状态转换图数据
  const stateFlow: Array<{ from: LifecycleState; to: LifecycleState; label: string }> = [
    { from: LifecycleState.REGISTERED, to: LifecycleState.PRELOADING, label: 'preload()' },
    { from: LifecycleState.PRELOADING, to: LifecycleState.LOADED, label: 'loaded' },
    { from: LifecycleState.LOADED, to: LifecycleState.MOUNTING, label: 'mount()' },
    { from: LifecycleState.MOUNTING, to: LifecycleState.MOUNTED, label: 'mounted' },
    { from: LifecycleState.MOUNTED, to: LifecycleState.UPDATING, label: 'update()' },
    { from: LifecycleState.UPDATING, to: LifecycleState.MOUNTED, label: 'updated' },
    { from: LifecycleState.MOUNTED, to: LifecycleState.UNMOUNTING, label: 'unmount()' },
    { from: LifecycleState.UNMOUNTING, to: LifecycleState.UNMOUNTED, label: 'unmounted' },
  ];

  const selectedRecord = selectedModule ? lifecycleManager.getRecord(selectedModule) : undefined;

  return (
    <Box>
      {/* 统计 */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k84')}
            value={records.length}
            icon={<ActivityIcon size={20} />}
            color={designTokens.colors.secondary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k85')}
            value={records.filter((r) => r.state === LifecycleState.MOUNTED).length}
            icon={<CheckCircleIcon size={20} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k86')}
            value={lifecycleManager.eventCount}
            icon={<ClockIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.runtime_dashboard.k87')}
            value={records.filter((r) => r.state === LifecycleState.ERROR).length}
            icon={<AlertCircleIcon size={20} />}
            color={designTokens.colors.error.main}
          />
        </Grid>
      </Grid>

      {/* 注册新模块 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k25')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size='small'
              label={i18n.t('microfrontend.runtime_dashboard.id_88')}
              value={newModuleId}
              onChange={(e) => setNewModuleId(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size='small'
              label={i18n.t('microfrontend.runtime_dashboard.k89')}
              value={newModuleName}
              onChange={(e) => setNewModuleName(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant='contained'
              size='small'
              startIcon={<PlayIcon size={16} />}
              onClick={handleRegister}
            >
              {i18n.t('microfrontend.runtime_dashboard.k26')}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 状态转换图 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k27')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            {stateFlow.map((flow, idx) => (
              <React.Fragment key={idx}>
                <Chip
                  size='small'
                  label={lifecycleStateLabels[flow.from]}
                  sx={{
                    bgcolor: lifecycleStateColors[flow.from],
                    color: 'common.white',
                    fontSize: 11,
                  }}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>
                    {flow.label}
                  </Typography>
                  <span style={{ color: 'text.secondary' }}>→</span>
                </Box>
                <Chip
                  size='small'
                  label={lifecycleStateLabels[flow.to]}
                  sx={{
                    bgcolor: lifecycleStateColors[flow.to],
                    color: 'common.white',
                    fontSize: 11,
                  }}
                />
                {idx < stateFlow.length - 1 && (
                  <span style={{ color: 'text.disabled', margin: `0 ${designTokens.spacing.xs}px` }}>|</span>
                )}
              </React.Fragment>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Grid
        container
        spacing={2}
      >
        {/* 模块状态列表 */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('microfrontend.runtime_dashboard.k28')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon size={14} />}
                  onClick={refresh}
                >
                  {i18n.t('microfrontend.runtime_dashboard.k29')}
                </Button>
              </Box>
              {records.length === 0 ? (
                <Typography
                  color='text.secondary'
                  sx={{ py: 3, textAlign: 'center' }}
                >
                  {i18n.t('microfrontend.runtime_dashboard.k30')}
                </Typography>
              ) : (
                <TableContainer
                  component={Paper}
                  variant='outlined'
                >
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>{i18n.t('microfrontend.runtime_dashboard.k90')}</TableCell>
                        <TableCell>{i18n.t('microfrontend.runtime_dashboard.k91')}</TableCell>
                        <TableCell align='right'>
                          {i18n.t('microfrontend.runtime_dashboard.k92')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {records.map((rec) => (
                        <TableRow
                          key={rec.id}
                          hover
                          selected={selectedModule === rec.id}
                          onClick={() => setSelectedModule(rec.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                            {rec.id}
                          </TableCell>
                          <TableCell>{rec.name}</TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={lifecycleStateLabels[rec.state]}
                              sx={{
                                bgcolor: lifecycleStateColors[rec.state],
                                color: 'common.white',
                                fontSize: 11,
                              }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            <Box sx={{ display: 'flex', gap: 0.25, justifyContent: 'flex-end' }}>
                              <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k93')}>
                                <span>
                                  <IconButton
                                    size='small'
                                    disabled={
                                      ![
                                        LifecycleState.REGISTERED,
                                        LifecycleState.UNMOUNTED,
                                        LifecycleState.ERROR,
                                      ].includes(rec.state)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handlePreload(rec.id);
                                    }}
                                  >
                                    <DownloadIcon size={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k94')}>
                                <span>
                                  <IconButton
                                    size='small'
                                    disabled={
                                      ![
                                        LifecycleState.LOADED,
                                        LifecycleState.UNMOUNTED,
                                        LifecycleState.ERROR,
                                      ].includes(rec.state)
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMount(rec.id);
                                    }}
                                  >
                                    <PlayIcon size={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k95')}>
                                <span>
                                  <IconButton
                                    size='small'
                                    disabled={
                                      ![LifecycleState.MOUNTED, LifecycleState.ERROR].includes(
                                        rec.state
                                      )
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUnmount(rec.id);
                                    }}
                                  >
                                    <TrashIcon size={15} />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={i18n.t('microfrontend.runtime_dashboard.k96')}>
                                <IconButton
                                  size='small'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDestroy(rec.id);
                                  }}
                                >
                                  <XIcon size={15} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 选中模块的状态历史 */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle2'
                sx={{ mb: 1, fontWeight: 600 }}
              >
                {selectedRecord
                  ? `${i18n.t('microfrontend.runtime_dashboard.k32')}${selectedRecord.id}${i18n.t('microfrontend.runtime_dashboard.k33')}`
                  : i18n.t('microfrontend.runtime_dashboard.k97')}
              </Typography>
              {selectedRecord && (
                <Box>
                  <Box sx={{ mb: 1 }}>
                    <Chip
                      size='small'
                      label={lifecycleStateLabels[selectedRecord.state]}
                      sx={{
                        bgcolor: lifecycleStateColors[selectedRecord.state],
                        color: 'common.white',
                      }}
                    />
                  </Box>
                  <List dense>
                    {selectedRecord.stateHistory.map((h, idx) => (
                      <ListItem
                        key={idx}
                        sx={{ py: 0.25 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: lifecycleStateColors[h.state],
                            }}
                          />
                          <Typography
                            variant='body2'
                            sx={{ flex: 1 }}
                          >
                            {lifecycleStateLabels[h.state]}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {new Date(h.timestamp).toLocaleTimeString('zh-CN')}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 事件时间线 */}
      <Card>
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('microfrontend.runtime_dashboard.k2')} {events.length}{' '}
            {i18n.t('microfrontend.runtime_dashboard.k3')}
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
            sx={{ maxHeight: 300 }}
          >
            <Table
              size='small'
              stickyHeader
            >
              <TableHead>
                <TableRow>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k98')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k99')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k100')}</TableCell>
                  <TableCell>{i18n.t('microfrontend.runtime_dashboard.k101')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align='center'
                      sx={{ py: 3, color: 'text.secondary' }}
                    >
                      {i18n.t('microfrontend.runtime_dashboard.k31')}
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt, idx) => (
                    <TableRow
                      key={idx}
                      hover
                    >
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {new Date(evt.timestamp).toLocaleTimeString('zh-CN')}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {evt.module_id}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={eventTypeLabels[evt.event_type] || evt.event_type}
                          sx={{ fontSize: 10 }}
                        />
                      </TableCell>
                      <TableCell
                        sx={{
                          fontSize: 11,
                          color: 'text.secondary',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {evt.data ? JSON.stringify(evt.data) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snack.type}
          onClose={() => setSnack({ ...snack, open: false })}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ==================== 通用统计卡片 ====================

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ fontSize: 11, mb: 0.5 }}
          >
            {label}
          </Typography>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, fontSize: 22 }}
          >
            {value}
          </Typography>
        </Box>
        <Box sx={{ color, display: 'flex' }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

export default RuntimeDashboard;
