import {
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Box,
  Button,
} from '@mui/material';
import React, { useState, useRef } from 'react';
import { AlertCircle, Download, Upload, FileText, CheckCircle } from 'lucide-react';
import i18n from '@/i18n';
import type { ExportColumn, ImportResult } from '@/utils/importExport';
import {
  exportToExcel,
  exportToCSV,
  importFromExcel,
  downloadTemplate,
} from '@/utils/importExport';

interface ImportExportModalProps<T> {
  open: boolean;
  onOpenChange: (_open: boolean) => void;
  data: T[];
  columns: ExportColumn<T>[];
  fileName: string;
  onImportSuccess?: (_data: T[]) => void;
  transform?: (_raw: Record<string, unknown>) => T;
}

export const ImportExportModal = <T extends Record<string, unknown>>({
  open,
  onOpenChange,
  data,
  columns,
  fileName,
  onImportSuccess,
  transform,
}: ImportExportModalProps<T>) => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult<T> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    exportToExcel(data, columns, fileName);
  };

  const handleExportCSV = () => {
    exportToCSV(data, columns, fileName);
  };

  const handleDownloadTemplate = () => {
    downloadTemplate(columns, fileName);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const result = await importFromExcel(file, columns, transform);
    setImportResult(result);

    if (result.success && onImportSuccess) {
      onImportSuccess(result.data);
    }

    setImporting(false);
  };

  const handleRetry = () => {
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 300);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle>{i18n.t('components.import_export_modal.k0')}</DialogTitle>
      <DialogContent>
        {importResult ? (
          <Box sx={{ py: 3 }}>
            {importResult.success ? (
              <Box sx={{ textAlign: 'center' }}>
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <CheckCircle style={{ width: 32, height: 32, color: 'success.main' }} />
                </Box>
                <Typography
                  variant='h6'
                  sx={{ color: 'success.main', mb: 1 }}
                >
                  {i18n.t('components.import_export_modal.k0')}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  成功导入 {importResult.data.length} 条记录
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    backgroundColor: 'error.light',
                    borderRadius: 1,
                  }}
                >
                  <AlertCircle
                    style={{
                      width: 20,
                      height: 20,
                      color: 'error.main',
                      flexShrink: 0,
                    }}
                  />
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500, color: 'error.main' }}
                    >
                      {i18n.t('components.import_export_modal.k1')}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ color: 'error.dark' }}
                    >
                      共 {importResult.errors.length} 条错误
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    maxHeight: 192,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  {importResult.errors.slice(0, 10).map((error, index) => (
                    <Typography
                      key={index}
                      variant='body2'
                      sx={{ color: 'error.main', fontSize: 14 }}
                    >
                      <strong>第 {error.row} 行:</strong> {error.message}
                    </Typography>
                  ))}
                  {importResult.errors.length > 10 && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      ... 还有 {importResult.errors.length - 10} 条错误
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.import_export_modal.k2')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                <Button
                  variant='outlined'
                  onClick={handleExportExcel}
                  startIcon={<Download style={{ width: 16, height: 16 }} />}
                >
                  {i18n.t('components.import_export_modal.excel_3')}
                </Button>
                <Button
                  variant='outlined'
                  onClick={handleExportCSV}
                  startIcon={<FileText style={{ width: 16, height: 16 }} />}
                >
                  {i18n.t('components.import_export_modal.csv_4')}
                </Button>
              </Box>
            </Box>

            <Box sx={{ height: 1, backgroundColor: 'divider' }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('components.import_export_modal.k5')}
              </Typography>
              <input
                ref={fileInputRef}
                type='file'
                accept='.xlsx,.xls,.csv'
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id='import-file'
              />
              <label htmlFor='import-file'>
                <Button
                  variant='outlined'
                  component='span'
                  fullWidth
                  startIcon={<Upload style={{ width: 16, height: 16 }} />}
                  disabled={importing}
                >
                  {importing ? i18n.t('components.import_export_modal.k2') : i18n.t('components.import_export_modal.k1')}
                </Button>
              </label>
              <Button
                variant='text'
                size='small'
                onClick={handleDownloadTemplate}
                startIcon={<Download style={{ width: 16, height: 16 }} />}
              >
                {i18n.t('components.import_export_modal.k6')}
              </Button>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {i18n.t('components.import_export_modal.k7')}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {importResult ? (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              width: '100%',
              justifyContent: 'flex-end',
            }}
          >
            {!importResult.success && (
              <Button
                variant='outlined'
                onClick={handleRetry}
              >
                {i18n.t('components.import_export_modal.k8')}
              </Button>
            )}
            <Button onClick={handleClose}>{i18n.t('components.import_export_modal.k3')}</Button>
          </Box>
        ) : (
          <Button onClick={handleClose}>{i18n.t('components.import_export_modal.k4')}</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportExportModal;
