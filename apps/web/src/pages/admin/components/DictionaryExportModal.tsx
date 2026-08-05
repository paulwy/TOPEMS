import React from 'react';
import {
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle> {t('admin.dictionary_management.export_dictionary_items')} </DialogTitle>
      <DialogContent>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('admin.dictionary_management_page.text_bbe5e7')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {t('admin.dictionary_management_page.text_625fb2')}
        </Button>
        <Button
          variant='contained'
          onClick={onExport}
        >
          {t('admin.dictionary_management_page.text_3ca522')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DictionaryExportModal;
