import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Save as SaveIcon,
  CheckCircle2 as CheckIcon,
  AlertTriangle as AlertIcon,
  RefreshCw as RefreshIcon,
  Plus as AddIcon,
  Trash2 as DeleteIcon,
} from 'lucide-react';
import { automationDesignerApi, automationRulesApi } from '@/api/automation';
import type {
  AutomationDesignerCanvas,
  AutomationDesignerNode,
  AutomationNodeType,
  AutomationRule,
} from '@/api/automation';

const NODE_TYPE_LABEL: Record<AutomationNodeType, string> = {
  trigger: '触发器',
  workflow_action: '工作流动作',
  integration_action: '集成动作',
  api_action: 'API 动作',
  lowcode_action: '低代码动作',
  notification_action: '通知动作',
  condition: '条件分支',
  delay: '延时',
  success_hook: '成功钩子',
  error_hook: '失败钩子',
};

const NODE_TYPE_COLOR: Record<AutomationNodeType, 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  trigger: 'primary',
  workflow_action: 'info',
  integration_action: 'info',
  api_action: 'info',
  lowcode_action: 'info',
  notification_action: 'success',
  condition: 'warning',
  delay: 'default',
  success_hook: 'success',
  error_hook: 'error',
};

interface DesignerNodeItem extends AutomationDesignerNode {
  isNew?: boolean;
}

