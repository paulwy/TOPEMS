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
      <DialogTitle>{isEditing ? '编辑解析规则' : '新建解析规则'}</DialogTitle>
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
                label='规则名称'
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
            </Grid>
            <Grid
              item
              xs={6}
            >
              <TextField
                label='仪器类型'
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
                label='描述'
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
              解析配置 (JSON)
            </Typography>
            <TextareaAutosize
              minRows={6}
              style={{
                width: '100%',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: '4px',
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
              质量校验规则 (JSON)
            </Typography>
            <TextareaAutosize
              minRows={6}
              style={{
                width: '100%',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
                border: `1px solid ${ct.grey[300]}`,
                borderRadius: '4px',
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

export default RuleFormDialog;
