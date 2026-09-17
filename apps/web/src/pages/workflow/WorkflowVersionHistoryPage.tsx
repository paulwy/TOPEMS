import {
  Typography,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { GitBranch, Plus, User, RotateCcw, Trash2, Loader2, Calendar, Play } from 'lucide-react';
import type { Workflow, WorkflowVersion } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';

import { QUERY_KEYS } from '@/lib/reactQuery';

const FlowVersionHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<WorkflowVersion | null>(null);
  const [createForm, setCreateForm] = useState({
    version: '',
    change_description: '',
  });
  const [rollbackForm, setRollbackForm] = useState({
    reason: '',
  });

  const workflowQuery = useQuery<Workflow | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE, id],
    queryFn: async () => {
      if (!id) return null;
      const workflowResponse = await workflowApi.getWorkflow(id);
      if (workflowResponse.success && workflowResponse.data) {
        return workflowResponse.data as unknown as Workflow;
      }
      return null;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const workflow = workflowQuery.data ?? null;

  const versionsQuery = useQuery<WorkflowVersion[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_VERSIONS_BASE, id],
    queryFn: async () => {
      if (!id) return [];
      const versionsResponse = await workflowApi.getVersions(id);
      if (versionsResponse.success && versionsResponse.data) {
        const data = versionsResponse.data as unknown as
          WorkflowVersion[] | { items: WorkflowVersion[] };
        const versionList = Array.isArray(data) ? data : data.items || [];
        return versionList;
      }
      return [];
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const versions = versionsQuery.data ?? [];
  const loading = workflowQuery.isLoading || versionsQuery.isLoading;

  useEffect(() => {
    if (workflowQuery.isError || versionsQuery.isError) {
      apiLogger.error(i18n.t('workflow.workflow_version_history_page.k0'), {
        workflowError: workflowQuery.error,
        versionsError: versionsQuery.error,
      });
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k0'),
        message: i18n.t('workflow.workflow_version_history_page.k1'),
        type: 'error',
      });
    }
  }, [
    workflowQuery.isError,
    versionsQuery.isError,
    workflowQuery.error,
    versionsQuery.error,
    addNotification,
  ]);

  const invalidateVersionQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_VERSIONS_BASE, id],
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: [...QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE, id],
      exact: false,
      refetchType: 'active',
    });
  }, [id, queryClient]);

  const createVersionMutation = useMutation({
    mutationFn: async (data: { version: string; change_description: string }) => {
      const wfResponse = await workflowApi.getWorkflow(id!);
      if (!wfResponse.success || !wfResponse.data) {
        throw new Error(i18n.t('workflow.workflow_version_history_page.k2'));
      }
      const workflowData = wfResponse.data as unknown as Workflow;
      return workflowApi.createVersion(id!, {
        version: data.version,
        definition: workflowData.definition,
        change_description: data.change_description,
        created_by: 'current-user',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateVersionQueries();
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k3'),
        message: i18n.t('workflow.workflow_version_history_page.k4'),
        type: 'success',
      });
      setShowCreateModal(false);
      setCreateForm({ version: '', change_description: '' });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('workflow.workflow_version_history_page.k1'), err);
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k5'),
        message: i18n.t('workflow.workflow_version_history_page.k6'),
        type: 'error',
      });
    },
  });

  const activateVersionMutation = useMutation({
    mutationFn: (versionId: string) => workflowApi.activateVersion(id!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateVersionQueries();
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k7'),
        message: i18n.t('workflow.workflow_version_history_page.k8'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('workflow.workflow_version_history_page.k2'), err);
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k9'),
        message: i18n.t('workflow.workflow_version_history_page.k10'),
        type: 'error',
      });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: (data: { to_version: string; reason: string }) =>
      workflowApi.rollbackVersion(id!, {
        to_version: data.to_version,
        reason: data.reason,
        rolled_back_by: 'current-user',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateVersionQueries();
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k11'),
        message: i18n.t('workflow.workflow_version_history_page.k12'),
        type: 'success',
      });
      setShowRollbackModal(false);
      setSelectedVersion(null);
      setRollbackForm({ reason: '' });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('workflow.workflow_version_history_page.k3'), err);
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k14'),
        message: i18n.t('workflow.workflow_version_history_page.k13'),
        type: 'error',
      });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => workflowApi.deleteVersion(id!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.WORKFLOW_VERSION_WORKFLOW_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateVersionQueries();
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k15'),
        message: i18n.t('workflow.workflow_version_history_page.k16'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('workflow.workflow_version_history_page.k4'), err);
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k17'),
        message: i18n.t('workflow.workflow_version_history_page.k18'),
        type: 'error',
      });
    },
  });

  const actionLoading =
    createVersionMutation.isPending ||
    activateVersionMutation.isPending ||
    rollbackMutation.isPending ||
    deleteVersionMutation.isPending;

  const handleCreateVersion = useCallback(() => {
    if (!id || !createForm.version.trim()) {
      addNotification({
        title: i18n.t('workflow.workflow_version_history_page.k20'),
        message: i18n.t('workflow.workflow_version_history_page.k19'),
        type: 'info',
      });
      return;
    }

    createVersionMutation.mutate({
      version: createForm.version,
      change_description: createForm.change_description,
    });
  }, [id, createForm, createVersionMutation, addNotification]);

  const handleActivateVersion = useCallback(
    (version: WorkflowVersion) => {
      if (!id) return;
      activateVersionMutation.mutate(version.id);
    },
    [id, activateVersionMutation]
  );

  const handleRollback = useCallback(() => {
    if (!id || !selectedVersion) return;
    rollbackMutation.mutate({
      to_version: selectedVersion.version,
      reason: rollbackForm.reason,
    });
  }, [id, selectedVersion, rollbackForm, rollbackMutation]);

  const handleDeleteVersion = useCallback(
    (version: WorkflowVersion) => {
      if (!id || version.isactive) {
        addNotification({
          title: i18n.t('workflow.workflow_version_history_page.k21'),
          message: i18n.t('workflow.workflow_version_history_page.k22'),
          type: 'info',
        });
        return;
      }

      if (!confirm(i18n.t('workflow.workflow_version_history_page.k23'))) return;

      deleteVersionMutation.mutate(version.id);
    },
    [id, deleteVersionMutation, addNotification]
  );

  const openRollbackModal = useCallback((version: WorkflowVersion) => {
    setSelectedVersion(version);
    setShowRollbackModal(true);
  }, []);

  const columns: ColumnDef<WorkflowVersion>[] = useMemo(
    () => [
      {
        id: 'version',
        label: i18n.t('workflow.workflow_version_history_page.k8'),
        render: (row) => (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 600 }}
            >
              v{row.version}
            </Typography>
            {row.isactive && (
              <Chip
                label={i18n.t('workflow.workflow_version_history_page.k27')}
                size='small'
                sx={{
                  bgcolor: 'secondary.main',
                  color: 'common.white',
                }}
              />
            )}
          </Stack>
        ),
      },
      {
        id: 'change_description',
        label: i18n.t('workflow.workflow_version_history_page.k36'),
        render: (row) =>
          row.change_description ? (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {row.change_description}
            </Typography>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              -
            </Typography>
          ),
      },
      {
        id: 'created_by',
        label: i18n.t('workflow.workflow_version_history_page.k28'),
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <User size={14} />
            <Typography variant='body2'>
              {row.created_by || i18n.t('workflow.workflow_version_history_page.k28')}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('workflow.workflow_version_history_page.k40'),
        render: (row) => (
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Calendar size={14} />
            <Typography variant='body2'>{new Date(row.created_at).toLocaleString()}</Typography>
          </Stack>
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<WorkflowVersion>[] = useMemo(
    () => [
      {
        key: 'activate',
        label: i18n.t('workflow.workflow_version_history_page.k33'),
        icon: <Play size={18} />,
        color: 'secondary',
        onClick: (row) => handleActivateVersion(row),
        show: (row) => !row.isactive,
      },
      {
        key: 'rollback',
        label: i18n.t('workflow.workflow_version_history_page.k29'),
        icon: <RotateCcw size={18} />,
        color: 'warning',
        onClick: (row) => openRollbackModal(row),
        show: (row) => !row.isactive,
      },
      {
        key: 'delete',
        label: i18n.t('workflow.workflow_version_history_page.k31'),
        icon: <Trash2 size={18} />,
        color: 'error',
        onClick: (row) => handleDeleteVersion(row),
        show: (row) => !row.isactive,
      },
    ],
    [handleActivateVersion, openRollbackModal, handleDeleteVersion]
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('workflow.workflow_version_history_page.k24'),
        icon: <Plus size={18} />,
        onClick: () => setShowCreateModal(true),
        variant: 'contained' as const,
      },
    ],
    []
  );

  const footerContent = useMemo(
    () => (
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <GitBranch size={14} />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {i18n.t('workflow.workflow_version_history_page.k5')}: {versions.length}
        </Typography>
      </Box>
    ),
    [versions.length]
  );

  return (
    <>
      <ListPageTemplate<WorkflowVersion>
        title={i18n.t('workflow.workflow_version_history_page.k25')}
        subtitle={workflow?.name}
        backButton={{ href: '/flow/definitions' }}
        columns={columns}
        data={versions}
        loading={loading}
        actions={actions}
        rowActions={rowActions}
        footerContent={footerContent}
        emptyMessage={i18n.t('workflow.workflow_version_history_page.k26')}
      />

      {/* Create Version Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <DialogTitle>{i18n.t('workflow.workflow_version_history_page.k35')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            {i18n.t('workflow.workflow_version_history_page.k7')}
          </Typography>
          <Stack spacing={2}>
            <TextField
              size='small'
              label={i18n.t('workflow.workflow_version_history_page.k8')}
              value={createForm.version}
              onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
              placeholder={i18n.t('workflow.workflow_version_history_page.101_9')}
              fullWidth
            />
            <TextField
              size='small'
              label={i18n.t('workflow.workflow_version_history_page.k36')}
              value={createForm.change_description}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  change_description: e.target.value,
                })
              }
              placeholder={i18n.t('workflow.workflow_version_history_page.k37')}
              multiline
              rows={4}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            {i18n.t('workflow.workflow_version_history_page.k10')}
          </Button>
          <Button
            variant='contained'
            onClick={handleCreateVersion}
            disabled={actionLoading || !createForm.version.trim()}
            sx={{ bgcolor: 'secondary.main' }}
            startIcon={
              actionLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            {i18n.t('workflow.workflow_version_history_page.k11')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Modal */}
      <Dialog
        open={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
      >
        <DialogTitle>{i18n.t('workflow.workflow_version_history_page.k41')}</DialogTitle>
        <DialogContent>
          {selectedVersion && (
            <>
              <Typography
                variant='body2'
                sx={{ mb: 1 }}
              >
                {i18n.t('workflow.workflow_version_history_page.strongv_0')}
                {selectedVersion.version}
                {i18n.t('workflow.workflow_version_history_page.strong_1')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('workflow.workflow_version_history_page.k42')}
              </Typography>
            </>
          )}
          <TextField
            size='small'
            label={i18n.t('workflow.workflow_version_history_page.k38')}
            value={rollbackForm.reason}
            onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
            placeholder={i18n.t('workflow.workflow_version_history_page.k39')}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowRollbackModal(false);
              setSelectedVersion(null);
              setRollbackForm({ reason: '' });
            }}
          >
            {i18n.t('workflow.workflow_version_history_page.k10')}
          </Button>
          <Button
            variant='contained'
            onClick={handleRollback}
            disabled={actionLoading}
            sx={{ bgcolor: 'warning.main' }}
            startIcon={
              actionLoading ? (
                <Loader2
                  size={16}
                  className='animate-spin'
                />
              ) : undefined
            }
          >
            {i18n.t('workflow.workflow_version_history_page.k43')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FlowVersionHistoryPage;
