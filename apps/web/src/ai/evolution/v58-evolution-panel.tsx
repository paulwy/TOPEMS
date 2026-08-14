import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Paper,
  Chip,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Alert,
  LinearProgress,
  Badge,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  List,
  ListItem,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
} from '@mui/material';
import {
  X as XIcon,
  Cpu,
  GitBranch,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  FileText,
  Plus,
  Play,
  Square,
  BarChart3,
  Lock,
  Target,
  Eye,
  RefreshCw,
  Sparkles,
  Gauge,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { modelVersionManager, type Model, type VersionStatus } from './model-versioning';
import { abTestManager, type Experiment } from './ab-testing';
import {
  securityHardener,
  type SecurityReport,
  type ThreatModel,
  type SecuritySeverity,
} from './security-hardening';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabId = 'models' | 'experiments' | 'security' | 'threats';

const STATUS_COLORS: Record<VersionStatus, string> = {
  Active: designTokens.colors.success.dark,
  Deprecated: designTokens.colors.warning.main,
  Archived: 'colors.grey.500',
};

const EXPERIMENT_STATUS_COLORS: Record<string, string> = {
  Draft: 'colors.grey.500',
  Running: designTokens.colors.primary.main,
  Paused: designTokens.colors.warning.main,
  Completed: designTokens.colors.success.dark,
};

const SEVERITY_COLORS: Record<SecuritySeverity, string> = {
  Critical: designTokens.colors.error.main,
  High: 'colors.orange.500',
  Medium: designTokens.colors.warning.main,
  Low: designTokens.colors.primary.main,
  Info: 'colors.grey.500',
};

const V58EvolutionPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('models');
  const [models, setModels] = React.useState<Model[]>([]);
  const [experiments, setExperiments] = React.useState<Experiment[]>([]);
  const [securityReport, setSecurityReport] = React.useState<SecurityReport | null>(null);
  const [threats, setThreats] = React.useState<ThreatModel[]>([]);
  const [selectedModelId, setSelectedModelId] = React.useState<string | null>(null);
  const [selectedExpId, setSelectedExpId] = React.useState<string | null>(null);
  const [expandedThreat, setExpandedThreat] = React.useState<string | null>(null);
  const [showCreateModel, setShowCreateModel] = React.useState(false);
  const [showCreateExp, setShowCreateExp] = React.useState(false);
  const [newModel, setNewModel] = React.useState({
    name: '',
    type: '',
    description: '',
    owner: '',
  });
  const [newExp, setNewExp] = React.useState({ name: '', description: '', trafficSplit: 100 });

  const refreshAll = React.useCallback(() => {
    modelVersionManager.seed();
    abTestManager.seed();
    setModels(modelVersionManager.listModels());
    setExperiments(abTestManager.listExperiments());
    setSecurityReport(securityHardener.getSecurityReport());
    setThreats(securityHardener.listThreats());
  }, []);

  React.useEffect(() => {
    refreshAll();
    const unsubModels = modelVersionManager.on(() => setModels(modelVersionManager.listModels()));
    const unsubExp = abTestManager.on(() => setExperiments(abTestManager.listExperiments()));
    const unsubSec = securityHardener.on(() => {
      setThreats(securityHardener.listThreats());
      setSecurityReport(securityHardener.getSecurityReport());
    });
    return () => {
      unsubModels();
      unsubExp();
      unsubSec();
    };
  }, [refreshAll]);

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
          border: '1px solid rgba(139, 92, 246, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V58PanelHeader onClose={onClose} />
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as TabId)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Cpu size={16} />}
              iconPosition='start'
              label={`模型版本 (${models.length})`}
              value='models'
            />
            <Tab
              icon={<GitBranch size={16} />}
              iconPosition='start'
              label={`A/B 测试 (${experiments.length})`}
              value='experiments'
            />
            <Tab
              icon={<Shield size={16} />}
              iconPosition='start'
              label='安全加固'
              value='security'
            />
            <Tab
              icon={<AlertTriangle size={16} />}
              iconPosition='start'
              label={`威胁模型 (${threats.length})`}
              value='threats'
            />
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          {activeTab === 'models' && (
            <ModelsTab
              models={models}
              selectedModelId={selectedModelId}
              onSelect={setSelectedModelId}
              onCreate={() => setShowCreateModel(true)}
              onPublish={(modelId, version, metrics) => {
                modelVersionManager.publishVersion(modelId, version, metrics);
              }}
              onActivate={(modelId, versionId) => {
                modelVersionManager.activateVersion(modelId, versionId);
              }}
              onDeprecate={(modelId, versionId) => {
                modelVersionManager.deprecateVersion(modelId, versionId);
              }}
              onArchive={(modelId, versionId) => {
                modelVersionManager.archiveVersion(modelId, versionId);
              }}
            />
          )}
          {activeTab === 'experiments' && (
            <ExperimentsTab
              experiments={experiments}
              selectedExpId={selectedExpId}
              onSelect={setSelectedExpId}
              onCreate={() => setShowCreateExp(true)}
              onStart={(id) => abTestManager.startExperiment(id)}
              onStop={(id) => abTestManager.stopExperiment(id)}
            />
          )}
          {activeTab === 'security' && securityReport && (
            <SecurityTab
              report={securityReport}
              onRunScan={() => setSecurityReport(securityHardener.runSecurityScan())}
              onApplyHardening={() => securityHardener.applyHardening()}
            />
          )}
          {activeTab === 'threats' && (
            <ThreatsTab
              threats={threats}
              expandedThreat={expandedThreat}
              onToggle={(id) => setExpandedThreat(expandedThreat === id ? null : id)}
              onUpdate={(id, updates) => securityHardener.updateThreatModel(id, updates)}
            />
          )}
        </Box>

        {showCreateModel && (
          <Dialog
            open={showCreateModel}
            onClose={() => setShowCreateModel(false)}
            maxWidth='sm'
            fullWidth
          >
            <DialogTitle>注册新模型</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label='模型名称'
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  fullWidth
                  size='small'
                />
                <TextField
                  label='模型类型'
                  value={newModel.type}
                  onChange={(e) => setNewModel({ ...newModel, type: e.target.value })}
                  fullWidth
                  size='small'
                  placeholder='nlu / copilot / ops / ...'
                />
                <TextField
                  label='描述'
                  value={newModel.description}
                  onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                  fullWidth
                  size='small'
                  multiline
                  rows={2}
                />
                <TextField
                  label='负责人'
                  value={newModel.owner}
                  onChange={(e) => setNewModel({ ...newModel, owner: e.target.value })}
                  fullWidth
                  size='small'
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreateModel(false)}>取消</Button>
              <Button
                onClick={() => {
                  if (!newModel.name.trim()) return;
                  modelVersionManager.registerModel(
                    newModel.name,
                    newModel.type || 'custom',
                    newModel.description,
                    newModel.owner || 'unknown'
                  );
                  setNewModel({ name: '', type: '', description: '', owner: '' });
                  setShowCreateModel(false);
                }}
                variant='contained'
                sx={{ bgcolor: 'secondary.500' }}
                disabled={!newModel.name.trim()}
              >
                注册模型
              </Button>
            </DialogActions>
          </Dialog>
        )}

        {showCreateExp && (
          <Dialog
            open={showCreateExp}
            onClose={() => setShowCreateExp(false)}
            maxWidth='sm'
            fullWidth
          >
            <DialogTitle>创建 A/B 测试</DialogTitle>
            <DialogContent>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label='实验名称'
                  value={newExp.name}
                  onChange={(e) => setNewExp({ ...newExp, name: e.target.value })}
                  fullWidth
                  size='small'
                />
                <TextField
                  label='实验描述'
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  fullWidth
                  size='small'
                  multiline
                  rows={2}
                />
                <FormControl size='small'>
                  <InputLabel>流量分配 (%)</InputLabel>
                  <Select
                    value={newExp.trafficSplit}
                    label='流量分配 (%)'
                    onChange={(e) =>
                      setNewExp({ ...newExp, trafficSplit: e.target.value as number })
                    }
                  >
                    <MenuItem value={10}>10%</MenuItem>
                    <MenuItem value={25}>25%</MenuItem>
                    <MenuItem value={50}>50%</MenuItem>
                    <MenuItem value={100}>100%</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreateExp(false)}>取消</Button>
              <Button
                onClick={() => {
                  if (!newExp.name.trim()) return;
                  abTestManager.createExperiment(
                    newExp.name,
                    newExp.description,
                    [
                      { name: '对照组', modelVersion: 'v1.0.0', weight: 50, metrics: {} },
                      { name: '实验组', modelVersion: 'v2.0.0', weight: 50, metrics: {} },
                    ],
                    newExp.trafficSplit
                  );
                  setNewExp({ name: '', description: '', trafficSplit: 100 });
                  setShowCreateExp(false);
                }}
                variant='contained'
                sx={{ bgcolor: 'teal.500' }}
                disabled={!newExp.name.trim()}
              >
                创建实验
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </Box>
    </Box>
  );
};

