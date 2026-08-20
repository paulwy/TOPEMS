/**
 * Document upload dialog - used by the summary mode to attach a file before
 * generating a summary.
 */
import React from 'react';
import { FileText } from 'lucide-react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface DocUploadDialogProps {
  open: boolean;
  docFile: File | null;
  onClose: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartSummary: () => void;
}

const DocUploadDialog: React.FC<DocUploadDialogProps> = ({
  open,
  docFile,
  onClose,
  onFileUpload,
  onStartSummary,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{t('ai.chat.dialog.upload_title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <input
            type='file'
            accept='.txt,.md,.docx,.pdf'
            onChange={onFileUpload}
            style={{ display: 'none' }}
            id='doc-upload'
          />
          <Button
            variant='outlined'
            fullWidth
            component='label'
            htmlFor='doc-upload'
            sx={{ py: 4 }}
          >
            <FileText size={24} />
            <Typography sx={{ ml: 2 }}>
              {docFile
                ? t('ai.chat.dialog.file_selected', { name: docFile.name })
                : t('ai.chat.dialog.click_to_select')}
            </Typography>
          </Button>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mt: 2, display: 'block' }}
          >
            {t('ai.chat.dialog.supported_formats')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('ai.chat.action.cancel')}</Button>
        <Button
          variant='contained'
          onClick={onStartSummary}
          disabled={!docFile}
        >
          {t('ai.chat.action.start_summary')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocUploadDialog;
