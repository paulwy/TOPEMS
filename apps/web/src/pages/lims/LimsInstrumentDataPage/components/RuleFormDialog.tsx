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
import { Grid } from '@/components';
import type { CreateParseRuleRequest } from '@/api/lims';
import { formatJson, parseJsonInput } from '../utils';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;
interface RuleFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: CreateParseRuleRequest;
  submitting: boolean;
  onClose: () => void;
  onFormDataChange: (data: CreateParseRuleRequest) => void;
  onSave: () => void;
}
const RuleFormDialog: React.FC<RuleFormDialogProps> = ({
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
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>
        {isEditing ? i18n.t('lims.rule_form_dialog.k1') : i18n.t('lims.rule_form_dialog.k0')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={2}
          sx={{ mt: 1 }}
        >
          <Grid
            container
            spacing={2}
          >
            <Grid
              item
              xs={6}
            >
              <TextField
                label={i18n.t('lims.rule_form_dialog.k2')}
                fullWidth
                value={formData.rule_name}
                onChange={(e) => onFormDataChange({ ...formData, rule_name: e.target.value })}
              />
            </Grid>
            <Grid
              item
              xs={6}
            >
              <FormControl fullWidth>
                <InputLabel>{i18n.t('lims.rule_form_dialog.k3')}</InputLabel>
                <Select
                  value={formData.protocol}
                  label={i18n.t('lims.rule_form_dialog.k4')}
                  onChange={(e) => onFormDataChange({ ...formData, protocol: e.target.value })}
                >
                  <MenuItem value='JSON'>JSON</MenuItem>
                  <MenuItem value='HL7'>HL7</MenuItem>
                  <MenuItem value='ASTM'>ASTM</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid
              item
              xs={6}
            >
              <TextField
                label={i18n.t('lims.rule_form_dialog.k5')}
                fullWidth
                value={formData.instrument_type}
                onChange={(e) => onFormDataChange({ ...formData, instrument_type: e.target.value })}
              />
            </Grid>
            <Grid
              item
              xs={12}
            >
              <TextField
                label={i18n.t('lims.rule_form_dialog.k6')}
                fullWidth
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              />
            </Grid>
          </Grid>
          <Box>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              {i18n.t('pages.rule_form_dialog.json_0')}
            </Typography>
            <TextareaAutosize
              minRows={6}
              style={{
                width: '100%',
                padding: 2,
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: 'xs',
              }}
              value={formatJson(formData.parse_config)}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  parse_config: parseJsonInput(e.target.value),
                })
              }
            />
          </Box>
          <Box>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              {i18n.t('pages.rule_form_dialog.json_1')}
            </Typography>
            <TextareaAutosize
              minRows={6}
              style={{
                width: '100%',
                padding: 2,
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: 'xs',
              }}
              value={formatJson(formData.quality_rules)}
              onChange={(e) =>
                onFormDataChange({
                  ...formData,
                  quality_rules: parseJsonInput(e.target.value),
                })
              }
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('lims.rule_form_dialog.k7')}</Button>
        <Button
          variant='contained'
          onClick={onSave}
          disabled={submitting}
        >
          {submitting ? i18n.t('pages.rule_form_dialog.k0') : i18n.t('lims.rule_form_dialog.k8')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default RuleFormDialog;
