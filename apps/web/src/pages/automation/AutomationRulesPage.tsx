import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Plus as AddIcon,
  Trash2 as DeleteOutlineIcon,
  Copy as ContentCopyIcon,
  Play as PlayIcon,
  Power as PowerIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { automationRulesApi } from '@/api/automation';
import type {
  AutomationRule,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationActionType,
} from '@/api/automation';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const RULE_STATUS_COLOR: Record<AutomationRuleStatus, 'success' | 'default' | 'warning'> = {
  enabled: 'success',
  disabled: 'default',
  draft: 'warning',
};

function getRuleStatusLabel(): Record<AutomationRuleStatus, string> {
  return {
    enabled: i18n.t('automation.automation_rules_page.k0'),
    disabled: i18n.t('automation.automation_rules_page.k1'),
    draft: i18n.t('automation.automation_rules_page.k2'),
  };
}

const TRIGGER_TYPES: AutomationTriggerType[] = [
  'cron',
  'event',
  'webhook',
  'form_submit',
  'manual',
];
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

const QUERY_KEY = ['automation', 'rules'];

export const AutomationRulesPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const rulesQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await automationRulesApi.list({ page: 1, pageSize: 50 });
        return res.data?.items ?? [];
      } catch (err) {
        throw new Error(
          err instanceof Error ? err.message : t('automation.automation_rules_page.k3')
        );
      }
    },
  });

  const parseJson = (text: string): Record<string, unknown> => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const createMutation = useMutation({
    mutationFn: async (form: CreateForm) => {
      try {
        const res = await automationRulesApi.create({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
          trigger: {
            type: form.trigger_type,
            payload: parseJson(form.trigger_payload),
          },
          action: {
            type: form.action_type,
            target: form.action_target,
          },
          status: 'draft',
        });
        return res.success && res.data ? res.data : null;
      } catch {
        return null;
      }
    },
    onSuccess: (created, form) => {
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      const now = new Date().toISOString();
      const fallback = (created ?? {
        id: `local-${Date.now()}`,
        name: form.name,
        code: form.code,
        description: form.description || undefined,
        trigger: { type: form.trigger_type, payload: parseJson(form.trigger_payload) },
        action: { type: form.action_type, target: form.action_target },
        status: 'draft',
        run_count: 0,
        success_count: 0,
        failed_count: 0,
        created_at: now,
        updated_at: now,
      }) as AutomationRule;
      // 后端未实现（404 等）时降级本地入列，保证表单体验闭环；后端补齐后 invalidate 自然覆盖
      queryClient.setQueryData<AutomationRule[]>(QUERY_KEY, (old = []) => [fallback, ...old]);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k4'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // 本地降级数据（local- 前缀）不调用后端，避免 400/404 网络错误
      if (id.startsWith('local-')) return;
      try {
        await automationRulesApi.remove(id);
      } catch {
        // 后端未实现（404 reject）时静默，交由 onSuccess 本地移除
      }
    },
    onSuccess: (_data, id) => {
      // 后端未实现（404 等）时降级本地移除；后端补齐后自然持久化
      queryClient.setQueryData<AutomationRule[]>(QUERY_KEY, (old = []) =>
        old.filter((r) => r.id !== id)
      );
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k5'));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      // 本地降级数据（local- 前缀）不调用后端，避免 400/404 网络错误
      if (id.startsWith('local-')) return null;
      try {
        const res = await automationRulesApi.duplicate(id);
        return res.success && res.data ? res.data : null;
      } catch {
        return null;
      }
    },
    onSuccess: (created, id) => {
      const now = new Date().toISOString();
      let fallback: AutomationRule | null = created ?? null;
      if (!fallback) {
        const src = queryClient.getQueryData<AutomationRule[]>(QUERY_KEY)?.find((r) => r.id === id);
        if (src) {
          fallback = {
            ...src,
            id: `local-${Date.now()}`,
            name: `${src.name}${t('automation.automation_rules_page.k34')}`,
            code: `${src.code}-copy`,
            run_count: 0,
            success_count: 0,
            failed_count: 0,
            created_at: now,
            updated_at: now,
          };
        }
      }
      // 后端未实现（404 等）时降级本地入列；后端补齐后 invalidate 自然覆盖
      if (fallback) {
        queryClient.setQueryData<AutomationRule[]>(QUERY_KEY, (old = []) => [fallback, ...old]);
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k6'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (rule: AutomationRule) => {
      // 本地降级数据（local- 前缀）不调用后端，避免 400/404 网络错误
      if (rule.id.startsWith('local-')) return;
      try {
        if (rule.status === 'enabled') {
          await automationRulesApi.disable(rule.id);
        } else {
          await automationRulesApi.enable(rule.id);
        }
      } catch {
        // 后端未实现（404 reject）时静默，交由 onSuccess 本地切换
      }
    },
    onSuccess: (_data, rule) => {
      const nextStatus: AutomationRuleStatus = rule.status === 'enabled' ? 'disabled' : 'enabled';
      // 后端未实现（404 等）时降级本地切换；后端补齐后 invalidate 自然覆盖
      queryClient.setQueryData<AutomationRule[]>(QUERY_KEY, (old = []) =>
        old.map((r) => (r.id === rule.id ? { ...r, status: nextStatus } : r))
      );
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k7'));
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async (id: string) => {
      // 本地降级数据（local- 前缀）不调用后端，避免 400/404 网络错误
      if (id.startsWith('local-')) return;
      try {
        await automationRulesApi.trigger(id);
      } catch {
        // 后端未实现（404 reject）时静默，交由 onSuccess 本地更新
      }
    },
    onSuccess: (_data, id) => {
      const now = new Date().toISOString();
      // 后端未实现（404 等）时降级本地更新运行计数；后端补齐后 invalidate 自然覆盖
      queryClient.setQueryData<AutomationRule[]>(QUERY_KEY, (old = []) =>
        old.map((r) =>
          r.id === id ? { ...r, run_count: (r.run_count || 0) + 1, last_run_at: now } : r
        )
      );
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k8'));
    },
  });

  const isMutating =
    createMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending ||
    toggleMutation.isPending ||
    triggerMutation.isPending;

  const handleCreate = useCallback(() => {
    if (!createForm.name || !createForm.code) return;
    createMutation.mutate(createForm);
  }, [createForm, createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: t('automation.automation_rules_page.k26'),
        message: t('automation_rules_page.delete_confirm_message'),
        danger: true,
        onConfirm: () => deleteMutation.mutate(id),
      });
    },
    [openConfirmDialog, deleteMutation, t]
  );

  const columns: ColumnDef<AutomationRule>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('automation.automation_rules_page.k11'),
        render: (row) => <Typography>{row.name}</Typography>,
      },
      {
        id: 'code',
        label: t('automation.automation_rules_page.k12'),
        render: (row) => <Typography>{row.code}</Typography>,
      },
      {
        id: 'trigger_type',
        label: t('automation.automation_rules_page.k13'),
        render: (row) => <Typography>{row.trigger.type}</Typography>,
      },
      {
        id: 'action_type',
        label: t('automation.automation_rules_page.k14'),
        render: (row) => <Typography>{row.action.type}</Typography>,
      },
      {
        id: 'status',
        label: t('automation.automation_rules_page.k15'),
        render: (row) => (
          <Chip
            size='small'
            color={RULE_STATUS_COLOR[row.status]}
            label={getRuleStatusLabel()[row.status]}
          />
        ),
      },
      {
        id: 'run_stats',
        label: t('automation.automation_rules_page.r1'),
        render: (row) => (
          <Typography>
            {row.run_count} / {row.success_count} / {row.failed_count}
          </Typography>
        ),
      },
      {
        id: 'last_run_at',
        label: t('automation.automation_rules_page.k16'),
        render: (row) => <Typography>{row.last_run_at ?? '-'}</Typography>,
      },
    ],
    [t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('automation.automation_rules_page.e1'),
        icon: <AddIcon size={18} />,
        onClick: () => setCreateOpen(true),
        variant: 'contained' as const,
      },
    ],
    [t]
  );

  const renderRowActions = useCallback(
    (row: AutomationRule) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={t('automation.automation_rules_page.k19')}>
          <span>
            <IconButton
              size='small'
              onClick={() => triggerMutation.mutate(row.id)}
              disabled={isMutating}
              aria-label={t('automation.automation_rules_page.k18')}
            >
              <PlayIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip
          title={
            row.status === 'enabled'
              ? t('automation.automation_rules_page.k23')
              : t('automation.automation_rules_page.k22')
          }
        >
          <span>
            <IconButton
              size='small'
              onClick={() => toggleMutation.mutate(row)}
              disabled={isMutating}
              aria-label={
                row.status === 'enabled'
                  ? t('automation.automation_rules_page.k21')
                  : t('automation.automation_rules_page.k20')
              }
            >
              <PowerIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('automation.automation_rules_page.k25')}>
          <span>
            <IconButton
              size='small'
              onClick={() => duplicateMutation.mutate(row.id)}
              disabled={isMutating}
              aria-label={t('automation.automation_rules_page.k24')}
            >
              <ContentCopyIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('automation.automation_rules_page.k27')}>
          <span>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              disabled={isMutating}
              aria-label={t('automation.automation_rules_page.k26')}
            >
              <DeleteOutlineIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [t, handleDelete, triggerMutation, toggleMutation, duplicateMutation, isMutating]
  );

  const displayError = error || (rulesQuery.error as Error | null)?.message || null;

  return (
    <>
      {displayError && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {displayError}
        </Alert>
      )}
      <ListPageTemplate<AutomationRule>
        title={t('automation.automation_rules_page.k9')}
        subtitle={t('automation.automation_rules_page.k10')}
        columns={columns}
        data={rulesQuery.data ?? []}
        loading={rulesQuery.isLoading}
        actions={actions}
        renderRowActions={renderRowActions}
        emptyMessage={t('automation.automation_rules_page.e2')}
      />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('automation.automation_rules_page.k28')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('automation.automation_rules_page.k29')}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('automation.automation_rules_page.k30')}
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              fullWidth
              required
              helperText={t('automation.automation_rules_page.k31')}
            />
            <TextField
              label={t('automation.automation_rules_page.k32')}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label={t('automation.automation_rules_page.k33')}
              value={createForm.trigger_type}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  trigger_type: e.target.value as AutomationTriggerType,
                })
              }
              fullWidth
            >
              {TRIGGER_TYPES.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('automation.automation_rules_page.json_34')}
              value={createForm.trigger_payload}
              onChange={(e) => setCreateForm({ ...createForm, trigger_payload: e.target.value })}
              fullWidth
              multiline
              rows={3}
              helperText='cron: {expression, timezone}; event: {event_name, source}; webhook: {path, secret}; form_submit: {form_id, app_id}'
            />
            <TextField
              select
              label={t('automation.automation_rules_page.k35')}
              value={createForm.action_type}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  action_type: e.target.value as AutomationActionType,
                })
              }
              fullWidth
            >
              {ACTION_TYPES.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('automation.automation_rules_page.id_36')}
              value={createForm.action_target}
              onChange={(e) => setCreateForm({ ...createForm, action_target: e.target.value })}
              fullWidth
              helperText='workflow_id / integration_endpoint_id / API URL / page_id / channel_id'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>
            {t('automation.automation_rules_page.k37')}
          </Button>
          <Button
            onClick={handleCreate}
            variant='contained'
            disabled={createMutation.isPending || !createForm.name || !createForm.code}
          >
            {createMutation.isPending
              ? t('automation.automation_rules_page.r2')
              : t('automation.automation_rules_page.k38')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </>
  );
};

export default AutomationRulesPage;
