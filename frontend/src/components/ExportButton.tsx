import React, { useState } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { ExportFormat } from '../api/report';

interface ExportButtonProps {
  data: any[];
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
  buttonText = '导出',
  buttonClassName = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError,
}) => {
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
    } catch (error) {
      console.error('导出失败:', error);
      onExportError?.(error as Error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || exporting}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2
        ${
          disabled
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
            : exportComplete
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
        }
        ${buttonClassName}
      `}
    >
      {exporting ? (
        <>
          <Loader2 className='w-4 h-4 animate-spin' />
          <span>导出中...</span>
        </>
      ) : exportComplete ? (
        <>
          <CheckCircle className='w-4 h-4' />
          <span>导出成功</span>
        </>
      ) : (
        <>
          <Download className='w-4 h-4' />
          <span>{buttonText}</span>
        </>
      )}
    </button>
  );
};

export default ExportButton;
