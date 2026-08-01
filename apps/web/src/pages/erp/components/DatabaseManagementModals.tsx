import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Settings, Download, Upload, Play } from 'lucide-react';
import { ConfirmDialog } from '@/components/common';
import type { TableInfo, ColumnInfo } from '@/api/erp/database';

interface DatabaseManagementModalsProps {
  // Structure Modal
  showStructureModal: boolean;
  onCloseStructureModal: () => void;
  currentTable: TableInfo | null;
  tableColumns: ColumnInfo[];
  tableRowCount: number | null;

  // Backup Modal
  showBackupModal: boolean;
  onCloseBackupModal: () => void;
  onStartBackup: () => void;

  // Restore Modal
  showRestoreModal: boolean;
  onCloseRestoreModal: () => void;
  onConfirmRestore: () => void;
  restoreBackupName: string;

  // Delete Dialog
  deleteBackupDialogOpen: boolean;
  onCloseDeleteDialog: () => void;
  onConfirmDelete: () => void;
}

export const DatabaseManagementModals: React.FC<DatabaseManagementModalsProps> = ({
  showStructureModal,
  onCloseStructureModal,
  currentTable,
  tableColumns,
  tableRowCount,
  showBackupModal,
  onCloseBackupModal,
  onStartBackup,
  showRestoreModal,
  onCloseRestoreModal,
  onConfirmRestore,
  restoreBackupName,
  deleteBackupDialogOpen,
  onCloseDeleteDialog,
  onConfirmDelete,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Table Structure Modal */}
      <Dialog
        open={showStructureModal}
        onClose={onCloseStructureModal}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings size={20} />
            {t('erp.database.label.table_structure', { name: currentTable?.table_name })}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentTable && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {t('erp.database.label.table_name')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                    {currentTable.table_name}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {t('erp.database.label.type')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentTable.table_type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {t('erp.database.label.record_count')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {tableRowCount?.toLocaleString() || '-'}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600, mt: 1 }}
              >
                {t('erp.database.label.field_list')}
              </Typography>

              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <MuiTable size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.field_name')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.type')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.length')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.nullable')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.default_value')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {t('erp.database.label.description')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableColumns.map((col) => (
                      <TableRow key={col.column_name}>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 500 }}>
                            {col.column_name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={col.data_type}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{col.character_maximum_length || '-'}</TableCell>
                        <TableCell>
                          {col.is_nullable === 'YES' ? (
                            <Chip
                              label={t('erp.database.label.yes')}
                              size='small'
                              color='default'
                              variant='outlined'
                            />
                          ) : (
                            <Chip
                              label={t('erp.database.label.no')}
                              size='small'
                              color='warning'
                              variant='outlined'
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                            {col.column_default || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCloseStructureModal}>{t('erp.database.label.close')}</Button>
        </DialogActions>
      </Dialog>

      {/* Backup Modal */}
      <Dialog
        open={showBackupModal}
        onClose={onCloseBackupModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download size={20} />
            {t('erp.database.label.create_backup')}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Alert severity='info'>{t('erp.database.label.backup_warning')}</Alert>
            <FormControl size='small'>
              <InputLabel>{t('erp.database.label.backup_type')}</InputLabel>
              <Select
                value='full'
                label={t('erp.database.label.backup_type')}
              >
                <MenuItem value='full'>{t('erp.database.label.full_backup')}</MenuItem>
                <MenuItem value='incremental'>
                  {t('erp.database.label.incremental_backup')}
                </MenuItem>
              </Select>
            </FormControl>
            <TextField
              size='small'
              label={t('erp.database.label.backup_remark')}
              multiline
              rows={2}
              placeholder={t('erp.database.label.backup_remark_placeholder')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCloseBackupModal}>{t('erp.database.label.cancel')}</Button>
          <Button
            variant='contained'
            startIcon={<Play size={16} />}
            onClick={onStartBackup}
          >
            {t('erp.database.label.start_backup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Modal */}
      <Dialog
        open={showRestoreModal}
        onClose={onCloseRestoreModal}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Upload size={20} />
            {t('erp.database.label.restore_confirm_title')}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ pt: 1 }}>
            <Alert severity='warning'>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                {t('erp.database.label.restore_warning')}
              </Typography>
              <Typography variant='body2'>
                {t('erp.database.label.restore_warning_desc')}
              </Typography>
            </Alert>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary', mb: 0.5 }}
              >
                {t('erp.database.label.backup_to_restore')}
              </Typography>
              <Typography sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                {restoreBackupName || '-'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onCloseRestoreModal}>{t('erp.database.label.cancel')}</Button>
          <Button
            variant='contained'
            color='warning'
            startIcon={<Upload size={16} />}
            onClick={onConfirmRestore}
          >
            {t('erp.database.label.confirm_restore')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Backup Dialog */}
      <ConfirmDialog
        isOpen={deleteBackupDialogOpen}
        onClose={onCloseDeleteDialog}
        onConfirm={onConfirmDelete}
        title={t('erp.database.label.confirm_delete')}
        message={t('erp.database.label.confirm_delete_message')}
        danger
      />
    </>
  );
};
