import React, { useState } from 'react';
import { Box, Typography, TextField, Checkbox, LinearProgress, Button } from '@mui/material';
import {
  X,
  FileSpreadsheet,
  File,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  Columns,
} from 'lucide-react';
import i18n from '@/i18n';
import type { ReportData, ExportFormat } from '@/api/report';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';

interface ExportModalProps {
  report: ReportData;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ report, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('excel');
  const [customFilename, setCustomFilename] = useState('');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formatOptions = [
    {
      value: 'excel' as ExportFormat,
      label: 'Excel (.xlsx)',
      icon: FileSpreadsheet,
      description: i18n.t('components.export_modal.k0'),
      color: 'success.dark',
      bgColor: 'success.light',
      borderColor: 'success.light',
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      icon: File,
      description: i18n.t('components.export_modal.k1'),
      color: 'error.dark',
      bgColor: 'error.light',
      borderColor: 'error.light',
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      icon: FileText,
      description: i18n.t('components.export_modal.k2'),
      color: 'primary.dark',
      bgColor: 'primary.light',
      borderColor: 'primary.light',
    },
  ];

  const generateFilename = () => {
    if (customFilename) return customFilename;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reportName = report.config.title.replace(/[^a-zA-Z0-9\u4E00-\u9FA5]/g, '_');
    return `${reportName}_${timestamp}`;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportProgress(0);
      setExportError(null);

      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setExportProgress(i);
      }

      const exportData = generateExportData();
      downloadFile(exportData, generateFilename(), format);

