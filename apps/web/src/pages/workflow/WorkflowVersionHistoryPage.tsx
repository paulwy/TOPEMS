import {
  Card,
  CardContent,
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
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  GitBranch,
  Plus,
  User,
  CheckCircle,
  RotateCcw,
  Trash2,
  Loader2,
  Calendar,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import type { Workflow, WorkflowVersion } from '@/api/workflow';
import { workflowApi } from '@/api/workflow';
import { useNotificationStore } from '../../store';
import { apiLogger } from '@/utils/logger';
import { WORKFLOW_PATHS } from '@/modules/workflow/config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

const FlowVersionHistoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
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
      apiLogger.error(i18n.t('pages.workflow_version_history_page.k0'), {
        workflowError: workflowQuery.error,
        versionsError: versionsQuery.error,
      });
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k0'),
        message: i18n.t('pages.workflow_version_history_page.k1'),
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

  const invalidateVersionQueries = () => {
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
  };

  const createVersionMutation = useMutation({
    mutationFn: async (data: { version: string; change_description: string }) => {
      const wfResponse = await workflowApi.getWorkflow(id!);
      if (!wfResponse.success || !wfResponse.data) {
        throw new Error(i18n.t('pages.workflow_version_history_page.k2'));
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
        title: i18n.t('pages.workflow_version_history_page.k3'),
        message: i18n.t('pages.workflow_version_history_page.k4'),
        type: 'success',
      });
      setShowCreateModal(false);
      setCreateForm({ version: '', change_description: '' });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_version_history_page.k1'), err);
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k5'),
        message: i18n.t('pages.workflow_version_history_page.k6'),
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
        title: i18n.t('pages.workflow_version_history_page.k7'),
        message: i18n.t('pages.workflow_version_history_page.k8'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_version_history_page.k2'), err);
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k9'),
        message: i18n.t('pages.workflow_version_history_page.k10'),
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
        title: i18n.t('pages.workflow_version_history_page.k11'),
        message: i18n.t('pages.workflow_version_history_page.k12'),
        type: 'success',
      });
      setShowRollbackModal(false);
      setSelectedVersion(null);
      setRollbackForm({ reason: '' });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_version_history_page.k3'), err);
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k14'),
        message: i18n.t('pages.workflow_version_history_page.k13'),
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
        title: i18n.t('pages.workflow_version_history_page.k15'),
        message: i18n.t('pages.workflow_version_history_page.k16'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.workflow_version_history_page.k4'), err);
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k17'),
        message: i18n.t('pages.workflow_version_history_page.k18'),
        type: 'error',
      });
    },
  });

  const actionLoading =
    createVersionMutation.isPending ||
    activateVersionMutation.isPending ||
    rollbackMutation.isPending ||
    deleteVersionMutation.isPending;

  const handleCreateVersion = () => {
    if (!id || !createForm.version.trim()) {
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k20'),
        message: i18n.t('pages.workflow_version_history_page.k19'),
        type: 'info',
      });
      return;
    }

    createVersionMutation.mutate({
      version: createForm.version,
      change_description: createForm.change_description,
    });
  };

  const handleActivateVersion = (version: WorkflowVersion) => {
    if (!id) return;
    activateVersionMutation.mutate(version.id);
  };

  const handleRollback = () => {
    if (!id || !selectedVersion) return;
    rollbackMutation.mutate({
      to_version: selectedVersion.version,
      reason: rollbackForm.reason,
    });
  };

  const handleDeleteVersion = (version: WorkflowVersion) => {
    if (!id || version.isactive) {
      addNotification({
        title: i18n.t('pages.workflow_version_history_page.k21'),
        message: i18n.t('pages.workflow_version_history_page.k22'),
        type: 'info',
      });
      return;
    }

    if (!confirm(i18n.t('pages.workflow_version_history_page.k23'))) return;

    deleteVersionMutation.mutate(version.id);
  };

  const handleCompare = (_version1: string, _version2: string) => {
    navigate(WORKFLOW_PATHS.definitions);
  };

  const headerActions = useMemo(
    () => [
      {
        label: i18n.t('pages.workflow_version_history_page.k24'),
        icon: <Plus size={18} />,
        onClick: () => setShowCreateModal(true),
        variant: 'contained' as const,
        color: 'secondary' as const,
      },
    ],
    []
  );

  return (
    <PageContainer
      title={i18n.t('pages.workflow_version_history_page.k25')}
      subtitle={workflow?.name}
      loading={loading}
      headerProps={{
        pageIcon: <GitBranch size={24} />,
        pageColor: 'secondary.main',
        backButton: {
          href: '/flow/definitions',
        },
        actions: headerActions,
      }}
    >
      {/* Version Timeline */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('pages.workflow_version_history_page.k5')}
          </Typography>

          {versions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <GitBranch
                size={64}
                style={{
                  color: theme.palette.grey[300],
                  marginLeft: 'auto',
                  marginRight: 'auto',
                  marginBottom: 16,
                }}
              />
              <Typography sx={{ color: 'grey.500' }}>
                {i18n.t('pages.workflow_version_history_page.k26')}
              </Typography>
              <Button
                onClick={() => setShowCreateModal(true)}
                variant='contained'
                sx={{ mt: 2, bgcolor: 'secondary.main' }}
              >
                {i18n.t('pages.workflow_version_history_page.k6')}
              </Button>
            </Box>
          ) : (
            <Stack spacing={2}>
              {versions.map((version, index) => (
                <Box
                  key={version.id}
                  sx={{
                    border: 1,
                    borderColor: version.isactive ? 'secondary.main' : 'divider',
                    borderRadius: 1,
                    p: 2,
                    bgcolor: version.isactive ? 'secondary.50' : 'transparent',
                  }}
                >
                  <Stack
                    direction='row'
                    sx={{
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Stack
                      direction='row'
                      spacing={2}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: version.isactive ? 'secondary.main' : 'grey.100',
                          color: version.isactive ? 'white' : 'grey.600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {version.isactive ? (
                          <CheckCircle size={20} />
                        ) : (
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 700 }}
                          >
                            {index + 1}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center', mb: 0.5 }}
                        >
                          <Typography
                            variant='h6'
                            sx={{ fontWeight: 600 }}
                          >
                            v{version.version}
                          </Typography>
                          {version.isactive && (
                            <Chip
                              label={i18n.t('pages.workflow_version_history_page.k27')}
                              size='small'
                              sx={{ bgcolor: 'secondary.main', color: 'common.white' }}
                            />
                          )}
                        </Stack>
                        {version.change_description && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mb: 1 }}
                          >
                            {version.change_description}
                          </Typography>
                        )}
                        <Stack
                          direction='row'
                          spacing={2}
                        >
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <User size={14} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {version.created_by ||
                                i18n.t('pages.workflow_version_history_page.k28')}
                            </Typography>
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={0.5}
                            sx={{ alignItems: 'center' }}
                          >
                            <Calendar size={14} />
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {new Date(version.created_at).toLocaleString()}
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      {!version.isactive && (
                        <>
                          <Tooltip title={i18n.t('pages.workflow_version_history_page.k29')}>
                            <IconButton
                              size='small'
                              onClick={() => {
                                setSelectedVersion(version);
                                setShowRollbackModal(true);
                              }}
                              sx={{ color: 'warning.main' }}
                              aria-label={i18n.t('pages.workflow_version_history_page.k30')}
                            >
                              <RotateCcw size={20} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('pages.workflow_version_history_page.k31')}>
                            <IconButton
                              size='small'
                              onClick={() => handleDeleteVersion(version)}
                              sx={{ color: 'error.main' }}
                              aria-label={i18n.t('pages.workflow_version_history_page.k32')}
                            >
                              <Trash2 size={20} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Button
                        size='small'
                        onClick={() => handleActivateVersion(version)}
                        disabled={version.isactive}
                        variant={version.isactive ? 'outlined' : 'contained'}
                        sx={version.isactive ? {} : { bgcolor: 'secondary.main' }}
                      >
                        {version.isactive
                          ? i18n.t('pages.workflow_version_history_page.k34')
                          : i18n.t('pages.workflow_version_history_page.k33')}
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Create Version Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <DialogTitle>{i18n.t('pages.workflow_version_history_page.k35')}</DialogTitle>
        <DialogContent>
          <Typography
            variant='body2'
            sx={{ mb: 2, color: 'text.secondary' }}
          >
            {i18n.t('pages.workflow_version_history_page.k7')}
          </Typography>
          <Stack spacing={2}>
            <TextField
              size='small'
              label={i18n.t('pages.workflow_version_history_page.k8')}
              value={createForm.version}
              onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
              placeholder={i18n.t('pages.workflow_version_history_page.101_9')}
              fullWidth
            />
            <TextField
              size='small'
              label={i18n.t('pages.workflow_version_history_page.k36')}
              value={createForm.change_description}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  change_description: e.target.value,
                })
              }
              placeholder={i18n.t('pages.workflow_version_history_page.k37')}
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
            {i18n.t('pages.workflow_version_history_page.k10')}
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
            {i18n.t('pages.workflow_version_history_page.k11')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rollback Modal */}
      <Dialog
        open={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
      >
        <DialogTitle>{i18n.t('pages.workflow_version_history_page.k0')}</DialogTitle>
        <DialogContent>
          {selectedVersion && (
            <>
              <Typography
                variant='body2'
                sx={{ mb: 1 }}
              >
                {i18n.t('pages.workflow_version_history_page.strongv_0')}
                {selectedVersion.version}
                {i18n.t('pages.workflow_version_history_page.strong_1')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('pages.workflow_version_history_page.k12')}
              </Typography>
            </>
          )}
          <TextField
            size='small'
            label={i18n.t('pages.workflow_version_history_page.k38')}
            value={rollbackForm.reason}
            onChange={(e) => setRollbackForm({ ...rollbackForm, reason: e.target.value })}
            placeholder={i18n.t('pages.workflow_version_history_page.k39')}
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
            {i18n.t('pages.workflow_version_history_page.k13')}
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
            {i18n.t('pages.workflow_version_history_page.k14')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FlowVersionHistoryPage;
