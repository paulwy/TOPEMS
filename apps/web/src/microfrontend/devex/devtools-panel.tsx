import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Tooltip,
  Switch,
  FormControlLabel,
  Grid,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  X as XIcon,
  Search,
  RefreshCw,
  Play,
  Square,
  Download,
  Upload,
  Trash2,
  Layers,
  Network,
  Activity,
  Database,
  Bug,
  FileCode,
} from 'lucide-react';
import { V51Tabs, V51Card, V51Badge, V51Button } from '../../design-system';
import {
  smartDebugger,
  type ComponentTreeNode,
  type NetworkRequest,
  type DebugSession,
  type StateStoreInfo,
} from './smart-debugger';
import {
  performanceAnalyzer,
  type PerformanceReport,
  type CoreWebVital,
  type ModuleLoadMetric,
  type RenderMetric,
} from './performance-analyzer';
import { codeCompletion, type CompletionItem, type Snippet } from './code-completion';

export const V51DevExPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState('modules');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'rgba(0,0,0,0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1600,
          height: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#0d9488',
            color: 'white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bug size={20} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              V51.0 DevEx — 微前端开发体验
            </Typography>
            <V51Badge label='DevTools' variant='warning' size='sm' />
          </Box>
          <IconButton size='small' onClick={onClose} sx={{ color: 'white' }}>
            <XIcon size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <V51Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="fullWidth"
            tabs={[
              { id: 'modules', label: '模块检查', icon: <Layers size={16} />, content: <ModuleInspectorTab /> },
              { id: 'components', label: '组件树', icon: <FileCode size={16} />, content: <ComponentTreeTab /> },
              { id: 'performance', label: '性能监控', icon: <Activity size={16} />, content: <PerformanceMonitorTab /> },
              { id: 'network', label: '网络检查', icon: <Network size={16} />, content: <NetworkInspectorTab /> },
              { id: 'state', label: '状态浏览', icon: <Database size={16} />, content: <StateExplorerTab /> },
              { id: 'sessions', label: '调试会话', icon: <Bug size={16} />, content: <DebugSessionsTab /> },
            ]}
          />
        </Box>
      </Box>
    </Box>
  );
};

// ==================== Tab 1: Module Inspector ====================

