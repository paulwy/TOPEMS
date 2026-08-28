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
  Play as PlayArrowIcon,
  Square as StopIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lowcodeWorkflowsApi } from '@/api/lowcode';
import type { LowcodeWorkflow, LowcodeWorkflowTriggerType } from '@/api/lowcode';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';

const TRIGGER_TYPES: LowcodeWorkflowTriggerType[] = [
  'manual',
  'form_submit',
  'schedule',
  'event',
  'webhook',
];

const QUERY_KEY = ['lowcode', 'workflows'];

interface CreateForm {
  app_id: string;
  code: string;
  name: string;
  triggerType: LowcodeWorkflowTriggerType;
  description: string;
}

const INITIAL_FORM: CreateForm = {
  app_id: '',
  code: '',
  name: '',
  triggerType: 'manual',
  description: '',
};

export const WorkflowConfigPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);

  const workflowsQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await lowcodeWorkflowsApi.list({ page: 1, pageSize: 100 });
        return res.data?.items ?? [];
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k0'));
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateForm) => {
      await lowcodeWorkflowsApi.create({
        app_id: form.app_id,
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        trigger: { type: form.triggerType },
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k1'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await lowcodeWorkflowsApi.remove(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k2'));
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (wf: LowcodeWorkflow) => {
      if (wf.status === 'enabled') {
        await lowcodeWorkflowsApi.disable(wf.id);
      } else {
        await lowcodeWorkflowsApi.enable(wf.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k3'));
    },
  });

  const isMutating =
    createMutation.isPending || deleteMutation.isPending || toggleMutation.isPending;

  const handleCreate = useCallback(() => {
    if (!createForm.app_id || !createForm.code || !createForm.name) return;
    createMutation.mutate(createForm);
  }, [createForm, createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
    },
    [deleteMutation]
  );

  const columns: ColumnDef<LowcodeWorkflow>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('lowcode.workflow_config_page.k6'),
        render: (row) => <Typography>{row.name}</Typography>,
      },
      {
        id: 'code',
        label: t('lowcode.workflow_config_page.k7'),
        render: (row) => <Typography>{row.code}</Typography>,
      },
      {
        id: 'triggerType',
        label: t('lowcode.workflow_config_page.k8'),
        render: (row) => <Typography>{row.trigger?.type}</Typography>,
      },
      {
        id: 'nodesCount',
        label: t('lowcode.workflow_config_page.k9'),
        render: (row) => <Typography>{row.nodes?.length ?? 0}</Typography>,
      },
      {
        id: 'status',
        label: t('lowcode.workflow_config_page.k10'),
        render: (row) => (
          <Chip
            size='small'
            label={row.status}
            color={row.status === 'enabled' ? 'success' : 'default'}
          />
        ),
      },
    ],
    [t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('lowcode.workflow_config_page.e1'),
        icon: <AddIcon size={18} />,
        onClick: () => setCreateOpen(true),
        variant: 'contained' as const,
      },
    ],
    [t]
  );

  const renderRowActions = useCallback(
    (row: LowcodeWorkflow) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip
          title={
            row.status === 'enabled'
              ? t('lowcode.workflow_config_page.k15')
              : t('lowcode.workflow_config_page.k14')
          }
        >
          <span>
            <IconButton
              size='small'
              color={row.status === 'enabled' ? 'error' : 'success'}
              onClick={() => toggleMutation.mutate(row)}
              disabled={isMutating}
              aria-label={
                row.status === 'enabled'
                  ? t('lowcode.workflow_config_page.k13')
                  : t('lowcode.workflow_config_page.k12')
              }
            >
              {row.status === 'enabled' ? <StopIcon size={18} /> : <PlayArrowIcon size={18} />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('lowcode.workflow_config_page.k16')}>
          <span>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              disabled={isMutating}
              aria-label={t('lowcode.workflow_config_page.k16')}
            >
              <DeleteOutlineIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [t, handleDelete, toggleMutation, isMutating]
  );

  const displayError = error || (workflowsQuery.error as Error | null)?.message || null;

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
      <ListPageTemplate<LowcodeWorkflow>
        title={t('lowcode.workflow_config_page.k5')}
        subtitle={`${t('lowcode.workflow_config_page.e2')}${t('lowcode.workflow_config_page.e3')}`}
        columns={columns}
        data={workflowsQuery.data ?? []}
        loading={workflowsQuery.isLoading}
        actions={actions}
        renderRowActions={renderRowActions}
        emptyMessage={t('lowcode.workflow_config_page.e4')}
      />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('lowcode.workflow_config_page.k17')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('lowcode.workflow_config_page.id_18')}
              value={createForm.app_id}
              onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('lowcode.workflow_config_page.k19')}
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              fullWidth
              required
              helperText={t('lowcode.workflow_config_page.k20')}
            />
            <TextField
              label={t('lowcode.workflow_config_page.k21')}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('lowcode.workflow_config_page.k22')}
              value={createForm.triggerType}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  triggerType: e.target.value as LowcodeWorkflowTriggerType,
                })
              }
              select
              fullWidth
            >
              {TRIGGER_TYPES.map((triggerType) => (
                <MenuItem
                  key={triggerType}
                  value={triggerType}
                >
                  {triggerType}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={t('lowcode.workflow_config_page.k23')}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>
            {t('lowcode.workflow_config_page.k24')}
          </Button>
          <Button
            onClick={handleCreate}
            variant='contained'
            disabled={
              createMutation.isPending || !createForm.app_id || !createForm.code || !createForm.name
            }
          >
            {createMutation.isPending
              ? t('lowcode.app_list_page.r1')
              : t('lowcode.workflow_config_page.k25')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkflowConfigPage;
