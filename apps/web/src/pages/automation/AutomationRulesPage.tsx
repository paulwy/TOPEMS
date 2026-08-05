import React, { useCallback, useEffect, useState } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Plus as AddIcon,
  Trash2 as DeleteOutlineIcon,
  Copy as ContentCopyIcon,
  Play as PlayIcon,
  Power as PowerIcon,
} from 'lucide-react';
import { automationRulesApi } from '@/api/automation';
import type {
  AutomationRule,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationActionType,
} from '@/api/automation';

const RULE_STATUS_COLOR: Record<AutomationRuleStatus, 'success' | 'default' | 'warning'> = {
  enabled: 'success',
  disabled: 'default',
  draft: 'warning',
};

const RULE_STATUS_LABEL: Record<AutomationRuleStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
  draft: '草稿',
};

const TRIGGER_TYPES: AutomationTriggerType[] = ['cron', 'event', 'webhook', 'form_submit', 'manual'];
const ACTION_TYPES: AutomationActionType[] = [
  'workflow',
  'integration',
  'api',
  'lowcode_page',
  'notification',
];

interface CreateForm {
  name: string;
  code: string;
  description: string;
  trigger_type: AutomationTriggerType;
  trigger_payload: string;
  action_type: AutomationActionType;
  action_target: string;
}

const INITIAL_FORM: CreateForm = {
  name: '',
  code: '',
  description: '',
  trigger_type: 'cron',
  trigger_payload: '{"expression":"0 8 * * *","timezone":"Asia/Shanghai"}',
  action_type: 'workflow',
  action_target: '',
};

export const AutomationRulesPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await automationRulesApi.list({ page: 1, pageSize: 50 });
      setRules(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载规则列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parseJson = (text: string): Record<string, unknown> => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      await automationRulesApi.create({
        name: createForm.name,
        code: createForm.code,
        description: createForm.description || undefined,
        trigger: {
          type: createForm.trigger_type,
          payload: parseJson(createForm.trigger_payload),
        },
        action: {
          type: createForm.action_type,
          target: createForm.action_target,
        },
        status: 'draft',
      });
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建规则失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await automationRulesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除规则失败');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await automationRulesApi.duplicate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '复制规则失败');
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    try {
      if (rule.status === 'enabled') {
        await automationRulesApi.disable(rule.id);
      } else {
        await automationRulesApi.enable(rule.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换规则状态失败');
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await automationRulesApi.trigger(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '手动触发失败');
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Typography variant="h5">自动化规则</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新建规则
        </Button>
      </Stack>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>规则名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>触发器</TableCell>
                <TableCell>动作</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>运行/成功/失败</TableCell>
                <TableCell>最近运行</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    暂无规则，点击右上角新建
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell>{rule.code}</TableCell>
                    <TableCell>{rule.trigger.type}</TableCell>
                    <TableCell>{rule.action.type}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        color={RULE_STATUS_COLOR[rule.status]}
                        label={RULE_STATUS_LABEL[rule.status]}
                      />
                    </TableCell>
                    <TableCell>
                      {rule.run_count} / {rule.success_count} / {rule.failed_count}
                    </TableCell>
                    <TableCell>{rule.last_run_at ?? '-'}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleTrigger(rule.id)}
                        title="手动触发"
                      >
                        <PlayIcon size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleToggle(rule)}
                        title={rule.status === 'enabled' ? '禁用' : '启用'}
                      >
                        <PowerIcon size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDuplicate(rule.id)}
                        title="复制"
                      >
                        <ContentCopyIcon size={18} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(rule.id)}
                        title="删除"
                      >
                        <DeleteOutlineIcon size={18} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新建自动化规则</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="规则名称"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="规则编码"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              fullWidth
              required
              helperText="规则唯一标识，创建后不可修改"
            />
            <TextField
              label="描述"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="触发器类型"
              value={createForm.trigger_type}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  trigger_type: e.target.value as AutomationTriggerType,
                })
              }
              fullWidth
            >
              {TRIGGER_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="触发器载荷（JSON）"
              value={createForm.trigger_payload}
              onChange={(e) =>
                setCreateForm({ ...createForm, trigger_payload: e.target.value })
              }
              fullWidth
              multiline
              rows={3}
              helperText="cron: {expression, timezone}; event: {event_name, source}; webhook: {path, secret}; form_submit: {form_id, app_id}"
            />
            <TextField
              select
              label="动作类型"
              value={createForm.action_type}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  action_type: e.target.value as AutomationActionType,
                })
              }
              fullWidth
            >
              {ACTION_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="动作目标 ID"
              value={createForm.action_target}
              onChange={(e) =>
                setCreateForm({ ...createForm, action_target: e.target.value })
              }
              fullWidth
              helperText="workflow_id / integration_endpoint_id / API URL / page_id / channel_id"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>取消</Button>
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating || !createForm.name || !createForm.code}
          >
            {creating ? '创建中…' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationRulesPage;
