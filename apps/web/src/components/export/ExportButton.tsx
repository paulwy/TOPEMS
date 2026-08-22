import React, { useState } from 'react';
import { useTheme } from '@mui/material';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import type { ExportFormat } from '@/api/report';
import { logger } from '@/utils/logger';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  columns: string[];
  filename: string;
  format?: ExportFormat;
  buttonText?: string;
  buttonClassName?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportComplete?: () => void;
  onExportError?: (error: Error) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  columns,
  filename,
  format = 'csv',
  buttonText = i18n.t('components.export_button.k0'),
  buttonClassName = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
  const theme = useTheme();
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const generateCSV = () => {
    const BOM = '\uFEFF';
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
    return BOM + [headers, ...rows].join('\n');
  };

  const downloadFile = (content: string, fileName: string, fileFormat: ExportFormat) => {
    let mimeType: string;
    let extension: string;

    switch (fileFormat) {
      case 'csv':
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
        break;
      case 'excel':
        mimeType = 'application/vnd.ms-excel;charset=utf-8';
        extension = 'xlsx';
        break;
      case 'pdf':
        mimeType = 'application/pdf';
        extension = 'pdf';
        break;
      default:
        mimeType = 'text/csv;charset=utf-8';
        extension = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (exporting || disabled) return;

    try {
      setExporting(true);
      onExportStart?.();

      await new Promise((resolve) => setTimeout(resolve, 500));

      let content: string;
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      if (format === 'csv' || format === 'excel') {
        content = generateCSV();
      } else {
        content = JSON.stringify(data, null, 2);
      }

      const finalFilename = `${filename}_${timestamp}`;
      downloadFile(content, finalFilename, format);

      setExportComplete(true);
      onExportComplete?.();

      setTimeout(() => {
        setExportComplete(false);
      }, 2000);
    } catch (error: unknown) {
      logger.error(i18n.t('components.export_button.k1'), error);
      onExportError?.(error as Error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || exporting}
      style={{
        padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}px`,
        borderRadius: 'md',
        fontWeight: 500,
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        backgroundColor: disabled
          ? theme.palette.grey[400]
          : exportComplete
            ? theme.palette.success.dark
            : theme.palette.primary.dark,
        color: disabled ? theme.palette.grey[600] : 'var(--color-primary-foreground)',
        cursor: disabled || exporting ? 'not-allowed' : 'pointer',
        border: 'none',
        ...(buttonClassName ? {} : {}),
      }}
    >
      {exporting ? (
        <>
          <Loader2 sx={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
          <span>{i18n.t('components.export_button.k2')}</span>
        </>
      ) : exportComplete ? (
        <>
          <CheckCircle sx={{ width: 16, height: 16 }} />
          <span>{i18n.t('components.export_button.k3')}</span>
        </>
      ) : (
        <>
          <Download sx={{ width: 16, height: 16 }} />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
};

export default ExportButton;
