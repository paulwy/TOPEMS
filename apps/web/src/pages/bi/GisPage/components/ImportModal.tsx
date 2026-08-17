import React from 'react';
import i18n from '@/i18n';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Stack,
  Typography,
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { X, Upload, FileText } from 'lucide-react';

interface ImportModalProps {
  open: boolean;
  importFile: File | null;
  importPreview: string[][] | null;
  importConfirm: boolean;
  onClose: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmChange: (checked: boolean) => void;
  onImport: () => void;
}
export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  importFile,
  importPreview,
  importConfirm,
  onClose,
  onFileChange,
  onConfirmChange,
  onImport,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 2 } } }}
    >
      <DialogTitle>
        <Stack
          direction='row'
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.import_modal.k0')}
          </Typography>
          <IconButton
            onClick={onClose}
            size='small'
            aria-label={i18n.t('bi.import_modal.k0')}
          >
            <X size={20} />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          spacing={3}
          sx={{ pt: 1 }}
        >
          <Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, mb: 1 }}
            >
              {i18n.t('pages.import_modal.csv_1')}
            </Typography>
            <Box
              sx={{
                border: 2,
                borderStyle: 'dashed',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { borderColor: 'info.main' },
              }}
              component='label'
              htmlFor='csv-upload'
            >
              <input
                type='file'
                accept='.csv'
                onChange={onFileChange}
                style={{ display: 'none' }}
                id='csv-upload'
              />
              <Upload
                size={48}
                color='text.disabled'
                style={{ marginBottom: 8 }}
              />
              <Typography color='text.secondary'>{i18n.t('bi.import_modal.k1')}</Typography>
              <Typography
                variant='caption'
                color='text.disabled'
                sx={{ mt: 1 }}
              >
                {i18n.t('pages.import_modal.csv_2')}
              </Typography>
            </Box>
          </Box>
          {importFile && (
            <Paper sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <Stack
                direction='row'
                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Stack
                  direction='row'
                  spacing={1.5}
                  sx={{ alignItems: 'center' }}
                >
                  <FileText
                    size={32}
                    color='text.secondary'
                  />
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      {importFile.name}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {(importFile.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                </Stack>
                <IconButton
                  size='small'
                  onClick={onClose}
                  aria-label={i18n.t('bi.import_modal.k2')}
                >
                  <X size={20} />
                </IconButton>
              </Stack>
            </Paper>
          )}
          {importPreview && (
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500, mb: 1 }}
              >
                {i18n.t('pages.import_modal.10_3')}
              </Typography>
              <TableContainer
                component={Paper}
                variant='outlined'
                sx={{ maxHeight: 192, borderRadius: 1.5 }}
              >
                <Table
                  size='small'
                  stickyHeader
                >
                  <TableHead>
                    <TableRow>
                      {importPreview[0]?.map((header, index) => (
                        <TableCell
                          key={index}
                          sx={{ fontWeight: 500, bgcolor: 'grey.50' }}
                        >
                          {header}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importPreview.slice(1).map((row, rowIndex) => (
                      <TableRow
                        key={rowIndex}
                        hover
                      >
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex}>{cell}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <FormControlLabel
                sx={{ mt: 1.5 }}
                control={
                  <Checkbox
                    checked={importConfirm}
                    onChange={(e) => onConfirmChange(e.target.checked)}
                  />
                }
                label={i18n.t('bi.gis_page_components__import_modal.import')}
              />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button
          onClick={onClose}
          variant='outlined'
        >
          {i18n.t('pages.import_modal.k4')}
        </Button>
        <Button
          onClick={onImport}
          variant='contained'
          color='success'
          disabled={!importFile || !importConfirm}
        >
          {i18n.t('pages.import_modal.k5')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
