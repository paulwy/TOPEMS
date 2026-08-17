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
import i18n from '@/i18n';
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
      <DialogTitle>
        {isEditing ? i18n.t('lims.data_form_dialog.k1') : i18n.t('lims.data_form_dialog.k0')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label={i18n.t('lims.data_form_dialog.k2')}
            fullWidth
            value={formData.batch_no}
            onChange={(e) => onFormDataChange({ ...formData, batch_no: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>{i18n.t('lims.data_form_dialog.k3')}</InputLabel>
            <Select
              value={formData.protocol}
              label={i18n.t('lims.data_form_dialog.k4')}
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
              {i18n.t('pages.data_form_dialog.json_0')}
            </Typography>
            <TextareaAutosize
              minRows={8}
              style={{
                width: '100%',
                padding: 2,
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: 'xs',
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
        <Button onClick={onClose}>{i18n.t('lims.data_form_dialog.k5')}</Button>
        <Button
          variant='contained'
          onClick={onSave}
          disabled={submitting}
        >
          {submitting ? i18n.t('pages.data_form_dialog.k0') : i18n.t('lims.data_form_dialog.k6')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default DataFormDialog;
