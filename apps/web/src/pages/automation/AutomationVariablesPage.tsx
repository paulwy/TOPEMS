import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Plus as AddIcon,
  Trash2 as DeleteIcon,
  Eye as EyeIcon,
  EyeOff as EyeOffIcon,
  Key as KeyIcon,
} from 'lucide-react';
import { ConfirmDialog } from '@topems/shared-components';
import { automationVariablesApi } from '@/api/automation';
import type { AutomationVariable, AutomationVariableScope } from '@/api/automation';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef } from '@/components/templates/list/types';
import { useConfirmDialog } from '@/hooks';
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

type VariableRow = AutomationVariable & { id: string };

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

  const { confirmOpen, confirmConfig, openConfirm, closeConfirm } = useConfirmDialog();

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
  }, [t]);

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

  const handleDelete = useCallback(
    (key: string) => {
      openConfirm({
        title: t('automation.automation_variables_page.k22'),
        message: t('automation.automation_variables_page.k23'),
        danger: true,
        onConfirm: async () => {
          try {
            await automationVariablesApi.remove(key);
            await load();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : t('automation.automation_variables_page.k5')
            );
          }
        },
      });
    },
    [openConfirm, t, load]
  );

  const handleReveal = useCallback(
    async (key: string) => {
      if (revealedKeys[key]) {
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
    },
    [revealedKeys, t]
  );

  const maskValue = useCallback((v: string) => '•'.repeat(Math.min(v.length, 12) || 8), []);

  const rows: VariableRow[] = useMemo(
    () => variables.map((v) => ({ ...v, id: v.key })),
    [variables]
  );

  const columns: ColumnDef<VariableRow>[] = useMemo(
    () => [
      {
        id: 'key',
        label: t('automation.automation_variables_page.k9'),
        render: (row) => (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            {row.is_secret && <KeyIcon size={14} />}
            <Typography
              component='code'
              variant='body2'
            >
              {row.key}
            </Typography>
          </Stack>
        ),
      },
      {
        id: 'value',
        label: t('automation.automation_variables_page.e2'),
        render: (row) => {
          const revealed = revealedKeys[row.key];
          return row.is_secret ? (
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Typography component='code'>{revealed ?? maskValue(row.value)}</Typography>
              <Tooltip
                title={
                  revealed
                    ? t('automation.automation_variables_page.k19')
                    : t('automation.automation_variables_page.k18')
                }
              >
                <span>
                  <IconButton
                    size='small'
                    onClick={() => handleReveal(row.key)}
                    disabled={revealing === row.key}
                    aria-label={
                      revealed
                        ? t('automation.automation_variables_page.k17')
                        : t('automation.automation_variables_page.k16')
                    }
                  >
                    {revealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          ) : (
            <Typography component='code'>{row.value}</Typography>
          );
        },
      },
      {
        id: 'scope',
        label: t('automation.automation_variables_page.k10'),
        render: (row) => (
          <Chip
            size='small'
            color={SCOPE_COLOR[row.scope]}
            label={SCOPE_LABEL[row.scope]}
          />
        ),
      },
      {
        id: 'is_secret',
        label: t('automation.automation_variables_page.k11'),
        render: (row) => (
          <Typography variant='body2'>
            {row.is_secret
              ? t('automation.automation_variables_page.k21')
              : t('automation.automation_variables_page.k20')}
          </Typography>
        ),
      },
      {
        id: 'rule_id',
        label: t('automation.automation_variables_page.id_12'),
        render: (row) => <Typography variant='body2'>{row.rule_id ?? '-'}</Typography>,
      },
      {
        id: 'description',
        label: t('automation.automation_variables_page.k13'),
        render: (row) => <Typography variant='body2'>{row.description ?? '-'}</Typography>,
      },
      {
        id: 'updated_at',
        label: t('automation.automation_variables_page.k14'),
        render: (row) => <Typography variant='body2'>{row.updated_at}</Typography>,
      },
    ],
    [t, revealedKeys, revealing, maskValue, handleReveal]
  );

  const renderRowActions = useCallback(
    (row: AutomationVariable) => (
      <Tooltip title={t('automation.automation_variables_page.k23')}>
        <IconButton
          size='small'
          color='error'
          onClick={() => handleDelete(row.key)}
          aria-label={t('automation.automation_variables_page.k22')}
        >
          <DeleteIcon size={18} />
        </IconButton>
      </Tooltip>
    ),
    [handleDelete, t]
  );

  const actions = useMemo(
    () => [
      {
        label: t('automation.automation_variables_page.e1'),
        icon: <AddIcon size={18} />,
        onClick: () => setCreateOpen(true),
        variant: 'contained' as const,
      },
    ],
    [t]
  );

  return (
    <>
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      <ListPageTemplate<VariableRow>
        title={t('automation.automation_variables_page.k7')}
        subtitle={t('automation.automation_variables_page.k8')}
        columns={columns}
        data={rows}
        loading={loading}
        actions={actions}
        renderRowActions={renderRowActions}
        emptyMessage={t('automation.automation_variables_page.e3')}
      />

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
              helperText={t('automation.automation_variables_page.m1')}
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
              <MenuItem value='workspace'>{t('automation.automation_variables_page.k29')}</MenuItem>
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
              <MenuItem value='true'>{t('automation.automation_variables_page.mask_34')}</MenuItem>
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
            {creating
              ? t('automation.automation_rules_page.r2')
              : t('automation.automation_variables_page.k37')}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={closeConfirm}
        onConfirm={() => {
          confirmConfig?.onConfirm();
          closeConfirm();
        }}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        danger={confirmConfig?.danger}
      />
    </>
  );
};

export default AutomationVariablesPage;
