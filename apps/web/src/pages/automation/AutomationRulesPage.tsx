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
  Copy as ContentCopyIcon,
  Play as PlayIcon,
  Power as PowerIcon,
} from 'lucide-react';
import { automationRulesApi } from '@/api/automation';
import type {
  AutomationRule,
  AutomationRuleStatus,
  AutomationTriggerType,
  AutomationActionType,
} from '@/api/automation';
import { PageContainer } from '@/components/common';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const RULE_STATUS_COLOR: Record<AutomationRuleStatus, 'success' | 'default' | 'warning'> = {
  enabled: 'success',
  disabled: 'default',
  draft: 'warning',
};

const RULE_STATUS_LABEL: Record<AutomationRuleStatus, string> = {
  enabled: i18n.t('automation.automation_rules_page.k0'),
  disabled: i18n.t('automation.automation_rules_page.k1'),
  draft: i18n.t('automation.automation_rules_page.k2'),
};

const TRIGGER_TYPES: AutomationTriggerType[] = [
  'cron',
  'event',
  'webhook',
  'form_submit',
  'manual',
];
const ACTION_TYPES: AutomationActionType[] = [
  'workflow',
  'integration',
  'api',
  'lowcode_page',
  'notification',
];

interface CreateForm {
  name: string;
  code: string;
  description: string;
  trigger_type: AutomationTriggerType;
  trigger_payload: string;
  action_type: AutomationActionType;
  action_target: string;
}

const INITIAL_FORM: CreateForm = {
  name: '',
  code: '',
  description: '',
  trigger_type: 'cron',
  trigger_payload: '{"expression":"0 8 * * *","timezone":"Asia/Shanghai"}',
  action_type: 'workflow',
  action_target: '',
};

export const AutomationRulesPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(INITIAL_FORM);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await automationRulesApi.list({ page: 1, pageSize: 50 });
      setRules(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k3'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const parseJson = (text: string): Record<string, unknown> => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const handleCreate = async () => {
    if (!createForm.name || !createForm.code) return;
    setCreating(true);
    try {
      await automationRulesApi.create({
        name: createForm.name,
        code: createForm.code,
        description: createForm.description || undefined,
        trigger: {
          type: createForm.trigger_type,
          payload: parseJson(createForm.trigger_payload),
        },
        action: {
          type: createForm.action_type,
          target: createForm.action_target,
        },
        status: 'draft',
      });
      setCreateOpen(false);
      setCreateForm(INITIAL_FORM);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k4'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await automationRulesApi.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k5'));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await automationRulesApi.duplicate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k6'));
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    try {
      if (rule.status === 'enabled') {
        await automationRulesApi.disable(rule.id);
      } else {
        await automationRulesApi.enable(rule.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k7'));
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await automationRulesApi.trigger(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_rules_page.k8'));
    }
  };

  return (
    <PageContainer title={t('automation.automation_rules_page.k9')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('automation.automation_rules_page.k10')}</Typography>
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            新建规则
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
                  <TableCell>{t('automation.automation_rules_page.k11')}</TableCell>
                  <TableCell>{t('automation.automation_rules_page.k12')}</TableCell>
                  <TableCell>{t('automation.automation_rules_page.k13')}</TableCell>
                  <TableCell>{t('automation.automation_rules_page.k14')}</TableCell>
                  <TableCell>{t('automation.automation_rules_page.k15')}</TableCell>
                  <TableCell>运行/成功/失败</TableCell>
                  <TableCell>{t('automation.automation_rules_page.k16')}</TableCell>
                  <TableCell align='right'>{t('automation.automation_rules_page.k17')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rules.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      暂无规则，点击右上角新建
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>{rule.name}</TableCell>
                      <TableCell>{rule.code}</TableCell>
                      <TableCell>{rule.trigger.type}</TableCell>
                      <TableCell>{rule.action.type}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={RULE_STATUS_COLOR[rule.status]}
                          label={RULE_STATUS_LABEL[rule.status]}
                        />
                      </TableCell>
                      <TableCell>
                        {rule.run_count} / {rule.success_count} / {rule.failed_count}
                      </TableCell>
                      <TableCell>{rule.last_run_at ?? '-'}</TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handleTrigger(rule.id)}
                          aria-label={t('automation.automation_rules_page.k18')}
                          title={t('automation.automation_rules_page.k19')}
                        >
                          <PlayIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          onClick={() => handleToggle(rule)}
                          aria-label={
                            rule.status === 'enabled'
                              ? t('automation.automation_rules_page.k21')
                              : t('automation.automation_rules_page.k20')
                          }
                          title={
                            rule.status === 'enabled'
                              ? t('automation.automation_rules_page.k23')
                              : t('automation.automation_rules_page.k22')
                          }
                        >
                          <PowerIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          onClick={() => handleDuplicate(rule.id)}
                          aria-label={t('automation.automation_rules_page.k24')}
                          title={t('automation.automation_rules_page.k25')}
                        >
                          <ContentCopyIcon size={18} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          onClick={() => handleDelete(rule.id)}
                          aria-label={t('automation.automation_rules_page.k26')}
                          title={t('automation.automation_rules_page.k27')}
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
          <DialogTitle>{t('automation.automation_rules_page.k28')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('automation.automation_rules_page.k29')}
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label={t('automation.automation_rules_page.k30')}
                value={createForm.code}
                onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                fullWidth
                required
                helperText={t('automation.automation_rules_page.k31')}
              />
              <TextField
                label={t('automation.automation_rules_page.k32')}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <TextField
                select
                label={t('automation.automation_rules_page.k33')}
                value={createForm.trigger_type}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    trigger_type: e.target.value as AutomationTriggerType,
                  })
                }
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
                label={t('automation.automation_rules_page.json_34')}
                value={createForm.trigger_payload}
                onChange={(e) => setCreateForm({ ...createForm, trigger_payload: e.target.value })}
                fullWidth
                multiline
                rows={3}
                helperText='cron: {expression, timezone}; event: {event_name, source}; webhook: {path, secret}; form_submit: {form_id, app_id}'
              />
              <TextField
                select
                label={t('automation.automation_rules_page.k35')}
                value={createForm.action_type}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    action_type: e.target.value as AutomationActionType,
                  })
                }
                fullWidth
              >
                {ACTION_TYPES.map((t) => (
                  <MenuItem
                    key={t}
                    value={t}
                  >
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t('automation.automation_rules_page.id_36')}
                value={createForm.action_target}
                onChange={(e) => setCreateForm({ ...createForm, action_target: e.target.value })}
                fullWidth
                helperText='workflow_id / integration_endpoint_id / API URL / page_id / channel_id'
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>
              {t('automation.automation_rules_page.k37')}
            </Button>
            <Button
              onClick={handleCreate}
              variant='contained'
              disabled={creating || !createForm.name || !createForm.code}
            >
              {creating ? '创建中…' : t('automation.automation_rules_page.k38')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AutomationRulesPage;
