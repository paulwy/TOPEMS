import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  Typography,
} from '@mui/material';
import { FolderKanban, UserPlus, UserMinus, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { pdmProjectSchema } from '@/schemas/pdm';
import {
  projectApi,
  type PdmProject,
  type ProjectMember,
  type ProjectPhase,
  type CreatePdmProjectRequest,
} from '@/api/pdm/project';
import { designTokens } from '@/theme/tokens';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  planning: 'warning',
  active: 'success',
  on_hold: 'warning',
  completed: 'primary',
  cancelled: 'error',
};

const PHASE_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  initiation: 'default',
  planning: 'warning',
  execution: 'primary',
  monitoring: 'success',
  closing: 'secondary',
};

const MEMBER_ROLE_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  manager: 'success',
  developer: 'primary',
  reviewer: 'warning',
  viewer: 'default',
};

const STATUS_OPTIONS = [
  { label: i18n.t('pdm.pdm_project_page.k0'), value: 'planning' },
  { label: i18n.t('pdm.pdm_project_page.k1'), value: 'active' },
  { label: i18n.t('pdm.pdm_project_page.k2'), value: 'on_hold' },
  { label: i18n.t('pdm.pdm_project_page.k3'), value: 'completed' },
  { label: i18n.t('pdm.pdm_project_page.k4'), value: 'cancelled' },
];

const PHASE_OPTIONS = [
  { label: i18n.t('pdm.pdm_project_page.k5'), value: 'initiation' },
  { label: i18n.t('pdm.pdm_project_page.k6'), value: 'planning' },
  { label: i18n.t('pdm.pdm_project_page.k7'), value: 'execution' },
  { label: i18n.t('pdm.pdm_project_page.k8'), value: 'monitoring' },
  { label: i18n.t('pdm.pdm_project_page.k9'), value: 'closing' },
];

const MEMBER_ROLE_OPTIONS = [
  { label: i18n.t('pdm.pdm_project_page.k10'), value: 'manager' },
  { label: i18n.t('pdm.pdm_project_page.k11'), value: 'developer' },
  { label: i18n.t('pdm.pdm_project_page.k12'), value: 'reviewer' },
  { label: i18n.t('pdm.pdm_project_page.k13'), value: 'viewer' },
];

