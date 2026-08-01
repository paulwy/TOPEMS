/**
 * @done V79 Phase 2 split - Monitoring Alert Rule Form Component
 */
import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type {
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@/api/admin/monitoring';

export interface MonitoringAlertRuleFormProps {
  open: boolean;
  editingRule: AlertRule | null;
  onClose: () => void;
  onSave: (params: { id?: string; data: CreateAlertRuleRequest | UpdateAlertRuleRequest }) => void;
}

export const MonitoringAlertRuleForm: React.FC<MonitoringAlertRuleFormProps> = ({
  open,
  editingRule,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
    >
      <DialogTitle>
        {editingRule
          ? ` + ${t('admin.monitoring_alert.edit_alert_rule')} + `
          : t('admin.monitoring_alert.add_alert_rule')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <TextField
            fullWidth
            label={t('admin.monitoring_alert.rule_name')}
            defaultValue={editingRule?.name}
            placeholder={t('admin.monitoring_alert.enter_rule_name')}
          />
          <TextField
            fullWidth
            label={t('admin.monitoring_alert.trigger_condition')}
            defaultValue={editingRule?.condition}
            placeholder={t('admin.monitoring_alert_page.attr_c96df2')}
          />
          <FormControl fullWidth>
            <InputLabel>{t('admin.monitoring_alert.alert_level')}</InputLabel>
            <Select
              defaultValue={editingRule?.level || 'warning'}
              label={t('admin.monitoring_alert.alert_level')}
            >
              <MenuItem value='info'>{t('admin.monitoring_alert.info')}</MenuItem>
              <MenuItem value='warning'>{t('admin.monitoring_alert.warning')}</MenuItem>
              <MenuItem value='critical'>{t('admin.monitoring_alert.critical')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{t('admin.monitoring_alert.notification_method')}</InputLabel>
            <Select
              defaultValue={editingRule?.notification_channels?.[0] || 'internal'}
              label={t('admin.monitoring_alert.notification_method')}
            >
              <MenuItem value='internal'>{t('admin.monitoring_alert.in_app_message')}</MenuItem>
              <MenuItem value='email'>{t('admin.monitoring_alert.email')}</MenuItem>
              <MenuItem value='sms'>{t('admin.monitoring_alert.sms')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('admin.monitoring_alert.cancel')}</Button>
        <Button
          onClick={() => {
            if (editingRule) {
              onSave({ id: editingRule.id, data: {} });
            } else {
              onSave({ data: {} as CreateAlertRuleRequest });
            }
          }}
          variant='contained'
        >
          {editingRule
            ? ` + ${t('admin.monitoring_alert.save')} + `
            : t('admin.monitoring_alert.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MonitoringAlertRuleForm;
