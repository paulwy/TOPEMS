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
  Play as PlayArrowIcon,
  Square as StopIcon,
} from 'lucide-react';
import { lowcodeWorkflowsApi } from '@/api/lowcode';
import type { LowcodeWorkflow, LowcodeWorkflowTriggerType } from '@/api/lowcode';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';

const TRIGGER_TYPES: LowcodeWorkflowTriggerType[] = [
  'manual',
  'form_submit',
  'schedule',
  'event',
  'webhook',
];

export const WorkflowConfigPage: React.FC = () => {
  const { t } = useTranslation('lowcode');
  const [workflows, setWorkflows] = useState<LowcodeWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    app_id: '',
    code: '',
    name: '',
    triggerType: 'manual' as LowcodeWorkflowTriggerType,
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await lowcodeWorkflowsApi.list({ page: 1, pageSize: 100 });
      setWorkflows(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k0'));
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
      await lowcodeWorkflowsApi.create({
        app_id: createForm.app_id,
        code: createForm.code,
        name: createForm.name,
        description: createForm.description || undefined,
        trigger: { type: createForm.triggerType },
      });
      setCreateOpen(false);
      setCreateForm({ app_id: '', code: '', name: '', triggerType: 'manual', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k1'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await lowcodeWorkflowsApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k2'));
    }
  };

  const handleToggle = async (wf: LowcodeWorkflow) => {
    try {
      if (wf.status === 'enabled') {
        await lowcodeWorkflowsApi.disable(wf.id);
      } else {
        await lowcodeWorkflowsApi.enable(wf.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('lowcode.workflow_config_page.k3'));
    }
  };

  return (
    <PageContainer title={t('lowcode.workflow_config_page.k4')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('lowcode.workflow_config_page.k5')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            新建工作流
          </Button>
        </Stack>

        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          低代码应用内嵌工作流（表单提交/定时/事件触发）。 与 BPM 审批流程（workflow
          模块）不同——本表用于数据/系统自动化。
        </Typography>

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
                  <TableCell>{t('lowcode.workflow_config_page.k6')}</TableCell>
                  <TableCell>{t('lowcode.workflow_config_page.k7')}</TableCell>
                  <TableCell>{t('lowcode.workflow_config_page.k8')}</TableCell>
                  <TableCell>{t('lowcode.workflow_config_page.k9')}</TableCell>
                  <TableCell>{t('lowcode.workflow_config_page.k10')}</TableCell>
                  <TableCell align='right'>{t('lowcode.workflow_config_page.k11')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      暂无工作流
                    </TableCell>
                  </TableRow>
                ) : (
                  workflows.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>{w.name}</TableCell>
                      <TableCell>{w.code}</TableCell>
                      <TableCell>{w.trigger?.type}</TableCell>
                      <TableCell>{w.nodes?.length ?? 0}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          label={w.status}
                          color={w.status === 'enabled' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          color={w.status === 'enabled' ? 'error' : 'success'}
                          onClick={() => handleToggle(w)}
                          aria-label={
                            w.status === 'enabled'
                              ? t('lowcode.workflow_config_page.k13')
                              : t('lowcode.workflow_config_page.k12')
                          }
                          title={
                            w.status === 'enabled'
                              ? t('lowcode.workflow_config_page.k15')
                              : t('lowcode.workflow_config_page.k14')
                          }
                        >
                          {w.status === 'enabled' ? (
                            <StopIcon size={18} />
                          ) : (
                            <PlayArrowIcon size={18} />
                          )}
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(w.id)}
                          aria-label={t('lowcode.workflow_config_page.k16')}
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
                {TRIGGER_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    value={t}
                  >
                    {t}
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
              disabled={creating || !createForm.app_id || !createForm.code || !createForm.name}
            >
              {creating ? '创建中…' : t('lowcode.workflow_config_page.k25')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default WorkflowConfigPage;
