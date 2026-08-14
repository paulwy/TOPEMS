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
  Trash2 as DeleteIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Key as KeyIcon,
} from 'lucide-react';
import { automationVariablesApi } from '@/api/automation';
import type { AutomationVariable, AutomationVariableScope } from '@/api/automation';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const SCOPE_LABEL: Record<AutomationVariableScope, string> = {
  global: i18n.t('automation.automation_variables_page.k0'),
  workspace: i18n.t('automation.automation_variables_page.k1'),
  rule: i18n.t('automation.automation_variables_page.k2'),
};

const SCOPE_COLOR: Record<AutomationVariableScope, 'error' | 'warning' | 'info'> = {
  global: 'error',
  workspace: 'warning',
  rule: 'info',
};

interface CreateForm {
  key: string;
  value: string;
  scope: AutomationVariableScope;
  is_secret: boolean;
  rule_id: string;
  description: string;
}

const INITIAL_FORM: CreateForm = {
  key: '',
  value: '',
  scope: 'global',
  is_secret: false,
  rule_id: '',
  description: '',
};

export const AutomationVariablesPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const [variables, setVariables] = useState<AutomationVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await automationVariablesApi.list({ page: 1, pageSize: 100 });
      setVariables(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_variables_page.k3'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!createForm.key) return;
    setCreating(true);
    try {
      await automationVariablesApi.create({
        key: createForm.key,
        value: createForm.value,
        scope: createForm.scope,
        is_secret: createForm.is_secret,
        rule_id: createForm.scope === 'rule' ? createForm.rule_id : undefined,
        description: createForm.description || undefined,
      });
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_variables_page.k4'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await automationVariablesApi.remove(key);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_variables_page.k5'));
    }
  };

  const handleReveal = async (key: string) => {
    if (revealedKeys[key]) {
      // 已解密，切换为 mask
      const { [key]: _removed, ...rest } = revealedKeys;
      setRevealedKeys(rest);
      return;
    }
    setRevealing(key);
    try {
      const res = await automationVariablesApi.reveal(key);
      if (res.data) {
        setRevealedKeys((prev) => ({ ...prev, [key]: res.data.value }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_variables_page.k6'));
    } finally {
      setRevealing(null);
    }
  };

  const maskValue = (v: string) => '•'.repeat(Math.min(v.length, 12) || 8);

  return (
    <PageContainer title={t('automation.automation_variables_page.k7')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('automation.automation_variables_page.k8')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('automation.automation_variables_page.e1')}
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
                  <TableCell>{t('automation.automation_variables_page.k9')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.e2')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.k10')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.k11')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.id_12')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.k13')}</TableCell>
                  <TableCell>{t('automation.automation_variables_page.k14')}</TableCell>
                  <TableCell align='right'>
                    {t('automation.automation_variables_page.k15')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {variables.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      {t('automation.automation_variables_page.e3')}
                    </TableCell>
                  </TableRow>
                ) : (
                  variables.map((v) => {
                    const revealed = revealedKeys[v.key];
                    return (
                      <TableRow key={v.key}>
                        <TableCell>
                          <Stack
                            direction='row'
                            spacing={1}
                            sx={{ alignItems: 'center' }}
                          >
                            {v.is_secret && <KeyIcon size={14} />}
                            <code>{v.key}</code>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {v.is_secret ? (
                            <Stack
                              direction='row'
                              spacing={1}
                              sx={{ alignItems: 'center' }}
                            >
                              <code>{revealed ?? maskValue(v.value)}</code>
                              <IconButton
                                size='small'
                                onClick={() => handleReveal(v.key)}
                                disabled={revealing === v.key}
                                aria-label={
                                  revealed
                                    ? t('automation.automation_variables_page.k17')
                                    : t('automation.automation_variables_page.k16')
                                }
                                title={
                                  revealed
                                    ? t('automation.automation_variables_page.k19')
                                    : t('automation.automation_variables_page.k18')
                                }
                              >
                                {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                              </IconButton>
                            </Stack>
                          ) : (
                            <code>{v.value}</code>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size='small'
                            color={SCOPE_COLOR[v.scope]}
                            label={SCOPE_LABEL[v.scope]}
                          />
                        </TableCell>
                        <TableCell>
                          {v.is_secret
                            ? t('automation.automation_variables_page.k21')
                            : t('automation.automation_variables_page.k20')}
                        </TableCell>
                        <TableCell>{v.rule_id ?? '-'}</TableCell>
                        <TableCell>{v.description ?? '-'}</TableCell>
                        <TableCell>{v.updated_at}</TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleDelete(v.key)}
                            aria-label={t('automation.automation_variables_page.k22')}
                            title={t('automation.automation_variables_page.k23')}
                          >
                            <DeleteIcon size={18} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
          <DialogTitle>{t('automation.automation_variables_page.k24')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('automation.automation_variables_page.key_25')}
                value={createForm.key}
                onChange={(e) => setCreateForm({ ...createForm, key: e.target.value })}
                fullWidth
                required
                helperText='变量名唯一，建议大写+下划线，如 API_KEY'
              />
              <TextField
                label={t('automation.automation_variables_page.k26')}
                value={createForm.value}
                onChange={(e) => setCreateForm({ ...createForm, value: e.target.value })}
                fullWidth
                multiline
                rows={2}
                type={createForm.is_secret ? 'password' : 'text'}
              />
              <TextField
                select
                label={t('automation.automation_variables_page.k27')}
                value={createForm.scope}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    scope: e.target.value as AutomationVariableScope,
                  })
                }
                fullWidth
              >
                <MenuItem value='global'>{t('automation.automation_variables_page.k28')}</MenuItem>
                <MenuItem value='workspace'>
                  {t('automation.automation_variables_page.k29')}
                </MenuItem>
                <MenuItem value='rule'>{t('automation.automation_variables_page.k30')}</MenuItem>
              </TextField>
              {createForm.scope === 'rule' && (
                <TextField
                  label={t('automation.automation_variables_page.id_31')}
                  value={createForm.rule_id}
                  onChange={(e) => setCreateForm({ ...createForm, rule_id: e.target.value })}
                  fullWidth
                  required
                />
              )}
              <TextField
                select
                label={t('automation.automation_variables_page.k32')}
                value={createForm.is_secret ? 'true' : 'false'}
                onChange={(e) =>
                  setCreateForm({ ...createForm, is_secret: e.target.value === 'true' })
                }
                fullWidth
              >
                <MenuItem value='false'>{t('automation.automation_variables_page.k33')}</MenuItem>
                <MenuItem value='true'>
                  {t('automation.automation_variables_page.mask_34')}
                </MenuItem>
              </TextField>
              <TextField
                label={t('automation.automation_variables_page.k35')}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>
              {t('automation.automation_variables_page.k36')}
            </Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={
                creating || !createForm.key || (createForm.scope === 'rule' && !createForm.rule_id)
              }
            >
              {creating ? '创建中…' : t('automation.automation_variables_page.k37')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AutomationVariablesPage;
