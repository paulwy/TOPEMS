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
  Upload as PublishIcon,
  Home as HomeIcon,
} from 'lucide-react';
import { lowcodePagesApi } from '@/api/lowcode';
import type { LowcodePage, LowcodePageType } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

const PAGE_TYPES: LowcodePageType[] = [
  'list',
  'detail',
  'form',
  'dashboard',
  'custom',
  'external_link',
];

export const PageListPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [pages, setPages] = useState<LowcodePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    code: '',
    name: '',
    type: 'list' as LowcodePageType,
    route_path: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodePagesApi.list({ page: 1, pageSize: 100 });
      setPages(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_list_page.k0'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.app_id || !createForm.code || !createForm.name || !createForm.route_path)
      return;
    setCreating(true);
    try {
      await lowcodePagesApi.create({
        app_id: createForm.app_id,
        code: createForm.code,
        name: createForm.name,
        type: createForm.type,
        route_path: createForm.route_path,
      });
      setCreateOpen(false);
      setCreateForm({ app_id: '', code: '', name: '', type: 'list', route_path: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_list_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodePagesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_list_page.k2'));
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await lowcodePagesApi.publish(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_list_page.k3'));
    }
  };

  const handleSetHome = async (id: string) => {
    try {
      await lowcodePagesApi.setAsHome(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.page_list_page.k4'));
    }
  };

  return (
    <PageContainer title={t('lowcode.page_list_page.k5')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.page_list_page.k6')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('lowcode.page_list_page.e1')}
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
                  <TableCell>{t('lowcode.page_list_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.page_list_page.k8')}</TableCell>
                  <TableCell>{t('lowcode.page_list_page.k9')}</TableCell>
                  <TableCell>{t('lowcode.page_list_page.k10')}</TableCell>
                  <TableCell>{t('lowcode.page_list_page.k11')}</TableCell>
                  <TableCell align='right'>{t('lowcode.page_list_page.k12')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      {t('lowcode.page_list_page.e2')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pages.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        {p.is_home && (
                          <Box
                            component='span'
                            sx={{
                              color: 'primary.main',
                              mr: 0.5,
                              verticalAlign: 'middle',
                              display: 'inline-flex',
                            }}
                          >
                            <HomeIcon size={18} />
                          </Box>
                        )}
                        {p.name}
                      </TableCell>
                      <TableCell>{p.code}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell>{p.route_path}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={p.status}
                          color={p.status === 'published' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handleSetHome(p.id)}
                          aria-label={t('lowcode.page_list_page.k13')}
                          title={t('lowcode.page_list_page.k14')}
                          disabled={p.is_home}
                        >
                          <HomeIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='success'
                          onClick={() => handlePublish(p.id)}
                          aria-label={t('lowcode.page_list_page.k15')}
                          title={t('lowcode.page_list_page.k16')}
                        >
                          <PublishIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(p.id)}
                          aria-label={t('lowcode.page_list_page.k17')}
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
          <DialogTitle>{t('lowcode.page_list_page.k18')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('lowcode.page_list_page.id_19')}
                value={createForm.app_id}
                onChange={(e) => setCreateForm({ ...createForm, app_id: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.page_list_page.k20')}
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                fullWidth
                required
                helperText={t('lowcode.page_list_page.k21')}
              />
              <TextField
                label={t('lowcode.page_list_page.k22')}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('lowcode.page_list_page.k23')}
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm({ ...createForm, type: e.target.value as LowcodePageType })
                }
                select
                fullWidth
              >
                {PAGE_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    value={t}
                  >
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('lowcode.page_list_page.k24')}
                value={createForm.route_path}
                onChange={(e) => setCreateForm({ ...createForm, route_path: e.target.value })}
                fullWidth
                required
                helperText={t('lowcode.page_list_page.list_25')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>{t('lowcode.page_list_page.k26')}</Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={
                creating ||
                !createForm.app_id ||
                !createForm.code ||
                !createForm.name ||
                !createForm.route_path
              }
            >
              {creating ? t('lowcode.app_list_page.r1') : t('lowcode.page_list_page.k27')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default PageListPage;
