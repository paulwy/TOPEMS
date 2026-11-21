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
import i18n from '@/i18n';
import type {
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@/api/admin/monitoring';

interface MonitoringAlertRuleFormProps {
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
    >
      <DialogTitle>
        {editingRule
          ? ` + ${i18n.t('admin.monitoring_alert.edit_alert_rule')} + `
          : i18n.t('admin.monitoring_alert.add_alert_rule')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          <TextField
            fullWidth
            label={i18n.t('admin.monitoring_alert.rule_name')}
            defaultValue={editingRule?.name}
            placeholder={i18n.t('admin.monitoring_alert.enter_rule_name')}
          />
          <TextField
            fullWidth
            label={i18n.t('admin.monitoring_alert.trigger_condition')}
            defaultValue={editingRule?.condition}
            placeholder={i18n.t('admin.monitoring_alert_page.attr_c96df2')}
          />
          <FormControl fullWidth>
            <InputLabel>{i18n.t('admin.monitoring_alert.alert_level')}</InputLabel>
            <Select
              defaultValue={editingRule?.level || 'warning'}
              label={i18n.t('admin.monitoring_alert.alert_level')}
            >
              <MenuItem value='info'>{i18n.t('admin.monitoring_alert.info')}</MenuItem>
              <MenuItem value='warning'>{i18n.t('admin.monitoring_alert.warning')}</MenuItem>
              <MenuItem value='critical'>{i18n.t('admin.monitoring_alert.critical')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{i18n.t('admin.monitoring_alert.notification_method')}</InputLabel>
            <Select
              defaultValue={editingRule?.notification_channels?.[0] || 'internal'}
              label={i18n.t('admin.monitoring_alert.notification_method')}
            >
              <MenuItem value='internal'>
                {i18n.t('admin.monitoring_alert.in_app_message')}
              </MenuItem>
              <MenuItem value='email'>{i18n.t('admin.monitoring_alert.email')}</MenuItem>
              <MenuItem value='sms'>{i18n.t('admin.monitoring_alert.sms')}</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('admin.monitoring_alert.cancel')}</Button>
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
            ? ` + ${i18n.t('admin.monitoring_alert.save')} + `
            : i18n.t('admin.monitoring_alert.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default MonitoringAlertRuleForm;
