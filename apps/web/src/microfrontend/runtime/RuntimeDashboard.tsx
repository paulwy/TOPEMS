import { designTokens, semanticTokens } from '@topems/tokens';
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
  [ModuleLoadStatus.UNLOADED]: '#64748b',
  [ModuleLoadStatus.LOADING]: designTokens.colors.warning.main,
  [ModuleLoadStatus.LOADED]: designTokens.colors.success.dark,
  [ModuleLoadStatus.FAILED]: designTokens.colors.error.main,
};

const statusLabels: Record<ModuleLoadStatus, string> = {
  [ModuleLoadStatus.UNLOADED]: '未加载',
  [ModuleLoadStatus.LOADING]: '加载中',
  [ModuleLoadStatus.LOADED]: '已加载',
  [ModuleLoadStatus.FAILED]: '失败',
};

const lifecycleStateColors: Record<LifecycleState, string> = {
  [LifecycleState.REGISTERED]: '#64748b',
  [LifecycleState.PRELOADING]: designTokens.colors.warning.main,
  [LifecycleState.LOADED]: designTokens.colors.primary.main,
  [LifecycleState.MOUNTING]: designTokens.colors.secondary.main,
  [LifecycleState.MOUNTED]: designTokens.colors.success.dark,
  [LifecycleState.UPDATING]: '#06b6d4',
  [LifecycleState.ERROR]: designTokens.colors.error.main,
  [LifecycleState.UNMOUNTING]: '#f97316',
  [LifecycleState.UNMOUNTED]: '#94a3b8',
};

const lifecycleStateLabels: Record<LifecycleState, string> = {
  [LifecycleState.REGISTERED]: '已注册',
  [LifecycleState.PRELOADING]: '预加载中',
  [LifecycleState.LOADED]: '已加载',
  [LifecycleState.MOUNTING]: '挂载中',
  [LifecycleState.MOUNTED]: '已挂载',
  [LifecycleState.UPDATING]: '更新中',
  [LifecycleState.ERROR]: '错误',
  [LifecycleState.UNMOUNTING]: '卸载中',
  [LifecycleState.UNMOUNTED]: '已卸载',
};

const frameworkColors: Record<FrameworkType, string> = {
  [FrameworkType.REACT]: '#61dafb',
  [FrameworkType.VUE]: '#42b883',
  [FrameworkType.ANGULAR]: '#dd0031',
  [FrameworkType.SVELTE]: '#ff3e00',
  [FrameworkType.VANILLA]: '#64748b',
};

const frameworkLabels: Record<FrameworkType, string> = {
  [FrameworkType.REACT]: 'React',
  [FrameworkType.VUE]: 'Vue',
  [FrameworkType.ANGULAR]: 'Angular',
  [FrameworkType.SVELTE]: 'Svelte',
  [FrameworkType.VANILLA]: 'Vanilla',
};

const tokenTypeLabels: Record<TokenType, string> = {
  [TokenType.COLOR]: '颜色',
  [TokenType.TYPOGRAPHY]: '排版',
  [TokenType.SPACING]: '间距',
  [TokenType.BORDER]: '边框',
  [TokenType.SHADOW]: '阴影',
  [TokenType.ANIMATION]: '动画',
  [TokenType.ZINDEX]: '层级',
  [TokenType.BREAKPOINT]: '断点',
};

