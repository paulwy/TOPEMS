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
  Box,
  Typography,
  TextareaAutosize,
  Button,
} from '@mui/material';
import type { CreateInstrumentDataRequest } from '@/api/lims';
import { formatJson, parseJsonInput } from '../utils';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface DataFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: CreateInstrumentDataRequest;
  submitting: boolean;
  onClose: () => void;
  onFormDataChange: (data: CreateInstrumentDataRequest) => void;
  onSave: () => void;
}

const DataFormDialog: React.FC<DataFormDialogProps> = ({
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
      <DialogTitle>{isEditing ? '编辑数据' : '新增数据'}</DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label='批次号'
            fullWidth
            value={formData.batch_no}
            onChange={(e) => onFormDataChange({ ...formData, batch_no: e.target.value })}
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
          <Box>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              原始数据 (JSON)
            </Typography>
            <TextareaAutosize
              minRows={8}
              style={{
                width: '100%',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: '4px',
              }}
              value={formatJson(formData.raw_data)}
              onChange={(e) =>
                onFormDataChange({ ...formData, raw_data: parseJsonInput(e.target.value) })
              }
            />
          </Box>
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

export default DataFormDialog;
