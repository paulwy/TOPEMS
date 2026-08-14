/**
 * @done V79 Phase 2 split
 * Database structure management - add field dialog component
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox as MuiCheckbox,
  Button,
  Stack,
  Typography,
  Paper,
  Alert,
  Box,
} from '@mui/material';
import i18n from '@/i18n';
import { Eye, AlertTriangle, CheckCircle, FileCode } from 'lucide-react';
import type { DbColumnDefinition, SqlPreview } from '@/api/system';
interface DatabaseStructureRelationsProps {
  showAddColumnModal: boolean;
  onCloseAddColumn: () => void;
  newColumn: DbColumnDefinition;
  onNewColumnChange: (column: DbColumnDefinition) => void;
  onPreview: () => void;
  showPreviewModal: boolean;
  onClosePreview: () => void;
  sqlPreview: SqlPreview | null;
  onExecute: () => void;
}
export const DatabaseStructureRelations: React.FC<DatabaseStructureRelationsProps> = ({
  showAddColumnModal,
  onCloseAddColumn,
  newColumn,
  onNewColumnChange,
  onPreview,
  showPreviewModal,
  onClosePreview,
  sqlPreview,
  onExecute,
}) => {
  return (
    <>
      {/* Add Field Dialog */}
      <Dialog
        open={showAddColumnModal}
        onClose={onCloseAddColumn}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>{i18n.t('admin.database_structure.add_new_field')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2.5}
            sx={{ pt: 1 }}
          >
            <TextField
              label={i18n.t('admin.database_structure.field_name')}
              required
              fullWidth
              size='small'
              value={newColumn.column_name}
              onChange={(e) => onNewColumnChange({ ...newColumn, column_name: e.target.value })}
              placeholder={i18n.t('admin.database_structure_page.attr_30266b')}
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>{i18n.t('admin.database_structure.data_type')}</InputLabel>
              <Select
                value={newColumn.data_type}
                label={i18n.t('admin.database_structure.data_type')}
                onChange={(e) => onNewColumnChange({ ...newColumn, data_type: e.target.value })}
              >
                <MenuItem value='VARCHAR'>VARCHAR</MenuItem>
                <MenuItem value='TEXT'>TEXT</MenuItem>
                <MenuItem value='INTEGER'>INTEGER</MenuItem>
                <MenuItem value='BIGINT'>BIGINT</MenuItem>
                <MenuItem value='NUMERIC'>NUMERIC</MenuItem>
                <MenuItem value='BOOLEAN'>BOOLEAN</MenuItem>
                <MenuItem value='DATE'>DATE</MenuItem>
                <MenuItem value='TIMESTAMP'>TIMESTAMP</MenuItem>
                <MenuItem value='TIMESTAMPTZ'>TIMESTAMPTZ</MenuItem>
                <MenuItem value='UUID'>UUID</MenuItem>
                <MenuItem value='JSONB'>JSONB</MenuItem>
              </Select>
            </FormControl>
            {newColumn.data_type === 'VARCHAR' && (
              <TextField
                label={i18n.t('admin.database_structure.max_length')}
                type='number'
                fullWidth
                size='small'
                value={newColumn.max_length || 255}
                onChange={(e) =>
                  onNewColumnChange({
                    ...newColumn,
                    max_length: parseInt(e.target.value),
                  })
                }
              />
            )}
            <FormControlLabel
              control={
                <MuiCheckbox
                  checked={newColumn.is_nullable}
                  onChange={(e) =>
                    onNewColumnChange({
                      ...newColumn,
                      is_nullable: e.target.checked,
                    })
                  }
                />
              }
              label={i18n.t('admin.database_structure_page.attr_43a86d')}
            />
            <TextField
              label={i18n.t('admin.database_structure.default_value')}
              fullWidth
              size='small'
              value={newColumn.default_value || ''}
              onChange={(e) => onNewColumnChange({ ...newColumn, default_value: e.target.value })}
              placeholder={i18n.t('admin.database_structure_page.attr_92220f')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={onCloseAddColumn}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'border.default' },
            }}
          >
            {i18n.t('admin.database_structure_page.text_625fb2')}
          </Button>
          <Button
            variant='contained'
            onClick={onPreview}
            sx={{
              textTransform: 'none',
              bgcolor: 'primary.dark',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            {i18n.t('admin.database_structure_page.text_81041c')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* SQL Preview Dialog */}
      <Dialog
        open={showPreviewModal}
        onClose={onClosePreview}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Eye size={20} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('admin.database_structure_page.text_64816d')}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {sqlPreview?.warning && (
            <Alert
              severity='warning'
              icon={<AlertTriangle size={20} />}
              sx={{ mb: 2 }}
            >
              {sqlPreview.warning}
            </Alert>
          )}
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'grey.900',
              p: 2,
              borderRadius: 1.5,
              mb: 2,
              overflow: 'auto',
              maxHeight: 320,
            }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'flex-start' }}
            >
              <FileCode
                size={16}
                color='success.400'
                style={{ marginTop: 2 }}
              />
              <Box
                component='pre'
                sx={{
                  m: 0,
                  fontSize: '0.875rem',
                  color: 'success.400',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  flex: 1,
                }}
              >
                {sqlPreview?.sql}
              </Box>
            </Stack>
          </Paper>
          <Alert
            severity='info'
            sx={{ mb: 1 }}
          >
            {i18n.t('admin.database_structure_page.text_02d1f2')}
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={onClosePreview}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              '&:hover': { bgcolor: 'border.default' },
            }}
          >
            {i18n.t('admin.database_structure_page.text_625fb2')}
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={onExecute}
            startIcon={<CheckCircle size={16} />}
            sx={{
              textTransform: 'none',
              bgcolor: 'error.dark',
              '&:hover': { bgcolor: 'error.darker' },
            }}
          >
            {i18n.t('admin.database_structure_page.text_d575bf')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};