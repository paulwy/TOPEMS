import React from 'react';
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import i18n from '@/i18n';

interface DictionaryExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
}
const DictionaryExportModal: React.FC<DictionaryExportModalProps> = ({
  open,
  onClose,
  onExport,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle> {i18n.t('admin.dictionary_management.export_dictionary_items')} </DialogTitle>
      <DialogContent>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {i18n.t('admin.dictionary_management_page.export_tip')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('admin.dictionary_management_page.cancel')}
        </Button>
        <Button
          variant='contained'
          onClick={onExport}
        >
          {i18n.t('admin.dictionary_management_page.export')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default DictionaryExportModal;
