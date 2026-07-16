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
      <DialogTitle>{isEditing ? '编辑采集任务' : '新建采集任务'}</DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label='任务名称'
            fullWidth
            value={formData.task_name}
            onChange={(e) => onFormDataChange({ ...formData, task_name: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>协议类型</InputLabel>
            <Select
              value={formData.protocol}
              label='协议类型'
              onChange={(e) => onFormDataChange({ ...formData, protocol: e.target.value })}
            >
              <MenuItem value='JSON'>JSON</MenuItem>
              <MenuItem value='HL7'>HL7</MenuItem>
              <MenuItem value='ASTM'>ASTM</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>采集方式</InputLabel>
            <Select
              value={formData.collection_mode}
              label='采集方式'
              onChange={(e) =>
                onFormDataChange({ ...formData, collection_mode: e.target.value })
              }
            >
              <MenuItem value='manual'>手动触发</MenuItem>
              <MenuItem value='scheduled'>定时采集</MenuItem>
              <MenuItem value='interval'>间隔采集</MenuItem>
            </Select>
          </FormControl>
          {formData.collection_mode === 'scheduled' && (
            <TextField
              label='Cron 表达式'
              fullWidth
              placeholder='0 0 * * *'
              value={formData.cron_expression}
              onChange={(e) =>
                onFormDataChange({ ...formData, cron_expression: e.target.value })
              }
            />
          )}
          {formData.collection_mode === 'interval' && (
            <TextField
              label='间隔时间（分钟）'
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
        <Button onClick={onClose}>取消</Button>
        <Button
          variant='contained'
          onClick={onSave}
          disabled={submitting}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskFormDialog;
