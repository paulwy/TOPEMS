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
import i18n from '@/i18n';

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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle> {i18n.t('admin.dictionary_management.import_dictionary_items')} </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography
            variant='body2'
            sx={{ mb: 1 }}
          >
            {i18n.t('admin.dictionary_management_page.text_13bf99')}
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
          {i18n.t('admin.dictionary_management_page.text_625fb2')}
        </Button>
        <Button
          variant='contained'
          onClick={onImport}
          disabled={!importFile}
        >
          {i18n.t('admin.dictionary_management_page.text_3e36a9')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default DictionaryImportModal;
