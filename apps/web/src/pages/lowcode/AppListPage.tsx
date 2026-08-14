import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
} from 'lucide-react';
import { lowcodeAppsApi } from '@/api/lowcode';
import type { LowcodeApp } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const AppListPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [apps, setApps] = useState<LowcodeApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeAppsApi.list({ page: 1, pageSize: 50 });
      setApps(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.app_list_page.k0'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      await lowcodeAppsApi.create({
        name: createForm.name,
        code: createForm.code,
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ name: '', code: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.app_list_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeAppsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.app_list_page.k2'));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await lowcodeAppsApi.duplicate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.app_list_page.k3'));
    }
  };

  return (
    <PageContainer title={t('lowcode.app_list_page.k4')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.app_list_page.k5')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('lowcode.app_list_page.e1')}
          </Button>
        </Stack>

        {error && (
          <Typography
            color='error'
            variant='body2'
            sx={{ mb: 1 }}
          >
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('lowcode.app_list_page.k6')}</TableCell>
                  <TableCell>{t('lowcode.app_list_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.app_list_page.k8')}</TableCell>
                  <TableCell>{t('lowcode.app_list_page.k9')}</TableCell>
                  <TableCell>{t('lowcode.app_list_page.k10')}</TableCell>
                  <TableCell align='right'>{t('lowcode.app_list_page.k11')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {apps.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      {t('lowcode.app_list_page.e2')}
                    </TableCell>
                  </TableRow>
                ) : (
                  apps.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.name}</TableCell>
                      <TableCell>{app.code}</TableCell>
                      <TableCell>{app.status}</TableCell>
                      <TableCell>v{app.version}</TableCell>
                      <TableCell>{app.updated_at}</TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handleDuplicate(app.id)}
                          aria-label={t('lowcode.app_list_page.k12')}
                          title={t('lowcode.app_list_page.k13')}
                        >
                          <ContentCopyIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(app.id)}
                          aria-label={t('lowcode.app_list_page.k14')}
                          title={t('lowcode.app_list_page.k15')}
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

        <Dialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{t('lowcode.app_list_page.k16')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('lowcode.app_list_page.k17')}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.app_list_page.k18')}
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                fullWidth
                required
                helperText={t('lowcode.app_list_page.k19')}
              />
              <TextField
                label={t('lowcode.app_list_page.k20')}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>{t('lowcode.app_list_page.k21')}</Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={creating || !createForm.name || !createForm.code}
            >
              {creating ? t('lowcode.app_list_page.r1') : t('lowcode.app_list_page.k22')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AppListPage;
