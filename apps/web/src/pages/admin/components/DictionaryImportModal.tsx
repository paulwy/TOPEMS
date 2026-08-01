import React from 'react';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DictionaryImportModalProps {
  open: boolean;
  importFile: File | null;
  onClose: () => void;
  onImport: () => void;
  onFileChange: (file: File | null) => void;
}

const DictionaryImportModal: React.FC<DictionaryImportModalProps> = ({
  open,
  importFile,
  onClose,
  onImport,
  onFileChange,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle> {t('admin.dictionary_management.import_dictionary_items')} </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography
            variant='body2'
            sx={{ mb: 1 }}
          >
            {t('admin.dictionary_management_page.text_13bf99')}
          </Typography>
          <input
            type='file'
            accept='.json'
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            style={{ width: '100%' }}
          />
        </Box>
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
          onClick={onImport}
          disabled={!importFile}
        >
          {t('admin.dictionary_management_page.text_3e36a9')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DictionaryImportModal;