const eventTypeLabels: Record<LifecycleEventType, string> = {
  [LifecycleEventType.REGISTERED]: '注册',
  [LifecycleEventType.PRELOADSTART]: '预加载开始',
  [LifecycleEventType.PRELOADEND]: '预加载完成',
  [LifecycleEventType.LOADSTART]: '加载开始',
  [LifecycleEventType.LOADEND]: '加载完成',
  [LifecycleEventType.MOUNTSTART]: '挂载开始',
  [LifecycleEventType.MOUNTEND]: '挂载完成',
  [LifecycleEventType.UPDATESTART]: '更新开始',
  [LifecycleEventType.UPDATEEND]: '更新完成',
  [LifecycleEventType.UNMOUNTSTART]: '卸载开始',
  [LifecycleEventType.UNMOUNTEND]: '卸载完成',
  [LifecycleEventType.ERROR]: '错误',
  [LifecycleEventType.DESTROYED]: '销毁',
  [LifecycleEventType.STATECHANGE]: '状态变更',
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
            V45.0 运行时控制台 — 微前端终极形态
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
          label='动态加载'
          value='loader'
        />
        <Tab
          icon={<LayersIcon size={16} />}
          iconPosition='start'
          label='跨框架'
          value='framework'
        />
        <Tab
          icon={<PaletteIcon size={16} />}
          iconPosition='start'
          label='设计系统'
          value='design'
        />
        <Tab
          icon={<ActivityIcon size={16} />}
          iconPosition='start'
          label='生命周期'
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
      setSnack({ open: true, msg: `模块 ${id} 加载成功`, type: 'success' });
      refresh();
    } catch (err) {
      setSnack({ open: true, msg: `加载失败: ${(err as Error).message}`, type: 'error' });
    }
  };

  const handleUnload = (id: string) => {
    dynamicLoader.unloadModule(id);
    setSnack({ open: true, msg: `模块 ${id} 已卸载`, type: 'success' });
    refresh();
  };

  const handleReload = async (id: string) => {
    try {
      await dynamicLoader.reloadModule(id);
      setSnack({ open: true, msg: `模块 ${id} 重载成功`, type: 'success' });
      refresh();
    } catch (err) {
      setSnack({ open: true, msg: `重载失败: ${(err as Error).message}`, type: 'error' });
    }
  };

  const handlePreload = async (id: string) => {
    await dynamicLoader.preloadModule(id);
    setSnack({ open: true, msg: `模块 ${id} 预加载完成`, type: 'success' });
    refresh();
  };

  const handleRegister = async () => {
    if (!newModuleId.trim()) {
      setSnack({ open: true, msg: '请输入模块 ID', type: 'error' });
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
      setSnack({ open: true, msg: `模块 ${newModuleId} 注册成功`, type: 'success' });
      setNewModuleId('');
      setNewModuleUrl('');
      refresh();
    } catch (err) {
      setSnack({ open: true, msg: `注册失败: ${(err as Error).message}`, type: 'error' });
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
            label='已注册模块'
            value={modules.length}
            icon={<PackageIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='已加载'
            value={loadedCount}
            icon={<CheckCircleIcon size={20} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='加载失败'
            value={failedCount}
            icon={<XCircleIcon size={20} />}
            color={designTokens.colors.error.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='并发/等待'
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
            注册新模块
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size='small'
              label='模块 ID'
              value={newModuleId}
              onChange={(e) => setNewModuleId(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size='small'
              label='远程 URL（可选）'
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
              注册
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<RefreshIcon size={16} />}
              onClick={() => dynamicLoader.clearCache()}
            >
              清空缓存
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
              模块列表
            </Typography>
            <Button
              size='small'
              startIcon={<RefreshIcon size={14} />}
              onClick={refresh}
            >
              刷新
            </Button>
          </Box>
          {modules.length === 0 ? (
            <Typography
              color='text.secondary'
              sx={{ py: 3, textAlign: 'center' }}
            >
              暂无已注册模块
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
                    <TableCell>名称</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>耗时</TableCell>
                    <TableCell>重试</TableCell>
                    <TableCell>错误</TableCell>
                    <TableCell align='right'>操作</TableCell>
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
                            <Tooltip title='加载'>
                              <IconButton
                                size='small'
                                onClick={() => handleLoad(mod.id)}
                              >
                                <DownloadIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {mod.status === ModuleLoadStatus.LOADED && (
                            <Tooltip title='预加载'>
                              <IconButton
                                size='small'
                                onClick={() => handlePreload(mod.id)}
                              >
                                <UploadIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {mod.status === ModuleLoadStatus.LOADED && (
                            <Tooltip title='卸载'>
                              <IconButton
                                size='small'
                                onClick={() => handleUnload(mod.id)}
                              >
                                <TrashIcon size={16} />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title='重载'>
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
  const [propsInput, setPropsInput] = useState('{\n  "title": "测试组件",\n  "count": 42\n}');
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
      setSnack({ open: true, msg: 'Props JSON 格式错误', type: 'error' });
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
            msg: `${frameworkLabels[selectedFramework]} 事件触发`,
            type: 'success',
          }),
      });
      setSnack({
        open: true,
        msg: `${frameworkLabels[selectedFramework]} 组件已挂载`,
        type: 'success',
      });
      refresh();
    } catch (err) {
      setSnack({ open: true, msg: `挂载失败: ${(err as Error).message}`, type: 'error' });
    }
  };

  const handleUnmount = (id: string) => {
    crossFrameworkBridge.unmountComponent(id);
    setSnack({ open: true, msg: `组件 ${id} 已卸载`, type: 'success' });
    refresh();
  };

  const handleUnmountAll = () => {
    crossFrameworkBridge.unmountAll();
    setSnack({ open: true, msg: '所有组件已卸载', type: 'success' });
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
            label='已挂载组件'
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
            color='#61dafb'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='Vue'
            value={mountedComponents.filter((c) => c.framework === FrameworkType.VUE).length}
            icon={<CodeIcon size={20} />}
            color='#42b883'
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
            color='#dd0031'
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
            跨框架组件挂载测试
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <FormControl
              size='small'
              sx={{ minWidth: 150 }}
            >
              <InputLabel>框架类型</InputLabel>
              <Select
                value={selectedFramework}
                label='框架类型'
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
              挂载组件
            </Button>
            <Button
              variant='outlined'
              size='small'
              startIcon={<TrashIcon size={16} />}
              onClick={handleUnmountAll}
            >
              全部卸载
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
              ↓ 组件将挂载到此处 ↓
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
            已挂载组件列表
          </Typography>
          {mountedComponents.length === 0 ? (
            <Typography
              color='text.secondary'
              sx={{ py: 3, textAlign: 'center' }}
            >
              暂无已挂载组件
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
                    <TableCell>框架</TableCell>
                    <TableCell>属性数</TableCell>
                    <TableCell>挂载时间</TableCell>
                    <TableCell align='right'>操作</TableCell>
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
                        <Tooltip title='卸载'>
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
      msg: `已切换到${theme.mode === 'dark' ? '亮色' : '暗色'}主题`,
      type: 'success',
    });
    refresh();
  };

  const handleSync = () => {
    designSystemManager.syncToFramework();
    setSnack({ open: true, msg: '已同步到所有框架', type: 'success' });
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
            label='设计令牌总数'
            value={tokens.length}
            icon={<PaletteIcon size={20} />}
            color='#7c3aed'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='CSS 变量数'
            value={cssVars.length}
            icon={<CodeIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='当前主题'
            value={theme.mode === 'dark' ? '暗色' : '亮色'}
            icon={theme.mode === 'dark' ? <MoonIcon size={20} /> : <SunIcon size={20} />}
            color={theme.mode === 'dark' ? '#1e293b' : designTokens.colors.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='组件覆盖'
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
              主题控制
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={theme.mode === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
                onClick={handleThemeToggle}
              >
                {theme.mode === 'dark' ? '切换亮色' : '切换暗色'}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<ZapIcon size={16} />}
                onClick={handleSync}
              >
                同步到所有框架
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
                  主文字 (Primary Text)
                </Typography>
                <Typography sx={{ color: theme.text_colors.secondary, fontSize: 13 }}>
                  次文字 (Secondary Text)
                </Typography>
                <Typography sx={{ color: theme.text_colors.disabled, fontSize: 12 }}>
                  禁用文字 (Disabled Text)
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    size='small'
                    label='主色'
                    sx={{ bgcolor: theme.primary_color, color: 'common.white' }}
                  />
                  <Chip
                    size='small'
                    label='辅色'
                    sx={{ bgcolor: theme.secondary_color, color: 'common.white' }}
                  />
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                CSS 变量同步状态
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
                跨框架同步: CustomEvent + CSS Variables + SharedState
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
              设计令牌 ({filteredTokens.length})
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
                    {cat === 'all' ? '全部分类' : cat}
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
                  <TableCell>名称</TableCell>
                  <TableCell>分类</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>值</TableCell>
                  <TableCell>预览</TableCell>
                  <TableCell>CSS 变量</TableCell>
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
            CSS 变量预览 ({cssVars.length})
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
      setSnack({ open: true, msg: '请输入模块 ID', type: 'error' });
      return;
    }
    lifecycleManager.register(newModuleId.trim(), {
      name: newModuleName.trim() || newModuleId.trim(),
    });
    setSnack({ open: true, msg: `模块 ${newModuleId} 已注册`, type: 'success' });
    setNewModuleId('');
    setNewModuleName('');
    refresh();
  };

  const handlePreload = (id: string) => {
    if (lifecycleManager.preload(id)) {
      setSnack({ open: true, msg: `模块 ${id} 预加载完成`, type: 'success' });
    } else {
      setSnack({ open: true, msg: `预加载失败（状态不允许）`, type: 'error' });
    }
    refresh();
  };

  const handleMount = (id: string) => {
    const el = document.createElement('div');
    el.id = `lifecycle-mount-${id}`;
    if (lifecycleManager.mount(id, el, { timestamp: Date.now() })) {
      setSnack({ open: true, msg: `模块 ${id} 已挂载`, type: 'success' });
    } else {
      setSnack({ open: true, msg: `挂载失败（状态不允许）`, type: 'error' });
    }
    refresh();
  };

  const handleUnmount = (id: string) => {
    if (lifecycleManager.unmount(id)) {
      setSnack({ open: true, msg: `模块 ${id} 已卸载`, type: 'success' });
    } else {
      setSnack({ open: true, msg: `卸载失败（状态不允许）`, type: 'error' });
    }
    refresh();
  };

  const handleDestroy = (id: string) => {
    if (lifecycleManager.destroy(id)) {
      setSnack({ open: true, msg: `模块 ${id} 已销毁`, type: 'success' });
    } else {
      setSnack({ open: true, msg: `销毁失败`, type: 'error' });
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
            label='模块总数'
            value={records.length}
            icon={<ActivityIcon size={20} />}
            color={designTokens.colors.secondary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='已挂载'
            value={records.filter((r) => r.state === LifecycleState.MOUNTED).length}
            icon={<CheckCircleIcon size={20} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='事件总数'
            value={lifecycleManager.eventCount}
            icon={<ClockIcon size={20} />}
            color={designTokens.colors.primary.main}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='错误状态'
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
            注册模块到生命周期管理器
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              size='small'
              label='模块 ID'
              value={newModuleId}
              onChange={(e) => setNewModuleId(e.target.value)}
              sx={{ minWidth: 150 }}
            />
            <TextField
              size='small'
              label='模块名称（可选）'
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
              注册
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
            生命周期状态转换图
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
                  <span style={{ color: 'text.disabled', margin: '0 4px' }}>|</span>
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
                  模块状态列表
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon size={14} />}
                  onClick={refresh}
                >
                  刷新
                </Button>
              </Box>
              {records.length === 0 ? (
                <Typography
                  color='text.secondary'
                  sx={{ py: 3, textAlign: 'center' }}
                >
                  暂无模块
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
                        <TableCell>名称</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell align='right'>操作</TableCell>
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
                              <Tooltip title='预加载'>
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
                              <Tooltip title='挂载'>
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
                              <Tooltip title='卸载'>
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
                              <Tooltip title='销毁'>
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
                {selectedRecord ? `模块 ${selectedRecord.id} 状态历史` : '选择模块查看历史'}
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
            生命周期事件时间线（最近 {events.length} 条）
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
                  <TableCell>时间</TableCell>
                  <TableCell>模块</TableCell>
                  <TableCell>事件</TableCell>
                  <TableCell>数据</TableCell>
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
                      暂无事件
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
