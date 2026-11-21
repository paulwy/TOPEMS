import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import type { CreateCollectionTaskRequest } from '@/api/lims';

interface TaskFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: CreateCollectionTaskRequest;
  submitting: boolean;
  onClose: () => void;
  onFormDataChange: (data: CreateCollectionTaskRequest) => void;
  onSave: () => void;
}

const TaskFormDialog: React.FC<TaskFormDialogProps> = ({
  open,
  isEditing,
  formData,
  submitting,
  onClose,
  onFormDataChange,
  onSave,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>
        {isEditing ? i18n.t('pages.task_form_dialog.k1') : i18n.t('pages.task_form_dialog.k0')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label={i18n.t('pages.task_form_dialog.k2')}
            fullWidth
            value={formData.task_name}
            onChange={(e) => onFormDataChange({ ...formData, task_name: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>{i18n.t('pages.task_form_dialog.k3')}</InputLabel>
            <Select
              value={formData.protocol}
              label={i18n.t('pages.task_form_dialog.k4')}
              onChange={(e) => onFormDataChange({ ...formData, protocol: e.target.value })}
            >
              <MenuItem value='JSON'>JSON</MenuItem>
              <MenuItem value='HL7'>HL7</MenuItem>
              <MenuItem value='ASTM'>ASTM</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{i18n.t('pages.task_form_dialog.k5')}</InputLabel>
            <Select
              value={formData.collection_mode}
              label={i18n.t('pages.task_form_dialog.k6')}
              onChange={(e) => onFormDataChange({ ...formData, collection_mode: e.target.value })}
            >
              <MenuItem value='manual'>{i18n.t('pages.task_form_dialog.k7')}</MenuItem>
              <MenuItem value='scheduled'>{i18n.t('pages.task_form_dialog.k8')}</MenuItem>
              <MenuItem value='interval'>{i18n.t('pages.task_form_dialog.k9')}</MenuItem>
            </Select>
          </FormControl>
          {formData.collection_mode === 'scheduled' && (
            <TextField
              label={i18n.t('pages.task_form_dialog.cron_0')}
              fullWidth
              placeholder='0 0 * * *'
              value={formData.cron_expression}
              onChange={(e) => onFormDataChange({ ...formData, cron_expression: e.target.value })}
            />
          )}
          {formData.collection_mode === 'interval' && (
            <TextField
              label={i18n.t('pages.task_form_dialog.k10')}
              type='number'
              fullWidth
              value={formData.interval_minutes}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  interval_minutes: parseInt(e.target.value, 10) || 30,
                })
              }
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('pages.task_form_dialog.k11')}</Button>
        <Button
          variant='contained'
          onClick={onSave}
          disabled={submitting}
        >
          {submitting ? i18n.t('pages.task_form_dialog.k1') : i18n.t('pages.task_form_dialog.k12')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskFormDialog;
