import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import SendIcon from '@mui/icons-material/Send';
import UndoIcon from '@mui/icons-material/Undo';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  lineageAnalyticsApi,
  type LineageGraph,
  type ImpactAnalysisResult,
  type ImpactSimulation,
  type PropagationRule,
  type PropagationLog,
} from '@/api/master/lineageAnalytics';
import i18n from '@/i18n';

const t = (key: string): string => i18n.t(`master.lineage_analytics.${key}`);

const CHANGE_TYPES = ['create', 'update', 'delete', 'rename', 'merge'];
const EDGE_TYPES = ['derives_from', 'transforms', 'depends_on', 'implements'];
const ACTIONS = ['cascade_update', 'sync_notify', 'reject', 'transform'];

const LineageAnalyticsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 血缘登记
  const [graph, setGraph] = useState<LineageGraph | null>(null);
  const [regForm, setRegForm] = useState({
    from_entity_type: '',
    from_entity_id: '',
    to_entity_type: '',
    to_entity_id: '',
    edge_type: 'derives_from',
    transformation_description: '',
  });
  const [deleteNodeId, setDeleteNodeId] = useState('');

  // 影响分析
  const [impactForm, setImpactForm] = useState({
    target_entity_id: '',
    change_type: 'update',
    analysis_depth: 3,
    include_chain_reactions: true,
  });
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [simForm, setSimForm] = useState({
    entity_type: '',
    entity_id: '',
    change_type: 'update',
  });
  const [simResult, setSimResult] = useState<ImpactSimulation | null>(null);

  // 变更传播
  const [propForm, setPropForm] = useState({
    entity_type: '',
    entity_id: '',
    change_type: 'update',
    old_value: '',
    new_value: '',
  });
  const [rules, setRules] = useState<PropagationRule[]>([]);
  const [ruleForm, setRuleForm] = useState({
    source_entity_type: '',
    target_entity_type: '',
    condition: '',
    action: 'sync_notify',
  });
  const [logs, setLogs] = useState<PropagationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGraph = useCallback(async () => {
    try {
      const res = await lineageAnalyticsApi.getGraph();
      if (res.success) setGraph(res.data);
    } catch (err) {
      console.error('加载血缘图谱失败', err);
      setError(t('graph_load_failed'));
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      const res = await lineageAnalyticsApi.getPropagationRules();
      if (res.success) setRules(res.data || []);
    } catch (err) {
      console.error('加载传播规则失败', err);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const res = await lineageAnalyticsApi.getPropagationLog();
      if (res.success) setLogs(res.data || []);
    } catch (err) {
      console.error('加载传播日志失败', err);
    }
  }, []);

  useEffect(() => {
    loadGraph();
    loadRules();
    loadLogs();
  }, [loadGraph, loadRules, loadLogs]);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.register(regForm);
      if (!res.success) setError(res.message || t('register_failed'));
      else {
        setRegForm({
          ...regForm,
          from_entity_id: '',
          to_entity_id: '',
          transformation_description: '',
        });
        loadGraph();
      }
    } catch (err) {
      console.error('注册血缘失败', err);
      setError(t('register_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNode = async () => {
    if (!deleteNodeId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.remove(deleteNodeId.trim());
      if (!res.success) setError(res.message || t('delete_failed'));
      else {
        setDeleteNodeId('');
        loadGraph();
      }
    } catch (err) {
      console.error('删除节点失败', err);
      setError(t('delete_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.analyzeImpact({
        target_entity_id: impactForm.target_entity_id,
        change_type: impactForm.change_type,
        analysis_depth: impactForm.analysis_depth || undefined,
        include_chain_reactions: impactForm.include_chain_reactions,
      });
      if (!res.success) setError(res.message || t('analyze_failed'));
      else setImpactResult(res.data);
    } catch (err) {
      console.error('影响分析失败', err);
      setError(t('analyze_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.simulateChange(simForm);
      if (!res.success) setError(res.message || t('simulate_failed'));
      else setSimResult(res.data);
    } catch (err) {
      console.error('变更模拟失败', err);
      setError(t('simulate_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePropagate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data: {
        entity_type: string;
        entity_id: string;
        change_type: string;
        old_value?: Record<string, unknown>;
        new_value?: Record<string, unknown>;
      } = {
        entity_type: propForm.entity_type,
        entity_id: propForm.entity_id,
        change_type: propForm.change_type,
      };
      if (propForm.old_value.trim()) data.old_value = JSON.parse(propForm.old_value);
      if (propForm.new_value.trim()) data.new_value = JSON.parse(propForm.new_value);
      const res = await lineageAnalyticsApi.propagate(data);
      if (!res.success) setError(res.message || t('propagate_failed'));
      else loadLogs();
    } catch (err) {
      console.error('变更传播失败', err);
      setError(t('propagate_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.addPropagationRule(ruleForm);
      if (!res.success) setError(res.message || t('rule_add_failed'));
      else {
        setRuleForm({
          source_entity_type: '',
          target_entity_type: '',
          condition: '',
          action: 'sync_notify',
        });
        loadRules();
      }
    } catch (err) {
      console.error('新增规则失败', err);
      setError(t('rule_add_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await lineageAnalyticsApi.rollbackPropagation(id);
      if (!res.success) setError(res.message || t('rollback_failed'));
      else loadLogs();
    } catch (err) {
      console.error('回滚失败', err);
      setError(t('rollback_failed'));
    } finally {
      setLoading(false);
    }
  };

  const riskColor = (level: string) =>
    level === 'critical' || level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'success';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AccountTreeIcon sx={{ color: 'primary.main' }} />
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
        >
          {t('title')}
        </Typography>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mb: 2 }}
      >
        {t('desc')}
      </Typography>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
      >
        <Tab label={t('tab_register')} />
        <Tab label={t('tab_impact')} />
        <Tab label={t('tab_propagate')} />
      </Tabs>

      {loading && (
        <CircularProgress
          size={24}
          sx={{ display: 'block', mb: 2 }}
        />
      )}

      {/* Tab 1: 血缘登记 */}
      {tab === 0 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('register_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <TextField
                  label={t('from_entity_type')}
                  value={regForm.from_entity_type}
                  onChange={(e) => setRegForm({ ...regForm, from_entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('from_entity_id')}
                  value={regForm.from_entity_id}
                  onChange={(e) => setRegForm({ ...regForm, from_entity_id: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('to_entity_type')}
                  value={regForm.to_entity_type}
                  onChange={(e) => setRegForm({ ...regForm, to_entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('to_entity_id')}
                  value={regForm.to_entity_id}
                  onChange={(e) => setRegForm({ ...regForm, to_entity_id: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('edge_type')}
                  value={regForm.edge_type}
                  onChange={(e) => setRegForm({ ...regForm, edge_type: e.target.value })}
                  size='small'
                  sx={{ minWidth: 140 }}
                >
                  {EDGE_TYPES.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <TextField
                label={t('transformation_desc')}
                value={regForm.transformation_description}
                onChange={(e) =>
                  setRegForm({ ...regForm, transformation_description: e.target.value })
                }
                fullWidth
                size='small'
                sx={{ mt: 2 }}
              />
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={handleRegister}
                sx={{ mt: 2 }}
                disabled={loading}
              >
                {t('register_btn')}
              </Button>
            </CardContent>
          </Card>

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
                  {t('graph_title')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size='small'
                    startIcon={<RefreshIcon />}
                    onClick={loadGraph}
                  >
                    {t('refresh')}
                  </Button>
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => lineageAnalyticsApi.export('json')}
                  >
                    {t('export')}
                  </Button>
                </Box>
              </Box>
              {graph && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    label={`${t('nodes')}: ${graph.nodes.length}`}
                    color='primary'
                  />
                  <Chip
                    label={`${t('edges')}: ${graph.edges.length}`}
                    color='secondary'
                  />
                  <Chip label={`v${graph.version}`} />
                </Box>
              )}
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label={t('delete_node_id')}
                  value={deleteNodeId}
                  onChange={(e) => setDeleteNodeId(e.target.value)}
                  size='small'
                />
                <Button
                  color='error'
                  variant='outlined'
                  onClick={handleDeleteNode}
                  disabled={loading}
                >
                  {t('delete_node')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 2: 影响分析 */}
      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('analyze_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('target_entity_id')}
                  value={impactForm.target_entity_id}
                  onChange={(e) =>
                    setImpactForm({ ...impactForm, target_entity_id: e.target.value })
                  }
                  size='small'
                />
                <TextField
                  select
                  label={t('change_type')}
                  value={impactForm.change_type}
                  onChange={(e) => setImpactForm({ ...impactForm, change_type: e.target.value })}
                  size='small'
                  sx={{ minWidth: 120 }}
                >
                  {CHANGE_TYPES.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('analysis_depth')}
                  type='number'
                  value={impactForm.analysis_depth}
                  onChange={(e) =>
                    setImpactForm({ ...impactForm, analysis_depth: Number(e.target.value) })
                  }
                  size='small'
                />
                <Button
                  variant='contained'
                  startIcon={<TrackChangesIcon />}
                  onClick={handleAnalyze}
                  disabled={loading}
                >
                  {t('analyze_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {impactResult && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {t('result_title')}
                  </Typography>
                  <Chip
                    label={`${t('risk')}: ${impactResult.risk_level}`}
                    color={riskColor(impactResult.risk_level)}
                    size='small'
                  />
                  <Chip
                    label={`${t('affected_nodes_count')}: ${impactResult.affected_nodes.length}`}
                    size='small'
                  />
                </Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {t('affected_nodes')}
                </Typography>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('node_name')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('entity_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('direct')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('depth')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {impactResult.affected_nodes.map((n) => (
                        <TableRow key={n.node_id}>
                          <TableCell>{n.name}</TableCell>
                          <TableCell>{n.entity_type}</TableCell>
                          <TableCell>{n.is_direct ? '✓' : '-'}</TableCell>
                          <TableCell>{n.dependency_depth}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {impactResult.recommendations.length > 0 && (
                  <>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mt: 2, mb: 1 }}
                    >
                      {t('recommendations')}
                    </Typography>
                    <Box
                      component='ul'
                      sx={{ m: 0, pl: 2 }}
                    >
                      {impactResult.recommendations.map((r, i) => (
                        <li key={i}>
                          <Typography variant='body2'>{r}</Typography>
                        </li>
                      ))}
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('simulate_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('entity_type')}
                  value={simForm.entity_type}
                  onChange={(e) => setSimForm({ ...simForm, entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('entity_id')}
                  value={simForm.entity_id}
                  onChange={(e) => setSimForm({ ...simForm, entity_id: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('change_type')}
                  value={simForm.change_type}
                  onChange={(e) => setSimForm({ ...simForm, change_type: e.target.value })}
                  size='small'
                  sx={{ minWidth: 120 }}
                >
                  {CHANGE_TYPES.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant='outlined'
                  onClick={handleSimulate}
                  disabled={loading}
                >
                  {t('simulate_btn')}
                </Button>
              </Box>
              {simResult && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    label={`${t('risk')}: ${simResult.risk_assessment}`}
                    color='warning'
                    size='small'
                  />
                  <Typography
                    variant='body2'
                    sx={{ mt: 1, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                  >
                    {JSON.stringify(simResult.affected_scope, null, 2)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tab 3: 变更传播 */}
      {tab === 2 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {t('propagate_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('entity_type')}
                  value={propForm.entity_type}
                  onChange={(e) => setPropForm({ ...propForm, entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('entity_id')}
                  value={propForm.entity_id}
                  onChange={(e) => setPropForm({ ...propForm, entity_id: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('change_type')}
                  value={propForm.change_type}
                  onChange={(e) => setPropForm({ ...propForm, change_type: e.target.value })}
                  size='small'
                  sx={{ minWidth: 120 }}
                >
                  {CHANGE_TYPES.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant='contained'
                  startIcon={<SendIcon />}
                  onClick={handlePropagate}
                  disabled={loading}
                >
                  {t('propagate_btn')}
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <TextField
                  label={t('old_value')}
                  value={propForm.old_value}
                  onChange={(e) => setPropForm({ ...propForm, old_value: e.target.value })}
                  fullWidth
                  multiline
                  minRows={2}
                  size='small'
                />
                <TextField
                  label={t('new_value')}
                  value={propForm.new_value}
                  onChange={(e) => setPropForm({ ...propForm, new_value: e.target.value })}
                  fullWidth
                  multiline
                  minRows={2}
                  size='small'
                />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 2 }}>
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
                  {t('rules_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadRules}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {rules.length === 0 ? (
                <Typography variant='body1'>{t('rules_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('source_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('target_type')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('condition')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('action')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rules.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.source_entity_type}</TableCell>
                          <TableCell>{r.target_entity_type}</TableCell>
                          <TableCell>{r.condition}</TableCell>
                          <TableCell>
                            <Chip
                              label={r.action}
                              size='small'
                              color='primary'
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mb: 1 }}
              >
                {t('add_rule_title')}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                <TextField
                  label={t('source_type')}
                  value={ruleForm.source_entity_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, source_entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('target_type')}
                  value={ruleForm.target_entity_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, target_entity_type: e.target.value })}
                  size='small'
                />
                <TextField
                  label={t('condition')}
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                  size='small'
                />
                <TextField
                  select
                  label={t('action')}
                  value={ruleForm.action}
                  onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}
                  size='small'
                  sx={{ minWidth: 140 }}
                >
                  {ACTIONS.map((v) => (
                    <MenuItem
                      key={v}
                      value={v}
                    >
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  variant='outlined'
                  startIcon={<AddIcon />}
                  onClick={handleAddRule}
                  disabled={loading}
                >
                  {t('add_rule_btn')}
                </Button>
              </Box>
            </CardContent>
          </Card>

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
                  {t('logs_title')}
                </Typography>
                <Button
                  size='small'
                  startIcon={<RefreshIcon />}
                  onClick={loadLogs}
                >
                  {t('refresh')}
                </Button>
              </Box>
              {logs.length === 0 ? (
                <Typography variant='body1'>{t('logs_empty')}</Typography>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 600 }}>{t('source_entity')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('target_entity')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('action')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('status')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('propagated_at')}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t('col_actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {logs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell>{l.source_entity_id}</TableCell>
                          <TableCell>{l.target_entity_id}</TableCell>
                          <TableCell>{l.action}</TableCell>
                          <TableCell>
                            <Chip
                              label={l.status}
                              size='small'
                              color={l.status === 'success' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{new Date(l.propagated_at).toLocaleString('zh-CN')}</TableCell>
                          <TableCell>
                            {!l.rollback_id && (
                              <Tooltip title={t('rollback')}>
                                <IconButton
                                  size='small'
                                  color='warning'
                                  onClick={() => handleRollback(l.id)}
                                >
                                  <UndoIcon fontSize='small' />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default LineageAnalyticsPage;
