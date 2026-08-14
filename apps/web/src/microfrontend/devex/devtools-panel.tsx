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
  Grid,
  Stack,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardContent,
} from '@mui/material';
import i18n from '@/i18n';
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
import {
  smartDebugger,
  type ComponentTreeNode,
  type NetworkRequest,
  type DebugSession,
  type StateStoreInfo,
} from './smart-debugger';
import { performanceAnalyzer, type PerformanceReport } from './performance-analyzer';
import { codeCompletion, type CompletionItem, type Snippet } from './code-completion';
import { designTokens, semanticTokens } from '@topems/tokens';

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
        bgcolor: 'action.active',
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
          boxShadow: designTokens.darkShadows.xl,
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
            bgcolor: 'teal.600',
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Bug size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('microfrontend.devtools-panel.k0')}
            </Typography>
            <Chip
              label='DevTools'
              color='warning'
              size='small'
            />
          </Box>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Tabs
            value={activeTab}
            onChange={(_, id) => setActiveTab(id)}
            variant='fullWidth'
          >
            <Tab
              value='modules'
              label={i18n.t('microfrontend.devtools-panel.k0')}
              icon={<Layers size={16} />}
              iconPosition='start'
            />
            <Tab
              value='components'
              label={i18n.t('microfrontend.devtools-panel.k1')}
              icon={<FileCode size={16} />}
              iconPosition='start'
            />
            <Tab
              value='performance'
              label={i18n.t('microfrontend.devtools-panel.k2')}
              icon={<Activity size={16} />}
              iconPosition='start'
            />
            <Tab
              value='network'
              label={i18n.t('microfrontend.devtools-panel.k3')}
              icon={<Network size={16} />}
              iconPosition='start'
            />
            <Tab
              value='state'
              label={i18n.t('microfrontend.devtools-panel.k4')}
              icon={<Database size={16} />}
              iconPosition='start'
            />
            <Tab
              value='sessions'
              label={i18n.t('microfrontend.devtools-panel.k5')}
              icon={<Bug size={16} />}
              iconPosition='start'
            />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'modules' && <ModuleInspectorTab />}
            {activeTab === 'components' && <ComponentTreeTab />}
            {activeTab === 'performance' && <PerformanceMonitorTab />}
            {activeTab === 'network' && <NetworkInspectorTab />}
            {activeTab === 'state' && <StateExplorerTab />}
            {activeTab === 'sessions' && <DebugSessionsTab />}
          </Box>
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Layers size={20} /> 已加载模块 ({modules.length})
        </Typography>
        <Button
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={refresh}
        >
          {i18n.t('microfrontend.devtools-panel.k1')}
        </Button>
      </Box>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader
              title={i18n.t('microfrontend.devtools-panel.k6')}
              subheader={i18n.t('microfrontend.devtools-panel.k7')}
            />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k8')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k9')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k10')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k11')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modules.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align='center'
                          sx={{ py: 4 }}
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('microfrontend.devtools-panel.k2')}
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
                            <Typography
                              variant='caption'
                              sx={{ fontFamily: 'monospace' }}
                            >
                              {mod.id}
                            </Typography>
                          </TableCell>
                          <TableCell>{mod.name}</TableCell>
                          <TableCell>
                            <Chip
                              label={mod.version}
                              size='small'
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={mod.status}
                              size='small'
                              color={
                                mod.status === 'active'
                                  ? 'success'
                                  : mod.status === 'error'
                                    ? 'error'
                                    : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>{mod.dependencies.length}</TableCell>
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
              title={i18n.t('microfrontend.devtools-panel.k12')}
              subheader={`${graph.nodes.length} ${i18n.t('microfrontend.devtools-panel.k3')} ${graph.edges.length} ${i18n.t('microfrontend.devtools-panel.k4')}`}
            />
            <CardContent>
              {selectedModule ? (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    [i18n.t('microfrontend.devtools-panel.k5')]: {selectedModule}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1, display: 'block' }}
                  >
                    [i18n.t('microfrontend.devtools-panel.k6')]:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {smartDebugger.getModuleDependencies(selectedModule).map((dep) => (
                      <Chip
                        key={dep}
                        label={dep}
                        size='small'
                        variant='outlined'
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k7')}
                </Typography>
              )}
            </CardContent>
          </Card>
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
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </IconButton>
          ) : (
            <Box sx={{ width: 20 }} />
          )}
          <Chip
            label={node.type}
            color={
              node.type === 'class' ? 'primary' : node.type === 'memo' ? 'secondary' : 'default'
            }
            size='small'
          />
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace' }}
          >
            {node.name}
          </Typography>
          {node.hooks.length > 0 && (
            <Chip
              label={`${node.hooks.length} hooks`}
              size='small'
              variant='outlined'
            />
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FileCode size={20} /> 组件树 ({tree.length})
        </Typography>
        <Button
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={inspect}
        >
          {i18n.t('microfrontend.devtools-panel.k8')}
        </Button>
      </Box>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader
              title={i18n.t('microfrontend.devtools-panel.k13')}
              subheader={i18n.t('microfrontend.devtools-panel.k14')}
            />
            <CardContent>
              <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                {tree.length === 0 ? (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {i18n.t('microfrontend.devtools-panel.react_9')}
                  </Typography>
                ) : (
                  tree.map((node) => renderNode(node, 0))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k15')} />
            <CardContent>
              {selected ? (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {selected.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Props:
                  </Typography>
                  <Paper sx={{ p: 1, mb: 1, maxHeight: 150, overflow: 'auto' }}>
                    <Typography
                      variant='caption'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(selected.props, null, 2)}
                    </Typography>
                  </Paper>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Hooks: {selected.hooks.join(', ') || 'none'}
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k10')}
                </Typography>
              )}
            </CardContent>
          </Card>
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
    const icons: Record<string, string> = {
      LCP: '⏱',
      FID: '⚡',
      CLS: '📐',
      INP: '🎯',
      FCP: '🎨',
      TTFB: '🌐',
    };
    return icons[name] || '📊';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Activity size={20} /> 实时性能监控
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          {!isTracking ? (
            <Button
              variant='contained'
              size='small'
              startIcon={<Play size={16} />}
              onClick={startTracking}
            >
              {i18n.t('microfrontend.devtools-panel.k11')}
            </Button>
          ) : (
            <Button
              variant='contained'
              size='small'
              color='error'
              startIcon={<Square size={16} />}
              onClick={stopTracking}
            >
              {i18n.t('microfrontend.devtools-panel.k12')}
            </Button>
          )}
          <Button
            size='small'
            startIcon={<RefreshCw size={16} />}
            onClick={generateReport}
          >
            {i18n.t('microfrontend.devtools-panel.k13')}
          </Button>
        </Stack>
      </Box>

      {report && (
        <>
          <Grid
            container
            spacing={2}
            sx={{ mb: 2 }}
          >
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{
                    fontWeight: 700,
                    color: report.summary.overallScore >= 80 ? 'success.main' : 'warning.main',
                  }}
                >
                  {report.summary.overallScore}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k14')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {report.summary.passedChecks}/{report.summary.totalChecks}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k15')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {report.moduleLoads.length}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k16')}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {report.renderMetrics.length}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k17')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Card variant='outlined'>
            <CardHeader
              title='Core Web Vitals'
              subheader={i18n.t('microfrontend.devtools-panel.k16')}
            />
            <CardContent>
              <Grid
                container
                spacing={2}
              >
                {vitals.map((vital) => (
                  <Grid
                    size={{ xs: 6, md: 4 }}
                    key={vital.name}
                  >
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant='h6'>{getVitalIcon(vital.name)}</Typography>
                        <Typography
                          variant='subtitle2'
                          sx={{ fontWeight: 600 }}
                        >
                          {vital.name}
                        </Typography>
                        <Chip
                          label={vital.rating}
                          color={
                            vital.rating === 'good'
                              ? 'success'
                              : vital.rating === 'needs-improvement'
                                ? 'warning'
                                : 'error'
                          }
                          size='small'
                        />
                      </Box>
                      <Typography
                        variant='body2'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {vital.value.toFixed(2)} {vital.name === 'CLS' ? '' : 'ms'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          {report.recommendations.length > 0 && (
            <Card
              variant='outlined'
              sx={{ mt: 2 }}
            >
              <CardHeader title={i18n.t('microfrontend.devtools-panel.k17')} />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {report.recommendations.map((rec, idx) => (
                    <Paper
                      key={idx}
                      sx={{ p: 1.5, borderRadius: 1, bgcolor: 'grey.50' }}
                    >
                      <Typography variant='body2'>{rec}</Typography>
                    </Paper>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!report && (
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ textAlign: 'center', py: 4 }}
        >
          {i18n.t('microfrontend.devtools-panel.i18n_18')}.t('microfrontend.devtools-panel.k19')启动性能监控，然后点击i18n.t('microfrontend.devtools-panel.k18')查看详细分析
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Network size={20} /> 请求追踪 ({filtered.length})
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          {!isIntercepting ? (
            <Button
              variant='contained'
              size='small'
              startIcon={<Play size={16} />}
              onClick={start}
            >
              {i18n.t('microfrontend.devtools-panel.k21')}
            </Button>
          ) : (
            <Button
              variant='contained'
              size='small'
              color='error'
              startIcon={<Square size={16} />}
              onClick={stop}
            >
              {i18n.t('microfrontend.devtools-panel.k22')}
            </Button>
          )}
          <Button
            size='small'
            startIcon={<Trash2 size={16} />}
            onClick={clear}
          >
            {i18n.t('microfrontend.devtools-panel.k23')}
          </Button>
        </Stack>
      </Box>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k20')} />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Search
                    size={16}
                    color='text.secondary'
                  />
                  <input
                    placeholder={i18n.t('microfrontend.devtools-panel.url_24')}
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
                <Table
                  size='small'
                  stickyHeader
                >
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k21')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>URL</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k22')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k23')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k24')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align='center'
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {isIntercepting ? i18n.t('microfrontend.devtools-panel.k25') : i18n.t('microfrontend.devtools-panel.k25')}
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
                              size='small'
                              color={
                                req.method === 'GET'
                                  ? 'success'
                                  : req.method === 'POST'
                                    ? 'primary'
                                    : 'default'
                              }
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
                                size='small'
                                color={
                                  req.status < 300
                                    ? 'success'
                                    : req.status < 400
                                      ? 'warning'
                                      : 'error'
                                }
                              />
                            ) : (
                              <Chip
                                label='...'
                                size='small'
                              />
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
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k26')} />
            <CardContent>
              {selected ? (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontFamily: 'monospace', fontSize: 12, mb: 1, wordBreak: 'break-all' }}
                  >
                    {selected.url}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Headers:
                  </Typography>
                  <Paper sx={{ p: 1, maxHeight: 200, overflow: 'auto' }}>
                    <Typography
                      variant='caption'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(selected.headers, null, 2) || '{}'}
                    </Typography>
                  </Paper>
                  {selected.body ? (
                    <>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ mt: 1, display: 'block' }}
                      >
                        Body:
                      </Typography>
                      <Paper sx={{ p: 1, maxHeight: 100, overflow: 'auto' }}>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {typeof selected.body === 'string'
                            ? selected.body
                            : JSON.stringify(selected.body)}
                        </Typography>
                      </Paper>
                    </>
                  ) : null}
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k26')}
                </Typography>
              )}
            </CardContent>
          </Card>
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Database size={20} /> 全局状态 ({stores.length})
        </Typography>
        <Button
          size='small'
          startIcon={<RefreshCw size={16} />}
          onClick={inspect}
        >
          {i18n.t('microfrontend.devtools-panel.k27')}
        </Button>
      </Box>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k27')} />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k28')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k29')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k30')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stores.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          align='center'
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('microfrontend.devtools-panel.k28')}
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
                            <Chip
                              label={store.type}
                              size='small'
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>{store.subscriberCount}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader
              title={i18n.t('microfrontend.devtools-panel.k31')}
              action={
                selected ? (
                  <IconButton
                    size='small'
                    onClick={exportState}
                    title={i18n.t('microfrontend.devtools-panel.k32')}
                  >
                    <Download size={16} />
                  </IconButton>
                ) : null
              }
            />
            <CardContent>
              {selected ? (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    {selected.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    Selectors: {selected.selectors.length} | Actions: {selected.actions.length}
                  </Typography>
                  <Paper
                    sx={{ p: 1.5, mt: 1, maxHeight: 400, overflow: 'auto', bgcolor: 'grey.50' }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {JSON.stringify(selected.state, null, 2)}
                    </Typography>
                  </Paper>
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k29')}
                </Typography>
              )}
            </CardContent>
          </Card>
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Bug size={20} /> 调试会话 ({sessions.length})
          {isRecording && (
            <Chip
              label={i18n.t('microfrontend.devtools-panel.k33')}
              color='error'
              size='small'
            />
          )}
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          {!isRecording ? (
            <>
              <input
                type='file'
                accept='.json'
                style={{ display: 'none' }}
                id='session-import'
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importSession(file);
                  e.target.value = '';
                }}
              />
              <Button
                size='small'
                startIcon={<Upload size={16} />}
                onClick={() => document.getElementById('session-import')?.click()}
              >
                {i18n.t('microfrontend.devtools-panel.k30')}
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <input
                  placeholder={i18n.t('microfrontend.devtools-panel.k34')}
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
                <Button
                  variant='contained'
                  size='small'
                  startIcon={<Play size={16} />}
                  onClick={startRecording}
                >
                  {i18n.t('microfrontend.devtools-panel.k31')}
                </Button>
              </Box>
            </>
          ) : (
            <Button
              variant='contained'
              size='small'
              color='error'
              startIcon={<Square size={16} />}
              onClick={stopRecording}
            >
              {i18n.t('microfrontend.devtools-panel.k32')}
            </Button>
          )}
        </Stack>
      </Box>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k35')} />
            <CardContent>
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k36')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k37')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k38')}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i18n.t('microfrontend.devtools-panel.k39')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sessions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align='center'
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('microfrontend.devtools-panel.k33')}
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
                            <Stack
                              direction='row'
                              spacing={0.5}
                            >
                              <IconButton
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  replay(session.id);
                                }}
                                title={i18n.t('microfrontend.devtools-panel.k40')}
                              >
                                <Play size={14} />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  exportSession(session.id);
                                }}
                                title={i18n.t('microfrontend.devtools-panel.k41')}
                              >
                                <Download size={14} />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.id);
                                }}
                                title={i18n.t('microfrontend.devtools-panel.k42')}
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
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant='outlined'>
            <CardHeader title={i18n.t('microfrontend.devtools-panel.k43')} />
            <CardContent>
              {selected ? (
                <Box>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {selected.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1, display: 'block' }}
                  >
                    [i18n.t('microfrontend.devtools-panel.k34')]: {new Date(selected.createdAt).toLocaleString()}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1, display: 'block' }}
                  >
                    URL: {selected.metadata.url}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ mb: 1, display: 'block' }}
                  >
                    [i18n.t('microfrontend.devtools-panel.k35')]: {selected.steps.length}
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
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          [{new Date(step.timestamp).toLocaleTimeString()}]
                        </Typography>
                        <Chip
                          label={step.type}
                          size='small'
                          color={
                            step.type === 'error'
                              ? 'error'
                              : step.type === 'network'
                                ? 'primary'
                                : 'default'
                          }
                          sx={{ ml: 1, fontSize: 10 }}
                        />
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {JSON.stringify(step.data).substring(0, 80)}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Box>
              ) : (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('microfrontend.devtools-panel.k36')}
                </Typography>
              )}
            </CardContent>
          </Card>
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