const ModuleInspectorTab: React.FC = () => {
  const [modules, setModules] = React.useState(smartDebugger.getAllLoadedModules());
  const [graph, setGraph] = React.useState(smartDebugger.getModuleDependencyGraph());
  const [selectedModule, setSelectedModule] = React.useState<string | null>(null);

  const refresh = () => {
    setModules(smartDebugger.getAllLoadedModules());
    setGraph(smartDebugger.getModuleDependencyGraph());
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Layers size={20} /> 已加载模块 ({modules.length})
        </Typography>
        <Button size="small" startIcon={<RefreshCw size={16} />} onClick={refresh}>
          刷新
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <V51Card title="模块列表" subtitle="点击查看详情">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>版本</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>依赖</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {modules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          暂无已加载模块
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    modules.map((mod) => (
                      <TableRow
                        key={mod.id}
                        hover
                        onClick={() => setSelectedModule(mod.id)}
                        sx={{ cursor: 'pointer' }}
                        selected={selectedModule === mod.id}
                      >
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {mod.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{mod.name}</TableCell>
                        <TableCell>
                          <Chip label={mod.version} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mod.status}
                            size="small"
                            color={mod.status === 'active' ? 'success' : mod.status === 'error' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell>{mod.dependencies.length}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card title="依赖图" subtitle={`${graph.nodes.length} 节点 / ${graph.edges.length} 边`}>
            {selectedModule ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  模块: {selectedModule}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  依赖项:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {smartDebugger.getModuleDependencies(selectedModule).map((dep) => (
                    <Chip key={dep} label={dep} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择左侧模块查看依赖关系
              </Typography>
            )}
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== Tab 2: Component Tree ====================

const ComponentTreeTab: React.FC = () => {
  const [tree, setTree] = React.useState<ComponentTreeNode[]>([]);
  const [selected, setSelected] = React.useState<ComponentTreeNode | null>(null);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const inspect = () => {
    const result = smartDebugger.inspectComponentTree();
    setTree(result);
  };

  React.useEffect(() => {
    inspect();
  }, []);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: ComponentTreeNode, depth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);

    return (
      <Box key={node.id}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            py: 0.5,
            px: 1,
            borderRadius: 1,
            cursor: 'pointer',
            bgcolor: selected?.id === node.id ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
            ml: depth * 2,
          }}
          onClick={() => setSelected(node)}
        >
          {hasChildren ? (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}>
              {isExpanded ? '▼' : '▶'}
            </IconButton>
          ) : (
            <Box sx={{ width: 20 }} />
          )}
          <V51Badge
            label={node.type}
            variant={node.type === 'class' ? 'primary' : node.type === 'memo' ? 'secondary' : 'neutral'}
            size="sm"
          />
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {node.name}
          </Typography>
          {node.hooks.length > 0 && (
            <Chip label={`${node.hooks.length} hooks`} size="small" variant="outlined" />
          )}
        </Box>
        {hasChildren && isExpanded && (
          <Box>{node.children.map((child) => renderNode(child, depth + 1))}</Box>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileCode size={20} /> 组件树 ({tree.length})
        </Typography>
        <Button size="small" startIcon={<RefreshCw size={16} />} onClick={inspect}>
          重新扫描
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <V51Card title="组件层级" subtitle="点击节点查看详情">
            <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
              {tree.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  未检测到 React 组件
                </Typography>
              ) : (
                tree.map((node) => renderNode(node, 0))
              )}
            </Box>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card title="组件详情">
            {selected ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {selected.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Props:
                </Typography>
                <Paper sx={{ p: 1, mb: 1, maxHeight: 150, overflow: 'auto' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(selected.props, null, 2)}
                  </Typography>
                </Paper>
                <Typography variant="caption" color="text.secondary">
                  Hooks: {selected.hooks.join(', ') || 'none'}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择组件查看详情
              </Typography>
            )}
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== Tab 3: Performance Monitor ====================

const PerformanceMonitorTab: React.FC = () => {
  const [isTracking, setIsTracking] = React.useState(false);
  const [report, setReport] = React.useState<PerformanceReport | null>(null);
  const [reportTimer, setReportTimer] = React.useState<ReturnType<typeof setInterval> | null>(null);

  const startTracking = () => {
    performanceAnalyzer.startTracking();
    setIsTracking(true);
  };

  const stopTracking = () => {
    performanceAnalyzer.stopTracking();
    setIsTracking(false);
    if (reportTimer) {
      clearInterval(reportTimer);
      setReportTimer(null);
    }
  };

  const generateReport = () => {
    const r = performanceAnalyzer.generateReport();
    setReport(r);
  };

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isTracking) {
      interval = setInterval(generateReport, 2000);
      setReportTimer(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);

  const vitals = report?.coreWebVitals || [];

  const getVitalIcon = (name: string): string => {
    const icons: Record<string, string> = { LCP: '⏱', FID: '⚡', CLS: '📐', INP: '🎯', FCP: '🎨', TTFB: '🌐' };
    return icons[name] || '📊';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Activity size={20} /> 实时性能监控
        </Typography>
        <Stack direction="row" spacing={1}>
          {!isTracking ? (
            <Button variant="contained" size="small" startIcon={<Play size={16} />} onClick={startTracking}>
              开始追踪
            </Button>
          ) : (
            <Button variant="contained" size="small" color="error" startIcon={<Square size={16} />} onClick={stopTracking}>
              停止追踪
            </Button>
          )}
          <Button size="small" startIcon={<RefreshCw size={16} />} onClick={generateReport}>
            生成报告
          </Button>
        </Stack>
      </Box>

      {report && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: report.summary.overallScore >= 80 ? 'success.main' : 'warning.main' }}>
                  {report.summary.overallScore}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  综合得分
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {report.summary.passedChecks}/{report.summary.totalChecks}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  预算通过
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {report.moduleLoads.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  模块加载
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {report.renderMetrics.length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  渲染指标
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <V51Card title="Core Web Vitals" subtitle="核心性能指标">
            <Grid container spacing={2}>
              {vitals.map((vital) => (
                <Grid size={{ xs: 6, md: 4 }} key={vital.name}>
                  <Paper sx={{ p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6">{getVitalIcon(vital.name)}</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {vital.name}
                      </Typography>
                      <V51Badge
                        label={vital.rating}
                        variant={vital.rating === 'good' ? 'success' : vital.rating === 'needs-improvement' ? 'warning' : 'error'}
                        size="sm"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {vital.value.toFixed(2)} {vital.name === 'CLS' ? '' : 'ms'}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </V51Card>

          {report.recommendations.length > 0 && (
            <V51Card title="优化建议" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {report.recommendations.map((rec, idx) => (
                  <Paper key={idx} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{rec}</Typography>
                  </Paper>
                ))}
              </Box>
            </V51Card>
          )}
        </>
      )}

      {!report && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          点击"开始追踪"启动性能监控，然后点击"生成报告"查看详细分析
        </Typography>
      )}
    </Box>
  );
};

// ==================== Tab 4: Network Inspector ====================

const NetworkInspectorTab: React.FC = () => {
  const [isIntercepting, setIsIntercepting] = React.useState(false);
  const [requests, setRequests] = React.useState<NetworkRequest[]>([]);
  const [selected, setSelected] = React.useState<NetworkRequest | null>(null);
  const [filter, setFilter] = React.useState('');

  const start = () => {
    smartDebugger.startNetworkInterception();
    setIsIntercepting(true);
  };

  const stop = () => {
    smartDebugger.stopNetworkInterception();
    setIsIntercepting(false);
  };

  const clear = () => {
    smartDebugger.clearNetworkLog();
    setRequests([]);
  };

  React.useEffect(() => {
    if (!isIntercepting) return;
    const interval = setInterval(() => {
      setRequests(smartDebugger.getNetworkLog());
    }, 500);
    return () => clearInterval(interval);
  }, [isIntercepting]);

  React.useEffect(() => {
    if (!isIntercepting) {
      setRequests(smartDebugger.getNetworkLog());
    }
  }, [isIntercepting]);

  const filtered = requests.filter(
    (r) => !filter || r.url.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Network size={20} /> 请求追踪 ({filtered.length})
        </Typography>
        <Stack direction="row" spacing={1}>
          {!isIntercepting ? (
            <Button variant="contained" size="small" startIcon={<Play size={16} />} onClick={start}>
              开始拦截
            </Button>
          ) : (
            <Button variant="contained" size="small" color="error" startIcon={<Square size={16} />} onClick={stop}>
              停止拦截
            </Button>
          )}
          <Button size="small" startIcon={<Trash2 size={16} />} onClick={clear}>
            清空
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <V51Card title="请求列表">
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Search size={16} color="text.secondary" />
                <input
                  placeholder="过滤请求 URL..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 14,
                  }}
                />
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 450 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>方法</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>耗时</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>大小</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {isIntercepting ? '等待请求...' : '尚未开始拦截'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((req) => (
                      <TableRow
                        key={req.id}
                        hover
                        selected={selected?.id === req.id}
                        onClick={() => setSelected(req)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Chip
                            label={req.method}
                            size="small"
                            color={req.method === 'GET' ? 'success' : req.method === 'POST' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace',
                            fontSize: 12,
                          }}
                        >
                          {req.url}
                        </TableCell>
                        <TableCell>
                          {req.status ? (
                            <Chip
                              label={req.status}
                              size="small"
                              color={req.status < 300 ? 'success' : req.status < 400 ? 'warning' : 'error'}
                            />
                          ) : (
                            <Chip label="..." size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {req.duration ? `${req.duration.toFixed(0)}ms` : '-'}
                        </TableCell>
                        <TableCell>
                          {req.responseSize ? `${(req.responseSize / 1024).toFixed(1)}KB` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <V51Card title="请求详情">
            {selected ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontFamily: 'monospace', fontSize: 12, mb: 1, wordBreak: 'break-all' }}>
                  {selected.url}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="text.secondary">Headers:</Typography>
                <Paper sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(selected.headers, null, 2) || '{}'}
                  </Typography>
                </Paper>
                {selected.body ? (
                  <>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>Body:</Typography>
                    <Paper sx={{ p: 1, maxHeight: 100, overflow: 'auto' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {typeof selected.body === 'string' ? selected.body : JSON.stringify(selected.body)}
                      </Typography>
                    </Paper>
                  </>
                ) : null}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择请求查看详情
              </Typography>
            )}
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== Tab 5: State Explorer ====================

const StateExplorerTab: React.FC = () => {
  const [stores, setStores] = React.useState<StateStoreInfo[]>([]);
  const [selected, setSelected] = React.useState<StateStoreInfo | null>(null);

  const inspect = () => {
    const all = smartDebugger.getAllStateStores();
    const redux = smartDebugger.inspectReduxState();
    const zustand = smartDebugger.inspectZustandStores();
    const allStores = [...all, ...zustand];
    if (redux) allStores.push(redux);
    setStores(allStores);
  };

  React.useEffect(() => {
    inspect();
  }, []);

  const exportState = () => {
    if (!selected) return;
    const json = JSON.stringify(selected.state, null, 2);
    navigator.clipboard?.writeText(json);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Database size={20} /> 全局状态 ({stores.length})
        </Typography>
        <Button size="small" startIcon={<RefreshCw size={16} />} onClick={inspect}>
          刷新
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card title="状态存储列表">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>订阅数</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stores.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="text.secondary">
                          未检测到状态存储
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    stores.map((store) => (
                      <TableRow
                        key={store.name}
                        hover
                        selected={selected?.name === store.name}
                        onClick={() => setSelected(store)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{store.name}</TableCell>
                        <TableCell>
                          <Chip label={store.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{store.subscriberCount}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card
            title="状态详情"
            headerAction={
              selected ? (
                <IconButton size="small" onClick={exportState} title="复制到剪贴板">
                  <Download size={16} />
                </IconButton>
              ) : null
            }
          >
            {selected ? (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {selected.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Selectors: {selected.selectors.length} | Actions: {selected.actions.length}
                </Typography>
                <Paper sx={{ p: 1.5, mt: 1, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {JSON.stringify(selected.state, null, 2)}
                  </Typography>
                </Paper>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择状态存储查看详情
              </Typography>
            )}
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==================== Tab 6: Debug Sessions ====================

const DebugSessionsTab: React.FC = () => {
  const [sessions, setSessions] = React.useState<DebugSession[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [selected, setSelected] = React.useState<DebugSession | null>(null);
  const [newSessionName, setNewSessionName] = React.useState('');

  const refresh = () => {
    setSessions(smartDebugger.getSessions());
  };

  const startRecording = () => {
    const name = newSessionName || `Session ${new Date().toLocaleTimeString()}`;
    smartDebugger.startSession(name);
    setIsRecording(true);
    setNewSessionName('');
    refresh();
  };

  const stopRecording = () => {
    smartDebugger.stopSession();
    setIsRecording(false);
    refresh();
  };

  const replay = (id: string) => {
    smartDebugger.replaySession(id);
  };

  const exportSession = (id: string) => {
    const data = smartDebugger.exportSession(id);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-session-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSession = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const json = e.target?.result as string;
      smartDebugger.importSession(json);
      refresh();
    };
    reader.readAsText(file);
  };

  const deleteSession = (id: string) => {
    smartDebugger.deleteSession(id);
    if (selected?.id === id) setSelected(null);
    refresh();
  };

  React.useEffect(() => {
    refresh();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Bug size={20} /> 调试会话 ({sessions.length})
          {isRecording && <V51Badge label="录制中" variant="error" size="sm" />}
        </Typography>
        <Stack direction="row" spacing={1}>
          {!isRecording ? (
            <>
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                id="session-import"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importSession(file);
                  e.target.value = '';
                }}
              />
              <Button
                size="small"
                startIcon={<Upload size={16} />}
                onClick={() => document.getElementById('session-import')?.click()}
              >
                导入
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <input
                  placeholder="会话名称"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  style={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    padding: '4px 8px',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <Button variant="contained" size="small" startIcon={<Play size={16} />} onClick={startRecording}>
                  开始录制
                </Button>
              </Box>
            </>
          ) : (
            <Button variant="contained" size="small" color="error" startIcon={<Square size={16} />} onClick={stopRecording}>
              停止录制
            </Button>
          )}
        </Stack>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card title="会话列表">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>步骤</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>时长</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography variant="body2" color="text.secondary">
                          暂无会话记录
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow
                        key={session.id}
                        hover
                        selected={selected?.id === session.id}
                        onClick={() => setSelected(session)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{session.name}</TableCell>
                        <TableCell>{session.steps.length}</TableCell>
                        <TableCell>{(session.duration / 1000).toFixed(1)}s</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); replay(session.id); }}
                              title="回放"
                            >
                              <Play size={14} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); exportSession(session.id); }}
                              title="导出"
                            >
                              <Download size={14} />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </V51Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <V51Card title="会话详情">
            {selected ? (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  {selected.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  创建: {new Date(selected.createdAt).toLocaleString()}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  URL: {selected.metadata.url}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  步骤数: {selected.steps.length}
                </Typography>
                <Paper sx={{ p: 1, maxHeight: 350, overflow: 'auto', bgcolor: 'grey.50' }}>
                  {selected.steps.map((step, idx) => (
                    <Box
                      key={step.id}
                      sx={{
                        py: 0.5,
                        borderBottom: idx < selected.steps.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        [{new Date(step.timestamp).toLocaleTimeString()}]
                      </Typography>
                      <Chip
                        label={step.type}
                        size="small"
                        color={step.type === 'error' ? 'error' : step.type === 'network' ? 'primary' : 'default'}
                        sx={{ ml: 1, fontSize: 10 }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {JSON.stringify(step.data).substring(0, 80)}
                      </Typography>
                    </Box>
                  ))}
                </Paper>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                选择会话查看详情
              </Typography>
            )}
          </V51Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const Divider: React.FC<{ sx?: Record<string, unknown> }> = ({ sx }) => (
  <Box
    sx={{
      height: 1,
      bgcolor: 'divider',
      ...sx,
    }}
  />
);