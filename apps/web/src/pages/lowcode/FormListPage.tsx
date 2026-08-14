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
import { Plus as AddIcon, Trash2 as DeleteOutlineIcon, Eye as VisibilityIcon } from 'lucide-react';
import { lowcodeFormsApi } from '@/api/lowcode';
import type { LowcodeForm } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const FormListPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [forms, setForms] = useState<LowcodeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [previewForm, setPreviewForm] = useState<LowcodeForm | null>(null);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    code: '',
    name: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeFormsApi.list({ page: 1, pageSize: 100 });
      setForms(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_list_page.k0'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.app_id || !createForm.code || !createForm.name) return;
    setCreating(true);
    try {
      await lowcodeFormsApi.create({
        app_id: createForm.app_id,
        code: createForm.code,
        name: createForm.name,
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ app_id: '', code: '', name: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_list_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeFormsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_list_page.k2'));
    }
  };

  const handlePreview = async (id: string) => {
    try {
      const res = await lowcodeFormsApi.preview(id);
      setPreviewForm(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_list_page.k3'));
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await lowcodeFormsApi.publish(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.form_list_page.k4'));
    }
  };

  return (
    <PageContainer title={t('lowcode.form_list_page.k5')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.form_list_page.k6')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            新建表单
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
                  <TableCell>{t('lowcode.form_list_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.form_list_page.k8')}</TableCell>
                  <TableCell>{t('lowcode.form_list_page.k9')}</TableCell>
                  <TableCell>{t('lowcode.form_list_page.k10')}</TableCell>
                  <TableCell>{t('lowcode.form_list_page.k11')}</TableCell>
                  <TableCell align='right'>{t('lowcode.form_list_page.k12')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      暂无表单
                    </TableCell>
                  </TableRow>
                ) : (
                  forms.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{f.code}</TableCell>
                      <TableCell>{f.fields?.length ?? 0}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={f.status}
                          color={f.status === 'published' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>v{f.version}</TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handlePreview(f.id)}
                          aria-label={t('lowcode.form_list_page.k13')}
                          title={t('lowcode.form_list_page.k14')}
                        >
                          <VisibilityIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='success'
                          onClick={() => handlePublish(f.id)}
                          aria-label={t('lowcode.form_list_page.k15')}
                          title={t('lowcode.form_list_page.k16')}
                        >
                          <AddIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(f.id)}
                          aria-label={t('lowcode.form_list_page.k17')}
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
          <DialogTitle>{t('lowcode.form_list_page.k18')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('lowcode.form_list_page.id_19')}
                value={createForm.app_id}
                onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.form_list_page.k20')}
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                fullWidth
                required
                helperText={t('lowcode.form_list_page.k21')}
              />
              <TextField
                label={t('lowcode.form_list_page.k22')}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.form_list_page.k23')}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>{t('lowcode.form_list_page.k24')}</Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={creating || !createForm.app_id || !createForm.code || !createForm.name}
            >
              {creating ? '创建中…' : t('lowcode.form_list_page.k25')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!previewForm}
          onClose={() => setPreviewForm(null)}
          maxWidth='md'
          fullWidth
        >
          <DialogTitle>表单预览 · {previewForm?.name}</DialogTitle>
          <DialogContent>
            <Paper
              variant='outlined'
              sx={{ p: 2 }}
              component='pre'
            >
              {JSON.stringify(previewForm, null, 2)}
            </Paper>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewForm(null)}>{t('lowcode.form_list_page.k26')}</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default FormListPage;