export const AutomationDesignerPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [canvas, setCanvas] = useState<AutomationDesignerCanvas | null>(null);
  const [nodes, setNodes] = useState<DesignerNodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ node_id?: string; message: string; severity: 'error' | 'warning' }>
  >([]);
  const [editNode, setEditNode] = useState<DesignerNodeItem | null>(null);

  const loadRules = useCallback(async () => {
    try {
      const res = await automationRulesApi.list({ page: 1, pageSize: 100 });
      setRules(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载规则列表失败');
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const loadCanvas = useCallback(async (ruleId: string) => {
    if (!ruleId) return;
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await automationDesignerApi.getCanvas(ruleId);
      if (res.data) {
        setCanvas(res.data);
        setNodes(res.data.nodes);
      } else {
        setCanvas(null);
        setNodes([]);
      }
    } catch (err) {
      // 画布不存在时尝试从规则同步
      try {
        const syncRes = await automationDesignerApi.syncFromRule(ruleId);
        if (syncRes.data) {
          setCanvas(syncRes.data);
          setNodes(syncRes.data.nodes);
        }
      } catch (syncErr) {
        setError(
          syncErr instanceof Error
            ? syncErr.message
            : err instanceof Error
              ? err.message
              : '加载画布失败'
        );
        setCanvas(null);
        setNodes([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRuleId) {
      loadCanvas(selectedRuleId);
    } else {
      setCanvas(null);
      setNodes([]);
    }
  }, [selectedRuleId, loadCanvas]);

  const handleAddNode = (type: AutomationNodeType) => {
    const newNode: DesignerNodeItem = {
      id: `node_${Date.now()}`,
      type,
      name: NODE_TYPE_LABEL[type],
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 100 },
      config: {},
      isNew: true,
    };
    setNodes((prev) => [...prev, newNode]);
    setEditNode(newNode);
  };

  const handleDeleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSaveNode = (updated: DesignerNodeItem) => {
    setNodes((prev) => prev.map((n) => (n.id === updated.id ? { ...updated, isNew: false } : n)));
    setEditNode(null);
  };

  const handleSave = async () => {
    if (!selectedRuleId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await automationDesignerApi.saveCanvas(selectedRuleId, {
        nodes: nodes.map(({ id, type, name, position, config, next_nodes, branches }) => ({
          id,
          type,
          name,
          position,
          config,
          next_nodes,
          branches,
        })),
        edges: canvas?.edges ?? [],
        zoom: canvas?.zoom,
        offset: canvas?.offset,
      });
      if (res.data) {
        setCanvas(res.data);
        setNodes(res.data.nodes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存画布失败');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedRuleId) return;
    setValidating(true);
    setError(null);
    try {
      const res = await automationDesignerApi.validate(selectedRuleId, {
        nodes: nodes.map(({ id, type, name, position, config, next_nodes, branches }) => ({
          id,
          type,
          name,
          position,
          config,
          next_nodes,
          branches,
        })),
        edges: canvas?.edges ?? [],
        zoom: canvas?.zoom,
        offset: canvas?.offset,
      });
      setValidationErrors(res.data?.errors ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '校验画布失败');
    } finally {
      setValidating(false);
    }
  };

  const handleSyncToRule = async () => {
    if (!selectedRuleId) return;
    try {
      await automationDesignerApi.syncToRule(selectedRuleId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '同步到规则失败');
    }
  };

  const availableNodeTypes = useMemo<AutomationNodeType[]>(
    () => [
      'trigger',
      'workflow_action',
      'integration_action',
      'api_action',
      'lowcode_action',
      'notification_action',
      'condition',
      'delay',
      'success_hook',
      'error_hook',
    ],
    []
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="h5">可视化编排</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={() => selectedRuleId && loadCanvas(selectedRuleId)}
            size="small"
            disabled={!selectedRuleId || loading}
          >
            重载
          </Button>
          <Button
            startIcon={<CheckIcon />}
            onClick={handleValidate}
            size="small"
            disabled={!selectedRuleId || validating || nodes.length === 0}
          >
            {validating ? '校验中…' : '校验'}
          </Button>
          <Button
            startIcon={<SaveIcon />}
            onClick={handleSave}
            size="small"
            variant="contained"
            disabled={!selectedRuleId || saving || nodes.length === 0}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          label="选择规则"
          value={selectedRuleId}
          onChange={(e) => setSelectedRuleId(e.target.value)}
          size="small"
          sx={{ minWidth: 300 }}
        >
          <MenuItem value="">
            <em>请选择</em>
          </MenuItem>
          {rules.map((r) => (
            <MenuItem key={r.id} value={r.id}>
              {r.name} ({r.code})
            </MenuItem>
          ))}
        </TextField>
        <Button
          size="small"
          onClick={handleSyncToRule}
          disabled={!selectedRuleId}
          variant="outlined"
        >
          同步到规则
        </Button>
      </Stack>

      {validationErrors.length > 0 && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'warning.lighter' }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <AlertIcon size={16} />
            <Typography variant="subtitle2">校验结果</Typography>
          </Stack>
          {validationErrors.map((e, idx) => (
            <Typography
              key={idx}
              variant="body2"
              color={e.severity === 'error' ? 'error.main' : 'warning.main'}
            >
              [{e.severity}] {e.node_id ? `[${e.node_id}] ` : ''}
              {e.message}
            </Typography>
          ))}
        </Paper>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : !selectedRuleId ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">请先选择一个规则以加载或创建画布</Typography>
        </Paper>
      ) : (
        <Box>
          <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {availableNodeTypes.map((t) => (
                <Button
                  key={t}
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddNode(t)}
                >
                  {NODE_TYPE_LABEL[t]}
                </Button>
              ))}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, minHeight: 400 }}>
            {nodes.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                画布为空，请从上方添加节点
              </Typography>
            ) : (
              <Stack spacing={1}>
                {nodes.map((node) => (
                  <Paper
                    key={node.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      borderStyle: node.isNew ? 'dashed' : 'solid',
                    }}
                  >
                    <Chip
                      size="small"
                      color={NODE_TYPE_COLOR[node.type]}
                      label={NODE_TYPE_LABEL[node.type]}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {node.name}
                      {node.isNew && (
                        <Typography component="span" color="warning.main" sx={{ ml: 1 }}>
                          (未保存)
                        </Typography>
                      )}
                    </Typography>
                    <Button size="small" onClick={() => setEditNode(node)}>
                      编辑
                    </Button>
                    <IconButton size="small" color="error" onClick={() => handleDeleteNode(node.id)}>
                      <DeleteIcon size={18} />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Box>
      )}

      <NodeEditDialog
        node={editNode}
        onClose={() => setEditNode(null)}
        onSave={handleSaveNode}
      />
    </Box>
  );
};

const NodeEditDialog: React.FC<{
  node: DesignerNodeItem | null;
  onClose: () => void;
  onSave: (node: DesignerNodeItem) => void;
}> = ({ node, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [configText, setConfigText] = useState('{}');
  const [nextNodes, setNextNodes] = useState('');

  useEffect(() => {
    if (node) {
      setName(node.name);
      setConfigText(JSON.stringify(node.config ?? {}, null, 2));
      setNextNodes((node.next_nodes ?? []).join(','));
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configText);
    } catch {
      // keep empty config
    }
    onSave({
      ...node,
      name,
      config,
      next_nodes: nextNodes ? nextNodes.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <Dialog open={Boolean(node)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>编辑节点</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="节点名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label="节点配置（JSON）"
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            fullWidth
            multiline
            rows={6}
          />
          <TextField
            label="下游节点 ID（逗号分隔）"
            value={nextNodes}
            onChange={(e) => setNextNodes(e.target.value)}
            fullWidth
            helperText="多个节点用英文逗号分隔"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutomationDesignerPage;
