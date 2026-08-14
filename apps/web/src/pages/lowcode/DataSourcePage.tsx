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
  Wifi as NetworkCheckIcon,
} from 'lucide-react';
import { lowcodeDataSourcesApi } from '@/api/lowcode';
import type { LowcodeDataSource, DataSourceType, DataSourceTestResult } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

const DS_TYPES: DataSourceType[] = ['mysql', 'postgres', 'sqlite', 'rest', 'mongodb', 'redis'];

export const DataSourcePage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [sources, setSources] = useState<LowcodeDataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    name: '',
    type: 'mysql' as DataSourceType,
    host: '',
    port: '3306',
    database: '',
    username: '',
    password: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeDataSourcesApi.list({ page: 1, pageSize: 100 });
      setSources(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k0'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.app_id || !createForm.name) return;
    setCreating(true);
    try {
      await lowcodeDataSourcesApi.create({
        app_id: createForm.app_id,
        name: createForm.name,
        type: createForm.type,
        config: {
          host: createForm.host || undefined,
          port: createForm.port ? Number(createForm.port) : undefined,
          database: createForm.database || undefined,
          username: createForm.username || undefined,
          password: createForm.password || undefined,
        },
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeDataSourcesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k2'));
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await lowcodeDataSourcesApi.testById(id);
      setTestResult(res.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.data_source_page.k3'));
    } finally {
      setTesting(null);
    }
  };

  return (
    <PageContainer title={t('lowcode.data_source_page.k4')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.data_source_page.k5')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('lowcode.data_source_page.e1')}
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
                  <TableCell>{t('lowcode.data_source_page.k6')}</TableCell>
                  <TableCell>{t('lowcode.data_source_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.data_source_page.r1')}</TableCell>
                  <TableCell>{t('lowcode.data_source_page.k8')}</TableCell>
                  <TableCell align='right'>{t('lowcode.data_source_page.k9')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sources.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      {t('lowcode.data_source_page.e2')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sources.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.type}</TableCell>
                      <TableCell>
                        {s.config.host}
                        {s.config.database ? ` / ${s.config.database}` : ''}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={s.status}
                          color={
                            s.status === 'connected'
                              ? 'success'
                              : s.status === 'error'
                                ? 'error'
                                : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handleTest(s.id)}
                          disabled={testing === s.id}
                          aria-label={t('lowcode.data_source_page.k10')}
                          title={t('lowcode.data_source_page.k11')}
                        >
                          <NetworkCheckIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(s.id)}
                          aria-label={t('lowcode.data_source_page.k12')}
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

        {testResult && (
          <Paper
            variant='outlined'
            sx={{ p: 2, mt: 2 }}
          >
            <Typography variant='body2'>
              测试结果：{testResult.success ? '✅ 成功' : '❌ 失败'} · {testResult.message}
              {testResult.latency_ms ? ` · ${testResult.latency_ms}ms` : ''}
            </Typography>
          </Paper>
        )}

        <Dialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
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
                {DS_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    value={t}
                  >
                    {t}
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
            <Button onClick={() => setCreateOpen(false)}>
              {t('lowcode.data_source_page.k23')}
            </Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={creating || !createForm.app_id || !createForm.name}
            >
              {creating ? t('lowcode.app_list_page.r1') : t('lowcode.data_source_page.k24')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default DataSourcePage;