const PdmProjectPage: React.FC = () => {
  const { t } = useTranslation('pdm');
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: QUERY_KEYS.PDM.PROJECT_MEMBERS(selectedProjectId || ''),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await projectApi.listMembers(selectedProjectId);
      if (response.success && response.data) {
        return response.data as ProjectMember[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedProjectId,
  });

  const { data: phases = [] } = useQuery({
    queryKey: QUERY_KEYS.PDM.PROJECT_PHASES(selectedProjectId || ''),
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const response = await projectApi.listPhases(selectedProjectId);
      if (response.success && response.data) {
        return response.data as ProjectPhase[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!selectedProjectId,
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      projectApi.removeMember(projectId, userId),
    onSuccess: (_data, variables) => {
      addNotification({
        title: t('pdm.pdm_project_page.k15'),
        message: t('pdm.pdm_project_page.k14'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.PROJECT_MEMBERS(variables.projectId),

        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.pdm_project_page.k17'),
        message: t('pdm.pdm_project_page.k16'),
        type: 'error',
      });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (data: {
      project_id: string;
      user_id: string;
      role: 'manager' | 'developer' | 'reviewer' | 'viewer';
    }) => projectApi.addMember(data),
    onSuccess: () => {
      addNotification({
        title: t('pdm.pdm_project_page.k19'),
        message: t('pdm.pdm_project_page.k18'),
        type: 'success',
      });
      setMemberDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PDM.PROJECT_MEMBERS(selectedProjectId || ''),

        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: t('pdm.pdm_project_page.k21'),
        message: t('pdm.pdm_project_page.k20'),
        type: 'error',
      });
    },
  });

  const handleViewProject = useCallback((row: Record<string, unknown>) => {
    setSelectedProjectId(row.id as string);
  }, []);

  const handleRemoveMember = useCallback(
    (projectId: string, userId: string) => {
      removeMemberMutation.mutate({ projectId, userId });
    },
    [removeMemberMutation]
  );

  const handleAddMember = useCallback(
    (user_id: string, role: 'manager' | 'developer' | 'reviewer' | 'viewer') => {
      if (!selectedProjectId) return;
      addMemberMutation.mutate({
        project_id: selectedProjectId,
        user_id,
        role,
      });
    },
    [selectedProjectId, addMemberMutation]
  );

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const response = await projectApi.list();
        if (response.success && response.data) {
          let items = response.data as PdmProject[];

          const search = params?.search as string | undefined;
          const statusFilter = params?.status as string | undefined;
          const phaseFilter = params?.phase as string | undefined;

          if (search) {
            const searchLower = search.toLowerCase();
            items = items.filter(
              (p) =>
                p.name.toLowerCase().includes(searchLower) ||
                p.project_no.toLowerCase().includes(searchLower) ||
                (p.description && p.description.toLowerCase().includes(searchLower))
            );
          }
          if (statusFilter && statusFilter !== 'all') {
            items = items.filter((p) => p.status === statusFilter);
          }
          if (phaseFilter && phaseFilter !== 'all') {
            items = items.filter((p) => p.phase === phaseFilter);
          }

          const total = items.length;
          const page = params?.page ?? 1;
          const pageSize = params?.pageSize ?? 10;
          const start = (page - 1) * pageSize;
          const pagedItems = items.slice(start, start + pageSize);

          return { data: pagedItems as unknown as Record<string, unknown>[], total };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await projectApi.create(data as unknown as CreatePdmProjectRequest);
        if (res.success && res.data) {
          return res.data as unknown as Record<string, unknown>;
        }
        throw new Error(res.message || t('pdm.pdm_project_page.k22'));
      },
      update: async (id, data) => {
        const res = await projectApi.update(id, data as Partial<CreatePdmProjectRequest>);
        if (res.success && res.data) {
          return res.data as unknown as Record<string, unknown>;
        }
        throw new Error(res.message || t('pdm.pdm_project_page.k23'));
      },
      delete: async (id) => {
        await projectApi.delete(id);
      },
    }),
    []
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: i18n.t('pdm.pdm_project_page.k24'),
        icon: <FolderKanban size={16} />,
        color: 'primary',
        onClick: handleViewProject,
      },
    ],
    [handleViewProject]
  );

  const statsContent = (rows: Record<string, unknown>[], _total: number) => {
    const totalCount = rows.length;
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const planningCount = rows.filter((r) => r.status === 'planning').length;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('pdm.pdm_project_page.e1')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {totalCount}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('pdm.pdm_batch_page.e3')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'success.main' }}
          >
            {activeCount}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {t('pdm.pdm_batch_page.e2')}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'warning.main' }}
          >
            {planningCount}
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderProjectDetail = () => {
    if (!selectedProjectId) {
      return (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <FolderKanban
            size={48}
            style={{ marginBottom: 16, opacity: 0.5 }}
          />
          <Box>{t('pdm.pdm_project_page.k25')}</Box>
        </Box>
      );
    }

    return (
      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Typography variant='h6'>{t('pdm.pdm_project_page.k26')}</Typography>
              <IconButton
                size='small'
                onClick={() => setMemberDialogOpen(true)}
                aria-label={t('pdm.pdm_project_page.k27')}
              >
                <UserPlus size={16} />
              </IconButton>
            </Box>
            <List dense>
              {members.map((member) => (
                <ListItem
                  key={member.id}
                  secondaryAction={
                    <IconButton
                      edge='end'
                      size='small'
                      onClick={() => handleRemoveMember(selectedProjectId, member.user_id)}
                      aria-label={t('pdm.pdm_project_page.k28')}
                    >
                      <UserMinus size={14} />
                    </IconButton>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                      {member.user_name?.charAt(0) || 'U'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={member.user_name || member.user_id}
                    secondary={MEMBER_ROLE_OPTIONS.find((r) => r.value === member.role)?.label}
                  />
                  <Chip
                    label={MEMBER_ROLE_OPTIONS.find((r) => r.value === member.role)?.label}
                    color={MEMBER_ROLE_COLORS[member.role] || 'default'}
                    size='small'
                  />
                </ListItem>
              ))}
              {members.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                  {t('pdm.pdm_project_page.k29')}
                </Box>
              )}
            </List>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant='h6'
              sx={{ mb: 2 }}
            >
              {t('pdm.pdm_project_page.e4')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {phases.map((phase) => (
                <Box
                  key={phase.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Chip
                    label={PHASE_OPTIONS.find((p) => p.value === phase.phase)?.label || phase.phase}
                    color={PHASE_COLORS[phase.phase] || 'default'}
                    size='small'
                  />
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {phase.name}
                  </Typography>
                  {phase.status === 'completed' && (
                    <CheckCircle
                      size={16}
                      color='success'
                    />
                  )}
                  <Chip
                    label={
                      phase.status === 'completed'
                        ? t('pdm.pdm_project_page.k30')
                        : phase.status === 'in_progress'
                          ? t('pdm.pdm_project_page.k31')
                          : t('pdm.pdm_project_page.k32')
                    }
                    color={
                      phase.status === 'completed'
                        ? 'success'
                        : phase.status === 'in_progress'
                          ? 'primary'
                          : 'default'
                    }
                    size='small'
                    variant='outlined'
                  />
                </Box>
              ))}
              {phases.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                  {t('pdm.pdm_project_page.k33')}
                </Box>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
    );
  };

  const renderMemberDialog = () => (
    <Dialog
      open={memberDialogOpen}
      onClose={() => setMemberDialogOpen(false)}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('pdm.pdm_project_page.k34')}</DialogTitle>
      <DialogContent>
        <AddMemberForm
          onSubmit={handleAddMember}
          onCancel={() => setMemberDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );

  const tabs = [
    {
      id: 'list',
      label: t('pdm.pdm_project_page.k35'),
      content: null as unknown as React.ReactNode,
    },
    {
      id: 'detail',
      label: t('pdm.pdm_project_page.k36'),
      content: renderProjectDetail(),
    },
  ];

  return (
    <PageContainer
      title={t('pdm.pdm_project_page.m1')}
      subtitle={t('pdm.pdm_project_page.k37')}
      headerProps={{
        pageIcon: <FolderKanban style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <CrudPage
        schema={pdmProjectSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        tabs={tabs}
        defaultTab='list'
      />

      {renderMemberDialog()}
    </PageContainer>
  );
};

interface AddMemberFormProps {
  onSubmit: (userId: string, role: 'manager' | 'developer' | 'reviewer' | 'viewer') => void;
  onCancel: () => void;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ onSubmit, onCancel }) => {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<'manager' | 'developer' | 'reviewer' | 'viewer'>('developer');
  const { t } = useTranslation();

  const handleSubmit = () => {
    if (!userId) return;
    onSubmit(userId, role);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
      <TextField
        label={t('pdm.pdm_project_page.m2')}
        fullWidth
        required
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />
      <FormControl fullWidth>
        <InputLabel>{t('pdm.pdm_project_page.k38')}</InputLabel>
        <Select
          label={t('pdm.pdm_project_page.k39')}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {MEMBER_ROLE_OPTIONS.map((option) => (
            <MenuItem
              key={option.value}
              value={option.value}
            >
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <DialogActions sx={{ px: 0 }}>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
        <Button
          variant='contained'
          onClick={handleSubmit}
          disabled={!userId}
        >
          {t('common.add')}
        </Button>
      </DialogActions>
    </Box>
  );
};

export default PdmProjectPage;
