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
import { Plus as AddIcon, Trash2 as DeleteOutlineIcon } from 'lucide-react';
import { lowcodeDataModelsApi } from '@/api/lowcode';
import type { LowcodeDataModel } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

export const DataModelListPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [models, setModels] = useState<LowcodeDataModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    model_name: '',
    label: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeDataModelsApi.list({ page: 1, pageSize: 100 });
      setModels(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_model_list_page.k0'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.app_id || !createForm.model_name || !createForm.label) return;
    setCreating(true);
    try {
      await lowcodeDataModelsApi.create({
        app_id: createForm.app_id,
        model_name: createForm.model_name,
        label: createForm.label,
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      setCreateForm({ app_id: '', model_name: '', label: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_model_list_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeDataModelsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_model_list_page.k2'));
    }
  };

  return (
    <PageContainer title={t('lowcode.data_model_list_page.k3')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.data_model_list_page.k4')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('lowcode.data_model_list_page.e1')}
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
                  <TableCell>{t('lowcode.data_model_list_page.k5')}</TableCell>
                  <TableCell>{t('lowcode.data_model_list_page.k6')}</TableCell>
                  <TableCell>{t('lowcode.data_model_list_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.data_model_list_page.k8')}</TableCell>
                  <TableCell>{t('lowcode.data_model_list_page.k9')}</TableCell>
                  <TableCell align='right'>{t('lowcode.data_model_list_page.k10')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      {t('lowcode.data_model_list_page.e2')}
                    </TableCell>
                  </TableRow>
                ) : (
                  models.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.model_name}</TableCell>
                      <TableCell>{m.label}</TableCell>
                      <TableCell>{m.fields?.length ?? 0}</TableCell>
                      <TableCell>
                        {m.materialized
                          ? t('lowcode.data_model_list_page.k12')
                          : t('lowcode.data_model_list_page.k11')}
                      </TableCell>
                      <TableCell>{m.updated_at}</TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(m.id)}
                          aria-label={t('lowcode.data_model_list_page.k13')}
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
          <DialogTitle>{t('lowcode.data_model_list_page.k14')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('lowcode.data_model_list_page.id_15')}
                value={createForm.app_id}
                onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
                fullWidth
                required
                select
              >
                <MenuItem value=''>
                  <em>{t('lowcode.data_model_list_page.id_16')}</em>
                </MenuItem>
              </TextField>
              <TextField
                label={t('lowcode.data_model_list_page.k17')}
                value={createForm.model_name}
                onChange={(e) => setCreateForm({ ...createForm, model_name: e.target.value })}
                fullWidth
                required
                helperText='snake_case，如 leave_request'
              />
              <TextField
                label={t('lowcode.data_model_list_page.k18')}
                value={createForm.label}
                onChange={(e) => setCreateForm({ ...createForm, label: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.data_model_list_page.k19')}
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
              {t('lowcode.data_model_list_page.k20')}
            </Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={
                creating || !createForm.app_id || !createForm.model_name || !createForm.label
              }
            >
              {creating ? '创建中…' : t('lowcode.data_model_list_page.k21')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default DataModelListPage;
