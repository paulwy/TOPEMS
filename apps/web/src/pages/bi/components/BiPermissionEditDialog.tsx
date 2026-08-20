/**
 * @done V80 split
 * Edit dialog for creating / editing a row-level permission.
 */
import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { RowLevelPermission } from '@/api/bi';

export type TestResult = { success: boolean; message: string } | null;
interface BiPermissionEditDialogProps {
  open: boolean;
  editingItem: RowLevelPermission | null;
  formData: Partial<RowLevelPermission>;
  setFormData: (data: Partial<RowLevelPermission>) => void;
  testResult: TestResult;
  onClose: () => void;
  onSave: () => void;
  onTest: (item: RowLevelPermission) => void;
}
const BiPermissionEditDialog: React.FC<BiPermissionEditDialogProps> = ({
  open,
  editingItem,
  formData,
  setFormData,
  testResult,
  onClose,
  onSave,
  onTest,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle>
        {editingItem
          ? i18n.t('bi.bi_permission_page.edit_3')
          : i18n.t('bi.bi_permission_page.text_f36bf2')}
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Grid
          container
          spacing={3}
        >
          <Grid size={{ xs: 12 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.name')}
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.description')}
              multiline
              rows={2}
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>{i18n.t('bi.bi_permission_page.text_c11322')}</InputLabel>
              <Select
                value={formData.data_source_id}
                label={i18n.t('bi.bi_permission_page.text_c11322')}
                onChange={(e) => setFormData({ ...formData, data_source_id: e.target.value })}
              >
                <MenuItem value='ds-001'>{i18n.t('bi.bi_permission_page.text_f13875')}</MenuItem>
                <MenuItem value='ds-002'>{i18n.t('bi.bi_permission_page.text_b18f1c')}</MenuItem>
                <MenuItem value='ds-003'>{i18n.t('bi.bi_permission_page.text_30512b')}</MenuItem>
                <MenuItem value='ds-004'>{i18n.t('bi.bi_permission_page.text_7c8ebb')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.text_099652')}
              fullWidth
              value={formData.table_name}
              onChange={(e) => setFormData({ ...formData, table_name: e.target.value })}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.text_924fa0')}
              multiline
              rows={4}
              fullWidth
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: 14,
                },
              }}
              helperText={i18n.t('bi.bi_permission_page.text_848c70')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.text_5885b5')}
              fullWidth
              value={(formData.roles || []).join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  roles: e.target.value
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean),
                })
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={i18n.t('bi.bi_permission_page.text_d0959e')}
              fullWidth
              value={(formData.users || []).join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  users: e.target.value
                    .split(',')
                    .map((u) => u.trim())
                    .filter(Boolean),
                })
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              type='number'
              label={i18n.t('bi.bi_permission_page.text_ee8ecb')}
              fullWidth
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
              }
              helperText={i18n.t('bi.bi_permission_page.text_3446e5')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                />
              }
              label={i18n.t('bi.bi_permission_page.active_1')}
              sx={{ mt: 2 }}
            />
          </Grid>
        </Grid>
        {testResult && (
          <Box sx={{ mt: 3 }}>
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              icon={testResult.success ? <CheckCircle2 /> : <AlertTriangle />}
            >
              {testResult.message}
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{i18n.t('bi.bi_permission_page.text_625fb2')}</Button>
        {editingItem && (
          <Button
            variant='outlined'
            onClick={() => onTest(editingItem)}
          >
            {i18n.t('bi.bi_permission_page.text_3455fc')}
          </Button>
        )}
        <Button
          variant='contained'
          onClick={onSave}
          disabled={!formData.name || !formData.condition}
        >
          {i18n.t('bi.bi_permission_page.text_be5fbb')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default BiPermissionEditDialog;
