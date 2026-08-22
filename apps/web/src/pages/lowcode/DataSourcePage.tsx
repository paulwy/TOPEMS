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
  Wifi as NetworkCheckIcon,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { lowcodeDataSourcesApi } from '@/api/lowcode';
import type { LowcodeDataSource, DataSourceType, DataSourceTestResult } from '@/api/lowcode';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';

const DS_TYPES: DataSourceType[] = ['mysql', 'postgres', 'sqlite', 'rest', 'mongodb', 'redis'];
const QUERY_KEY = ['lowcode', 'dataSources'];

interface CreateForm {
  app_id: string;
  name: string;
  type: DataSourceType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  description: string;
}

const INITIAL_FORM: CreateForm = {
  app_id: '',
  name: '',
  type: 'mysql',
  host: '',
  port: '3306',
  database: '',
  username: '',
  password: '',
  description: '',
};

export const DataSourcePage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null);
  const [testResultOpen, setTestResultOpen] = useState(false);

  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const sourcesQuery = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await lowcodeDataSourcesApi.list({ page: 1, pageSize: 100 });
        return res.data?.items ?? [];
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : t('lowcode.data_source_page.k0'));
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: CreateForm) => {
      await lowcodeDataSourcesApi.create({
        app_id: form.app_id,
        name: form.name,
        type: form.type,
        config: {
          host: form.host || undefined,
          port: form.port ? Number(form.port) : undefined,
          database: form.database || undefined,
          username: form.username || undefined,
          password: form.password || undefined,
        },
        description: form.description || undefined,
      });
    },
    onSuccess: () => {
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k1'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await lowcodeDataSourcesApi.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k2'));
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await lowcodeDataSourcesApi.testById(id);
      return res.data ?? null;
    },
    onSuccess: (data) => {
      setTestResult(data);
      setTestResultOpen(true);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k3'));
    },
  });

  const isMutating = createMutation.isPending || deleteMutation.isPending || testMutation.isPending;

  const handleCreate = useCallback(() => {
    if (!createForm.app_id || !createForm.name) return;
    setError('');
    createMutation.mutate(createForm);
  }, [createForm, createMutation]);

  const handleDelete = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: t('lowcode.data_source_page.k12'),
        message: t('data_source_page.delete_confirm_message'),
        danger: true,
        onConfirm: () => {
          setError('');
          deleteMutation.mutate(id);
        },
      });
    },
    [openConfirmDialog, deleteMutation, t]
  );

  const handleCloseCreate = useCallback(() => {
    setCreateOpen(false);
    setCreateForm(INITIAL_FORM);
    setError('');
  }, []);

  const columns: ColumnDef<LowcodeDataSource>[] = useMemo(
    () => [
      {
        id: 'name',
        label: t('lowcode.data_source_page.k6'),
        render: (row) => <Typography>{row.name}</Typography>,
      },
      {
        id: 'type',
        label: t('lowcode.data_source_page.k7'),
        render: (row) => <Typography>{row.type}</Typography>,
      },
      {
        id: 'config',
        label: t('lowcode.data_source_page.r1'),
        render: (row) => (
          <Typography>
            {row.config.host}
            {row.config.database ? ` / ${row.config.database}` : ''}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('lowcode.data_source_page.k8'),
        render: (row) => (
          <Chip
            size='small'
            label={row.status}
            color={
              row.status === 'connected' ? 'success' : row.status === 'error' ? 'error' : 'default'
            }
          />
        ),
      },
    ],
    [t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('lowcode.data_source_page.e1'),
        icon: <AddIcon size={18} />,
        onClick: () => setCreateOpen(true),
        variant: 'contained' as const,
      },
    ],
    [t]
  );

  const renderRowActions = useCallback(
    (row: LowcodeDataSource) => (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title={t('lowcode.data_source_page.k11')}>
          <span>
            <IconButton
              size='small'
              onClick={() => {
                setError('');
                testMutation.mutate(row.id);
              }}
              disabled={isMutating}
              aria-label={t('lowcode.data_source_page.k10')}
            >
              <NetworkCheckIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('lowcode.data_source_page.k12')}>
          <span>
            <IconButton
              size='small'
              color='error'
              onClick={() => handleDelete(row.id)}
              disabled={isMutating}
              aria-label={t('lowcode.data_source_page.k12')}
            >
              <DeleteOutlineIcon size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    ),
    [t, isMutating, testMutation, handleDelete]
  );

  const displayError = error || (sourcesQuery.error as Error | null)?.message || null;

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
      <ListPageTemplate<LowcodeDataSource>
        title={t('lowcode.data_source_page.k4')}
        subtitle={t('lowcode.data_source_page.k5')}
        columns={columns}
        data={sourcesQuery.data ?? []}
        loading={sourcesQuery.isLoading}
        actions={actions}
        renderRowActions={renderRowActions}
        emptyMessage={t('lowcode.data_source_page.e2')}
      />

      <Dialog
        open={createOpen}
        onClose={handleCloseCreate}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('lowcode.data_source_page.k13')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('lowcode.data_source_page.id_14')}
              value={createForm.app_id}
              onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('lowcode.data_source_page.k15')}
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label={t('lowcode.data_source_page.k16')}
              value={createForm.type}
              onChange={(e) =>
                setCreateForm({ ...createForm, type: e.target.value as DataSourceType })
              }
              select
              fullWidth
            >
              {DS_TYPES.map((type) => (
                <MenuItem
                  key={type}
                  value={type}
                >
                  {type}
                </MenuItem>
              ))}
            </TextField>
            <Stack
              direction='row'
              spacing={2}
            >
              <TextField
                label={t('lowcode.data_source_page.k17')}
                value={createForm.host}
                onChange={(e) => setCreateForm({ ...createForm, host: e.target.value })}
                fullWidth
              />
              <TextField
                label={t('lowcode.data_source_page.k18')}
                value={createForm.port}
                onChange={(e) => setCreateForm({ ...createForm, port: e.target.value })}
                sx={{ width: 120 }}
              />
            </Stack>
            <TextField
              label={t('lowcode.data_source_page.k19')}
              value={createForm.database}
              onChange={(e) => setCreateForm({ ...createForm, database: e.target.value })}
              fullWidth
            />
            <Stack
              direction='row'
              spacing={2}
            >
              <TextField
                label={t('lowcode.data_source_page.k20')}
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                fullWidth
              />
              <TextField
                label={t('lowcode.data_source_page.k21')}
                type='password'
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                fullWidth
              />
            </Stack>
            <TextField
              label={t('lowcode.data_source_page.k22')}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreate}>{t('lowcode.data_source_page.k23')}</Button>
          <Button
            onClick={handleCreate}
            variant='contained'
            disabled={createMutation.isPending || !createForm.app_id || !createForm.name}
          >
            {createMutation.isPending
              ? t('lowcode.app_list_page.r1')
              : t('lowcode.data_source_page.k24')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={testResultOpen}
        onClose={() => setTestResultOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('lowcode.data_source_page.k11')}</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            {t('lowcode.data_source_page.e1', {
              v1: testResult?.success
                ? t('lowcode.data_source_page.m1')
                : t('lowcode.data_source_page.l1'),
              v2: testResult?.message,
            })}
            {testResult?.latency_ms ? ` · ${testResult.latency_ms}ms` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestResultOpen(false)}>
            {t('lowcode.data_source_page.k23')}
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

export default DataSourcePage;