      setExportComplete(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setExportError(i18n.t('components.export_modal.k3'));
      logger.error(i18n.t('components.export_modal.k4'), err);
    } finally {
      setExporting(false);
    }
  };

  const generateExportData = () => {
    const data = report.data;
    const columns = report.config.columns;

    switch (format) {
      case 'csv':
        return generateCSV(data, columns);
      case 'excel':
        return generateExcelData(data, columns);
      case 'pdf':
        return generatePDFData(data, columns);
      default:
        return generateCSV(data, columns);
    }
  };

  const generateCSV = (data: Record<string, unknown>[], columns: string[]) => {
    const headers = columns.join(',');
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (value === undefined || value === null) return '';
          const str = String(value);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
    return [headers, ...rows].join('\n');
  };

  const generateExcelData = (data: Record<string, unknown>[], columns: string[]) => {
    return {
      type: 'excel',
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? '')),
    };
  };

  const generatePDFData = (data: Record<string, unknown>[], columns: string[]) => {
    return {
      type: 'pdf',
      title: report.config.title,
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? '')),
    };
  };

  const downloadFile = (
    data: string | { type: string; headers: string[]; rows: unknown[][] },
    filename: string,
    format: ExportFormat
  ) => {
    let content: string | Blob;
    let mimeType: string;

    if (format === 'csv') {
      const BOM = '\uFEFF';
      content = BOM + data;
      mimeType = 'text/csv;charset=utf-8';
    } else if (format === 'excel') {
      const csvContent = generateCSV(report.data, report.config.columns);
      const BOM = '\uFEFF';
      content = BOM + csvContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format === 'excel' ? 'csv' : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'action.active',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 2,
      }}
    >
      <Box
        sx={{
          backgroundColor: 'common.white',
          borderRadius: '0.75rem',
          boxShadow: designTokens.shadows['2xl'],
          width: '100%',
          maxWidth: 768,
        }}
      >
        <Box
          sx={{
            padding: 3,
            borderBottom: '1px solid border.default',
            background: 'linear-gradient(90deg, success.light, success.light)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: '1.25rem',
                  fontWeight: 'semibold',
                  color: 'grey.900',
                }}
              >
                {i18n.t('components.export_modal.k0')}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', marginTop: 0.5 }}>
                {report.config.title}
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              sx={{
                padding: 1,
                '&:hover': { backgroundColor: 'grey.100' },
                borderRadius: '0.5rem',
                color: 'grey.600',
              }}
            >
              <X sx={{ width: 20, height: 20 }} />
            </Button>
          </Box>
        </Box>

        <Box sx={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {!exporting && !exportComplete && !exportError && (
            <>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 'medium',
                    color: 'grey.700',
                    marginBottom: 2,
                  }}
                >
                  {i18n.t('components.export_modal.k1')}
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 2,
                  }}
                >
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = format === option.value;
                    return (
                      <Box
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        sx={{
                          padding: 3,
                          borderRadius: '0.5rem',
                          border: isSelected
                            ? '2px solid primary.dark'
                            : `2px solid ${option.borderColor}`,
                          backgroundColor: isSelected ? 'primary.light' : option.bgColor,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { transform: 'scale(1.02)' },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginBottom: 1,
                          }}
                        >
                          <Icon
                            sx={{
                              width: 32,
                              height: 32,
                              color: isSelected ? 'primary.dark' : option.color,
                            }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: 'medium',
                            color: 'grey.900',
                            textAlign: 'center',
                          }}
                        >
                          {option.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.75rem',
                            color: 'grey.600',
                            textAlign: 'center',
                            marginTop: 0.5,
                          }}
                        >
                          {option.description}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 'medium',
                      color: 'grey.700',
                      marginBottom: 1,
                    }}
                  >
                    {i18n.t('components.export_modal.k2')}
                  </Typography>
                  <TextField
                    type='text'
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder={generateFilename()}
                    fullWidth
                    size='small'
                    sx={{
                      '& .MuiOutlinedInput-root': { borderRadius: '0.5rem' },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: '0.75rem',
                      color: 'grey.600',
                      marginTop: 0.5,
                    }}
                  >
                    {i18n.t('components.export_modal.k3')}
                  </Typography>
                </Box>

                {format === 'csv' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      sx={{
                        color: 'primary.dark',
                        '&.Mui-checked': { color: 'primary.dark' },
                      }}
                    />
                    <Typography sx={{ fontSize: '0.875rem', color: 'grey.700' }}>
                      {i18n.t('components.export_modal.k4')}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  backgroundColor: 'grey.50',
                  borderRadius: '0.5rem',
                  padding: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    marginBottom: 1,
                  }}
                >
                  <Columns sx={{ width: 16, height: 16, color: 'grey.600' }} />
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 'medium',
                      color: 'grey.700',
                    }}
                  >
                    {i18n.t('components.export_modal.k5')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                    • {i18n.t('components.export_modal.k0')}
                    {report.config.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                    • {i18n.t('components.export_modal.k1')}
                    {report.row_count} {i18n.t('components.export_modal.k2')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                    • {i18n.t('components.export_modal.k3')}
                    {report.config.columns.length} {i18n.t('components.export_modal.k4')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                    • {i18n.t('components.export_modal.k5')}
                    {format.toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
                    • {i18n.t('components.export_modal.k6')}
                    {generateFilename()}.{format === 'excel' ? 'csv' : format}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {exporting && (
            <Box sx={{ textAlign: 'center', paddingY: 6 }}>
              <Loader2
                sx={{
                  width: 64,
                  height: 64,
                  color: 'primary.dark',
                  margin: '0 auto 16px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 'medium',
                  color: 'grey.900',
                }}
              >
                {i18n.t('components.export_modal.k6')}
              </Typography>
              <Box sx={{ width: '100%', marginTop: 2 }}>
                <LinearProgress
                  variant='determinate'
                  value={exportProgress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: 'border.default',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      backgroundColor: 'primary.dark',
                    },
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', marginTop: 1 }}>
                {exportProgress}%
              </Typography>
            </Box>
          )}

          {exportComplete && (
            <Box sx={{ textAlign: 'center', paddingY: 6 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'success.lighter',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle sx={{ width: 32, height: 32, color: 'success.dark' }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 'medium',
                  color: 'grey.900',
                }}
              >
                {i18n.t('components.export_modal.k7')}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', marginTop: 1 }}>
                {i18n.t('components.export_modal.k8')}
              </Typography>
            </Box>
          )}

          {exportError && (
            <Box sx={{ textAlign: 'center', paddingY: 6 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'error.lighter',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <X sx={{ width: 32, height: 32, color: 'error.dark' }} />
              </Box>
              <Typography
                sx={{
                  fontSize: '1.125rem',
                  fontWeight: 'medium',
                  color: 'error.dark',
                }}
              >
                {exportError}
              </Typography>
              <Button
                onClick={() => setExportError(null)}
                sx={{
                  marginTop: 2,
                  paddingX: 2,
                  paddingY: 1,
                  backgroundColor: 'error.dark',
                  color: 'common.white',
                  borderRadius: '0.5rem',
                  '&:hover': { backgroundColor: 'error.darker' },
                }}
              >
                {i18n.t('components.export_modal.k9')}
              </Button>
            </Box>
          )}
        </Box>

        {!exporting && !exportComplete && !exportError && (
          <Box
            sx={{
              padding: 3,
              borderTop: '1px solid border.default',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                paddingX: 2,
                paddingY: 1,
                color: 'grey.700',
                backgroundColor: 'grey.100',
                borderRadius: '0.5rem',
                '&:hover': { backgroundColor: 'border.default' },
              }}
            >
              {i18n.t('components.export_modal.k10')}
            </Button>
            <Button
              onClick={handleExport}
              variant='contained'
              startIcon={<Download sx={{ width: 16, height: 16 }} />}
              sx={{
                paddingX: 3,
                paddingY: 1,
                backgroundColor: 'success.dark',
                color: 'common.white',
                borderRadius: '0.5rem',
                '&:hover': { backgroundColor: 'success.700' },
              }}
            >
              {i18n.t('components.export_modal.k11')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ExportModal;