const V58PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${designTokens.colors.secondary.main} 0%, ${designTokens.colors.primary.dark} 50%, ${designTokens.colors.primary.main} 100%)`,
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
        <Sparkles size={22} />
      </Box>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 700, fontSize: 18 }}
        >
          V58.0 AI 演进面板
        </Typography>
        <Typography
          variant='caption'
          sx={{ opacity: 0.85, fontSize: 12 }}
        >
          模型版本 · A/B 测试 · 安全加固 · 威胁建模
        </Typography>
      </Box>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Badge
        badgeContent='V58'
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

const ModelsTab: React.FC<{
  models: Model[];
  selectedModelId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
  onPublish: (modelId: string, version: string, metrics: Record<string, number>) => void;
  onActivate: (modelId: string, versionId: string) => void;
  onDeprecate: (modelId: string, versionId: string) => void;
  onArchive: (modelId: string, versionId: string) => void;
}> = ({
  models,
  selectedModelId,
  onSelect,
  onCreate,
  onPublish,
  onActivate,
  onDeprecate,
  onArchive,
}) => {
  const [newVersion, setNewVersion] = React.useState('');
  const [newMetricKey, setNewMetricKey] = React.useState('');
  const [newMetricVal, setNewMetricVal] = React.useState('');
  const [metrics, setMetrics] = React.useState<Record<string, number>>({});
  const [compareIds, setCompareIds] = React.useState<string[]>([]);

  const selectedModel = models.find((m) => m.id === selectedModelId) ?? null;
  const activeVersion = selectedModel ? modelVersionManager.getActiveModel(selectedModel.id) : null;

  const handleAddMetric = () => {
    if (!newMetricKey.trim() || !newMetricVal.trim()) return;
    setMetrics({ ...metrics, [newMetricKey]: parseFloat(newMetricVal) || 0 });
    setNewMetricKey('');
    setNewMetricVal('');
  };

  const handlePublish = () => {
    if (!selectedModel || !newVersion.trim()) return;
    onPublish(selectedModel.id, newVersion, metrics);
    setNewVersion('');
    setMetrics({});
  };

  const toggleCompare = (versionId: string) => {
    if (compareIds.includes(versionId)) {
      setCompareIds(compareIds.filter((id) => id !== versionId));
    } else if (compareIds.length < 2) {
      setCompareIds([...compareIds, versionId]);
    }
  };

  const getStatusChip = (status: VersionStatus) => (
    <Chip
      label={status}
      size='small'
      sx={{
        fontSize: 10,
        height: 20,
        bgcolor: `${STATUS_COLORS[status]}20`,
        color: STATUS_COLORS[status],
        fontWeight: 600,
      }}
    />
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Cpu size={20} />
          模型版本管理
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus size={14} />}
          onClick={onCreate}
          size='small'
          sx={{ bgcolor: 'secondary.500' }}
        >
          注册模型
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            模型列表 ({models.length})
          </Typography>
          {models.length === 0 && <Alert severity='info'>暂无模型</Alert>}
          {models.length > 0 && (
            <List sx={{ maxHeight: 500, overflow: 'auto' }}>
              {models.map((model) => {
                const active = modelVersionManager.getActiveModel(model.id);
                return (
                  <Paper
                    key={model.id}
                    elevation={0}
                    sx={{
                      mb: 1,
                      border: '1px solid',
                      borderColor: selectedModelId === model.id ? designTokens.colors.secondary.main : 'divider',
                      borderRadius: 1,
                      bgcolor: selectedModelId === model.id ? 'colors.secondary.50' : 'white',
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelect(model.id)}
                  >
                    <ListItem sx={{ py: 1.5 }}>
                      <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600, flex: 1 }}
                          >
                            {model.name}
                          </Typography>
                          {active && getStatusChip(active.status)}
                        </Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {model.type} · {model.versions.length} 版本
                        </Typography>
                      </Box>
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          )}
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedModel ? (
            <>
              <Card variant='outlined' sx={{ p: 2 }}>
                <Stack
                  direction='row'
                  spacing={2}
                  sx={{ mb: 2, alignItems: 'center' }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedModel.name}
                  </Typography>
                  <Chip
                    label={selectedModel.type}
                    size='small'
                    variant='outlined'
                  />
                  {activeVersion && (
                    <Chip
                      label={`当前: ${activeVersion.version}`}
                      size='small'
                      sx={{ bgcolor: 'success.100', color: 'teal.900', fontWeight: 600 }}
                    />
                  )}
                </Stack>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 2 }}
                >
                  {selectedModel.description}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  负责人: {selectedModel.owner}
                </Typography>
              </Card>

              <Card variant='outlined' sx={{ p: 2 }}>
                <Stack
                  direction='row'
                  spacing={2}
                  sx={{ mb: 2, justifyContent: 'space-between' }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Activity size={16} />
                    版本时间线
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    选择 2 个版本进行对比
                  </Typography>
                </Stack>

                {selectedModel.versions.length === 0 && (
                  <Alert severity='info'>暂无版本，发布第一个版本</Alert>
                )}
                {selectedModel.versions.length > 0 && (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, width: 40 }}></TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>版本</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>指标</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>创建时间</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedModel.versions.map((v) => (
                          <TableRow
                            key={v.id}
                            hover
                          >
                            <TableCell>
                              <Chip
                                label={compareIds.includes(v.id) ? '✓' : ''}
                                size='small'
                                onClick={() => toggleCompare(v.id)}
                                sx={{
                                  width: 24,
                                  height: 24,
                                  cursor: 'pointer',
                                  bgcolor: compareIds.includes(v.id) ? designTokens.colors.secondary.main : 'transparent',
                                  border: `1px solid ${designTokens.colors.secondary.main}`,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{v.version}</TableCell>
                            <TableCell>{getStatusChip(v.status)}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {Object.entries(v.metrics).map(([k, val]) => (
                                  <Chip
                                    key={k}
                                    label={`${k}: ${typeof val === 'number' ? val.toFixed(2) : val}`}
                                    size='small'
                                    variant='outlined'
                                    sx={{ fontSize: 10 }}
                                  />
                                ))}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {new Date(v.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Stack
                                direction='row'
                                spacing={0.5}
                              >
                                {v.status !== 'Active' && (
                                  <Button
                                    size='small'
                                    onClick={() => onActivate(selectedModel.id, v.id)}
                                    sx={{ fontSize: 10, minWidth: 'auto', px: 1 }}
                                  >
                                    激活
                                  </Button>
                                )}
                                {v.status === 'Active' && (
                                  <Button
                                    size='small'
                                    onClick={() => onDeprecate(selectedModel.id, v.id)}
                                    sx={{ fontSize: 10, minWidth: 'auto', px: 1 }}
                                  >
                                    废弃
                                  </Button>
                                )}
                                <Button
                                  size='small'
                                  onClick={() => onArchive(selectedModel.id, v.id)}
                                  sx={{ fontSize: 10, minWidth: 'auto', px: 1 }}
                                >
                                  归档
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}

                {compareIds.length === 2 &&
                  (() => {
                    const result = modelVersionManager.compareVersions(
                      selectedModel.id,
                      compareIds[0],
                      compareIds[1]
                    );
                    return (
                      <Paper
                        elevation={0}
                        sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}
                      >
                        <Typography
                          variant='subtitle2'
                          sx={{
                            fontWeight: 600,
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <BarChart3 size={16} />
                          版本对比结果
                        </Typography>
                        <Box
                          sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}
                        >
                          <Box>
                            <Typography
                              variant='caption'
                              sx={{ fontWeight: 600 }}
                            >
                              新增指标
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {result.added.length > 0 ? (
                                result.added.map((k) => (
                                  <Chip
                                    key={k}
                                    label={k}
                                    size='small'
                                    sx={{ bgcolor: 'success.100', color: 'teal.900', fontSize: 10 }}
                                  />
                                ))
                              ) : (
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  无
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              sx={{ fontWeight: 600 }}
                            >
                              移除指标
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {result.removed.length > 0 ? (
                                result.removed.map((k) => (
                                  <Chip
                                    key={k}
                                    label={k}
                                    size='small'
                                    sx={{ bgcolor: 'error.50', color: 'error.800', fontSize: 10 }}
                                  />
                                ))
                              ) : (
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  无
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box>
                            <Typography
                              variant='caption'
                              sx={{ fontWeight: 600 }}
                            >
                              变化指标
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                              {result.changed.length > 0 ? (
                                result.changed.map((k) => (
                                  <Chip
                                    key={k}
                                    label={`${k}: ${result.metricDeltas[k] > 0 ? '+' : ''}${result.metricDeltas[k].toFixed(3)}`}
                                    size='small'
                                    sx={{
                                      bgcolor: result.metricDeltas[k] > 0 ? 'colors.success.100' : 'colors.error.50',
                                      color: result.metricDeltas[k] > 0 ? 'colors.success.dark' : 'colors.error.800',
                                      fontSize: 10,
                                    }}
                                  />
                                ))
                              ) : (
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  无
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })()}
              </Card>

              <Card variant='outlined' sx={{ p: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Plus size={16} />
                  发布新版本
                </Typography>
                <Stack
                  direction='row'
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <TextField
                    label='版本号'
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    size='small'
                    sx={{ flex: 1 }}
                    placeholder='v1.2.0'
                  />
                </Stack>
                <Stack
                  direction='row'
                  spacing={1}
                  sx={{ mb: 2 }}
                >
                  <TextField
                    label='指标名'
                    value={newMetricKey}
                    onChange={(e) => setNewMetricKey(e.target.value)}
                    size='small'
                    placeholder='accuracy'
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label='指标值'
                    value={newMetricVal}
                    onChange={(e) => setNewMetricVal(e.target.value)}
                    size='small'
                    placeholder='0.92'
                    sx={{ flex: 1 }}
                  />
                  <Button
                    variant='outlined'
                    size='small'
                    onClick={handleAddMetric}
                  >
                    添加
                  </Button>
                </Stack>
                {Object.keys(metrics).length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {Object.entries(metrics).map(([k, v]) => (
                      <Chip
                        key={k}
                        label={`${k}: ${v}`}
                        size='small'
                        onDelete={() => {
                          const m = { ...metrics };
                          delete m[k];
                          setMetrics(m);
                        }}
                      />
                    ))}
                  </Box>
                )}
                <Button
                  variant='contained'
                  onClick={handlePublish}
                  disabled={!newVersion.trim()}
                  sx={{ bgcolor: 'secondary.500' }}
                  size='small'
                >
                  发布版本
                </Button>
              </Card>
            </>
          ) : (
            <Card variant='outlined' sx={{ p: 2 }}>
              <Alert severity='info'>请选择一个模型查看详情</Alert>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const ExperimentsTab: React.FC<{
  experiments: Experiment[];
  selectedExpId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
}> = ({ experiments, selectedExpId, onSelect, onCreate, onStart, onStop }) => {
  const selectedExp = experiments.find((e) => e.id === selectedExpId) ?? null;
  const results = selectedExp ? abTestManager.getResults(selectedExp.id) : [];
  const significance = selectedExp ? abTestManager.checkSignificance(selectedExp.id) : null;

  const getStatusChip = (status: string) => (
    <Chip
      label={status}
      size='small'
      sx={{
        fontSize: 10,
        height: 20,
        bgcolor: `${EXPERIMENT_STATUS_COLORS[status]}20`,
        color: EXPERIMENT_STATUS_COLORS[status],
        fontWeight: 600,
      }}
    />
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <GitBranch size={20} />
          A/B 测试管理
        </Typography>
        <Button
          variant='contained'
          startIcon={<Plus size={14} />}
          onClick={onCreate}
          size='small'
          sx={{ bgcolor: 'teal.500' }}
        >
          创建实验
        </Button>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            实验列表 ({experiments.length})
          </Typography>
          {experiments.length === 0 && <Alert severity='info'>暂无实验</Alert>}
          {experiments.length > 0 && (
            <List sx={{ maxHeight: 500, overflow: 'auto' }}>
              {experiments.map((exp) => (
                <Paper
                  key={exp.id}
                  elevation={0}
                  sx={{
                    mb: 1,
                    border: '1px solid',
                    borderColor: selectedExpId === exp.id ? designTokens.colors.success.dark : 'divider',
                    borderRadius: 1,
                    bgcolor: selectedExpId === exp.id ? 'colors.success.50' : 'white',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelect(exp.id)}
                >
                  <ListItem sx={{ py: 1.5 }}>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600, flex: 1 }}
                        >
                          {exp.name}
                        </Typography>
                        {getStatusChip(exp.status)}
                      </Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {exp.variants.length} 变体 · {exp.traffic_split}% 流量
                      </Typography>
                    </Box>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedExp ? (
            <>
              <Card variant='outlined' sx={{ p: 2 }}>
                <Stack
                  direction='row'
                  spacing={2}
                  sx={{ mb: 2, alignItems: 'center' }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {selectedExp.name}
                  </Typography>
                  {getStatusChip(selectedExp.status)}
                  <Box sx={{ flex: 1 }} />
                  {selectedExp.status === 'Draft' && (
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<Play size={12} />}
                      onClick={() => onStart(selectedExp.id)}
                      sx={{ bgcolor: 'teal.500' }}
                    >
                      启动实验
                    </Button>
                  )}
                  {selectedExp.status === 'Running' && (
                    <Button
                      variant='contained'
                      size='small'
                      startIcon={<Square size={12} />}
                      onClick={() => onStop(selectedExp.id)}
                      sx={{ bgcolor: 'error.500' }}
                    >
                      停止实验
                    </Button>
                  )}
                </Stack>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 2 }}
                >
                  {selectedExp.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={`流量: ${selectedExp.traffic_split}%`}
                    size='small'
                    variant='outlined'
                  />
                  <Chip
                    label={`变体: ${selectedExp.variants.length}`}
                    size='small'
                    variant='outlined'
                  />
                  <Chip
                    label={`开始: ${new Date(selectedExp.startDate).toLocaleDateString()}`}
                    size='small'
                    variant='outlined'
                  />
                </Box>
              </Card>

              <Card variant='outlined' sx={{ p: 2 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <BarChart3 size={16} />
                  变体性能
                </Typography>
                {results.length > 0 ? (
                  <TableContainer>
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>变体</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>模型版本</TableCell>
                          <TableCell sx={{ fontWeight: 600, align: 'right' }}>访客</TableCell>
                          <TableCell sx={{ fontWeight: 600, align: 'right' }}>转化</TableCell>
                          <TableCell sx={{ fontWeight: 600, align: 'right' }}>转化率</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>表现</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {results.map((result) => {
                          const isWinner = significance?.winner === result.variant.name;
                          return (
                            <TableRow key={result.variant.id}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {isWinner && (
                                    <TrendingUp
                                      size={14}
                                      style={{ color: 'teal.500' }}
                                    />
                                  )}
                                  <Typography
                                    variant='body2'
                                    sx={{ fontWeight: isWinner ? 600 : 400 }}
                                  >
                                    {result.variant.name}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={result.variant.modelVersion}
                                  size='small'
                                  variant='outlined'
                                />
                              </TableCell>
                              <TableCell align='right'>
                                {result.visitors.toLocaleString()}
                              </TableCell>
                              <TableCell align='right'>
                                {result.conversions.toLocaleString()}
                              </TableCell>
                              <TableCell align='right'>
                                <Typography
                                  sx={{ fontWeight: 600, color: isWinner ? designTokens.colors.success.dark : 'inherit' }}
                                >
                                  {(result.conversionRate * 100).toFixed(2)}%
                                </Typography>
                              </TableCell>
                              <TableCell sx={{ width: 150 }}>
                                <LinearProgress
                                  variant='determinate'
                                  value={result.conversionRate * 100 * 10}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity='info'>暂无数据，请启动实验</Alert>
                )}
              </Card>

              {significance && (
                <Card variant='outlined' sx={{ p: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <Target size={16} />
                    统计显著性分析
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        显著
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {significance.isSignificant ? (
                          <CheckCircle2
                            size={28}
                            style={{ color: 'teal.500' }}
                          />
                        ) : (
                          <XCircle
                            size={28}
                            style={{ color: 'grey.400' }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        置信度
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 700, color: 'primary.500' }}
                      >
                        {(significance.confidenceLevel * 100).toFixed(1)}%
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        P 值
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 700 }}
                      >
                        {significance.pValue.toFixed(4)}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        相对提升
                      </Typography>
                      <Typography
                        variant='h6'
                        sx={{
                          fontWeight: 700,
                          color: significance.relativeLift > 0 ? designTokens.colors.success.dark : designTokens.colors.error.main,
                        }}
                      >
                        {significance.relativeLift > 0 ? '+' : ''}
                        {(significance.relativeLift * 100).toFixed(2)}%
                      </Typography>
                    </Box>
                  </Box>
                  {significance.winner && (
                    <Paper
                      elevation={0}
                      sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        🏆 胜者: {significance.winner} (置信度{' '}
                        {(significance.confidenceLevel * 100).toFixed(1)}%)
                      </Typography>
                    </Paper>
                  )}
                </Card>
              )}
            </>
          ) : (
            <Card variant='outlined' sx={{ p: 2 }}>
              <Alert severity='info'>请选择一个实验查看详情</Alert>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const SecurityTab: React.FC<{
  report: SecurityReport;
  onRunScan: () => void;
  onApplyHardening: () => void;
}> = ({ report, onRunScan, onApplyHardening }) => {
  const severityOrder: Record<string, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
    Info: 4,
  };

  const sortedChecks = [...report.checks].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <ShieldCheck size={20} />
          安全加固报告
        </Typography>
        <Stack
          direction='row'
          spacing={1}
        >
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={14} />}
            onClick={onRunScan}
            size='small'
          >
            重新扫描
          </Button>
          <Button
            variant='contained'
            startIcon={<Shield size={14} />}
            onClick={onApplyHardening}
            size='small'
            sx={{ bgcolor: 'error.500' }}
          >
            应用加固
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Gauge
              size={32}
              style={{
                color: report.score >= 80 ? designTokens.colors.success.dark : report.score >= 60 ? designTokens.colors.warning.main : designTokens.colors.error.main,
              }}
            />
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, mt: 1 }}
            >
              {report.score}%
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              安全评分
            </Typography>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle2
              size={32}
              style={{ color: 'teal.500' }}
            />
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, mt: 1, color: 'teal.500' }}
            >
              {report.passed}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              通过
            </Typography>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <AlertTriangle
              size={32}
              style={{ color: 'warning.500' }}
            />
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, mt: 1, color: 'warning.500' }}
            >
              {report.warnings}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              警告
            </Typography>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <XCircle
              size={32}
              style={{ color: 'error.500' }}
            />
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, mt: 1, color: 'error.500' }}
            >
              {report.failed}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              失败
            </Typography>
          </Box>
        </Card>
      </Box>

      <Card variant='outlined' sx={{ p: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <FileText size={16} />
          安全检查详情
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>检查项</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>严重度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>建议</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedChecks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    <Chip
                      label={check.type}
                      size='small'
                      variant='outlined'
                      sx={{ fontSize: 10 }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>{check.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={check.severity}
                      size='small'
                      sx={{
                        fontSize: 10,
                        height: 20,
                        bgcolor: `${SEVERITY_COLORS[check.severity]}20`,
                        color: SEVERITY_COLORS[check.severity],
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {check.status === 'Passed' && (
                      <Chip
                        label='通过'
                        size='small'
                        sx={{ bgcolor: 'success.100', color: 'teal.900', fontSize: 10 }}
                      />
                    )}
                    {check.status === 'Failed' && (
                      <Chip
                        label='失败'
                        size='small'
                        sx={{ bgcolor: 'error.50', color: 'error.800', fontSize: 10 }}
                      />
                    )}
                    {check.status === 'Warning' && (
                      <Chip
                        label='警告'
                        size='small'
                        sx={{ bgcolor: 'warning.100', color: 'warning.800', fontSize: 10 }}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                    {check.recommendation}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};

const ThreatsTab: React.FC<{
  threats: ThreatModel[];
  expandedThreat: string | null;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<ThreatModel, 'id'>>) => void;
}> = ({ threats, expandedThreat, onToggle, onUpdate }) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editStatus, setEditStatus] = React.useState<'Identified' | 'Mitigated' | 'Resolved'>(
    'Identified'
  );

  const getSeverityIcon = (severity: string) => {
    const colors: Record<string, string> = {
      Critical: designTokens.colors.error.main,
      High: 'colors.orange.500',
      Medium: designTokens.colors.warning.main,
      Low: designTokens.colors.primary.main,
    };
    return (
      <AlertTriangle
        size={16}
        style={{ color: colors[severity] ?? 'colors.grey.500' }}
      />
    );
  };

  const getStatusChip = (status: string) => {
    const colors: Record<string, string> = {
      Identified: designTokens.colors.error.main,
      Mitigated: designTokens.colors.warning.main,
      Resolved: designTokens.colors.success.dark,
    };
    return (
      <Chip
        label={status}
        size='small'
        sx={{
          fontSize: 10,
          height: 20,
          bgcolor: `${colors[status]}20`,
          color: colors[status],
          fontWeight: 600,
        }}
      />
    );
  };

  const stats = {
    total: threats.length,
    critical: threats.filter((t) => t.severity === 'Critical').length,
    high: threats.filter((t) => t.severity === 'High').length,
    mitigated: threats.filter((t) => t.status === 'Mitigated' || t.status === 'Resolved').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between' }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <AlertTriangle size={20} />
          威胁模型
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          共 {stats.total} 项威胁 · {stats.critical} 严重 · {stats.high} 高危 · {stats.mitigated}{' '}
          已缓解
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Lock
              size={24}
              style={{ color: 'error.500' }}
            />
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.critical}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                严重威胁
              </Typography>
            </Box>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AlertTriangle
              size={24}
              style={{ color: 'orange.500' }}
            />
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.high}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                高危威胁
              </Typography>
            </Box>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Gauge
              size={24}
              style={{ color: 'warning.500' }}
            />
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {threats.filter((t) => t.status === 'Identified').length}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                待处理
              </Typography>
            </Box>
          </Box>
        </Card>
        <Card variant='outlined' sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle2
              size={24}
              style={{ color: 'teal.500' }}
            />
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {stats.mitigated}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                已缓解
              </Typography>
            </Box>
          </Box>
        </Card>
      </Box>

      <Card variant='outlined' sx={{ p: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Eye size={16} />
          威胁详情
        </Typography>
        {threats.length === 0 && <Alert severity='info'>暂无威胁</Alert>}
        {threats.length > 0 && (
          <Box>
            {threats.map((threat) => (
              <Paper
                key={threat.id}
                elevation={0}
                sx={{
                  mb: 1,
                  border: '1px solid',
                  borderColor: expandedThreat === threat.id ? designTokens.colors.secondary.main : 'divider',
                  borderRadius: 1,
                  bgcolor: expandedThreat === threat.id ? 'colors.secondary.50' : 'white',
                }}
              >
                <ListItem
                  sx={{ py: 1.5, cursor: 'pointer' }}
                  onClick={() => onToggle(threat.id)}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {expandedThreat === threat.id ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                      {getSeverityIcon(threat.severity)}
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600, flex: 1 }}
                      >
                        {threat.threat_type}
                      </Typography>
                      {getStatusChip(threat.status)}
                    </Box>
                  </Box>
                </ListItem>
                <Collapse in={expandedThreat === threat.id}>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Divider sx={{ mb: 1 }} />
                    <Box
                      sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}
                    >
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          严重度
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getSeverityIcon(threat.severity)}
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {threat.severity}
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          可能性
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          {threat.likelihood}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          影响
                        </Typography>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 600 }}
                        >
                          {threat.impact}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          状态
                        </Typography>
                        {getStatusChip(threat.status)}
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        缓解措施
                      </Typography>
                      <Typography variant='body2'>{threat.mitigation}</Typography>
                    </Box>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      {editingId !== threat.id ? (
                        <Button
                          size='small'
                          variant='outlined'
                          startIcon={<RefreshCw size={12} />}
                          onClick={() => {
                            setEditingId(threat.id);
                            setEditStatus(threat.status);
                          }}
                        >
                          更新状态
                        </Button>
                      ) : (
                        <>
                          <FormControl
                            size='small'
                            sx={{ minWidth: 120 }}
                          >
                            <InputLabel>新状态</InputLabel>
                            <Select
                              value={editStatus}
                              label='新状态'
                              onChange={(e) =>
                                setEditStatus(
                                  e.target.value as 'Identified' | 'Mitigated' | 'Resolved'
                                )
                              }
                            >
                              <MenuItem value='Identified'>Identified</MenuItem>
                              <MenuItem value='Mitigated'>Mitigated</MenuItem>
                              <MenuItem value='Resolved'>Resolved</MenuItem>
                            </Select>
                          </FormControl>
                          <Button
                            size='small'
                            variant='contained'
                            onClick={() => {
                              onUpdate(threat.id, { status: editStatus });
                              setEditingId(null);
                            }}
                            sx={{ bgcolor: 'teal.500' }}
                          >
                            保存
                          </Button>
                          <Button
                            size='small'
                            onClick={() => setEditingId(null)}
                          >
                            取消
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Card>
    </Box>
  );
};

export { V58EvolutionPanel };
