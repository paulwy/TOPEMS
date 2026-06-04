import React, { useState } from 'react';
import { X, FileSpreadsheet, File, FileText, Download, CheckCircle, Loader2, Columns } from 'lucide-react';
import { ReportData, ExportFormat, ExportReportRequest } from '../api/report';

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
      description: '适合数据分析，支持公式和图表',
      color: 'green',
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      icon: File,
      description: '适合打印和文档分享',
      color: 'red',
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      icon: FileText,
      description: '适合数据交换和程序读取',
      color: 'blue',
    },
  ];

  const generateFilename = () => {
    if (customFilename) return customFilename;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reportName = report.config.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
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
    } catch (err) {
      setExportError('导出失败，请重试');
      console.error('导出失败:', err);
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

  const generateCSV = (data: any[], columns: string[]) => {
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

  const generateExcelData = (data: any[], columns: string[]) => {
    return {
      type: 'excel',
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? '')),
    };
  };

  const generatePDFData = (data: any[], columns: string[]) => {
    return {
      type: 'pdf',
      title: report.config.title,
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? '')),
    };
  };

  const downloadFile = (data: any, filename: string, format: ExportFormat) => {
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

  const getFormatIcon = (fmt: ExportFormat) => {
    switch (fmt) {
      case 'excel':
        return FileSpreadsheet;
      case 'pdf':
        return File;
      case 'csv':
        return FileText;
    }
  };

  const getFormatColor = (color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-50 border-green-200 hover:bg-green-100',
      red: 'bg-red-50 border-red-200 hover:bg-red-100',
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    };
    return colors[color];
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl shadow-xl w-full max-w-2xl'>
        {/* Header */}
        <div className='p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50'>
          <div className='flex justify-between items-center'>
            <div>
              <h3 className='text-xl font-semibold text-slate-900'>导出报表</h3>
              <p className='text-sm text-slate-600 mt-1'>{report.config.title}</p>
            </div>
            <button onClick={onClose} className='p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg'>
              <X className='w-5 h-5' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='p-6 space-y-6'>
          {!exporting && !exportComplete && !exportError && (
            <>
              {/* Format Selection */}
              <div>
                <label className='block text-sm font-medium text-slate-700 mb-3'>选择导出格式</label>
                <div className='grid grid-cols-3 gap-3'>
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          format === option.value
                            ? 'border-blue-600 bg-blue-50'
                            : `border-slate-200 ${getFormatColor(option.color)}`
                        }`}
                      >
                        <Icon
                          className={`w-8 h-8 mx-auto mb-2 ${
                            format === option.value ? 'text-blue-600' : `text-${option.color}-600`
                          }`}
                        />
                        <p className='font-medium text-slate-900'>{option.label}</p>
                        <p className='text-xs text-slate-500 mt-1'>{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Options */}
              <div className='space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-slate-700 mb-2'>自定义文件名（可选）</label>
                  <input
                    type='text'
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder={generateFilename()}
                    className='w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500'
                  />
                  <p className='text-xs text-slate-500 mt-1'>默认文件名包含报表名称和导出日期</p>
                </div>

                {format === 'csv' && (
                  <label className='flex items-center space-x-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      className='w-4 h-4 text-blue-600 rounded'
                    />
                    <span className='text-sm text-slate-700'>包含表头</span>
                  </label>
                )}
              </div>

              {/* Preview */}
              <div className='bg-slate-50 rounded-lg p-4'>
                <div className='flex items-center space-x-2 mb-2'>
                  <Columns className='w-4 h-4 text-slate-500' />
                  <span className='text-sm font-medium text-slate-700'>导出预览</span>
                </div>
                <div className='space-y-1 text-sm text-slate-600'>
                  <p>• 报表名称：{report.config.title}</p>
                  <p>• 数据行数：{report.row_count} 条</p>
                  <p>• 导出列数：{report.config.columns.length} 列</p>
                  <p>• 导出格式：{format.toUpperCase()}</p>
                  <p>
                    • 文件名：{generateFilename()}.{format === 'excel' ? 'csv' : format}
                  </p>
                </div>
              </div>
            </>
          )}

          {exporting && (
            <div className='text-center py-12'>
              <Loader2 className='w-16 h-16 text-blue-600 animate-spin mx-auto mb-4' />
              <p className='text-lg font-medium text-slate-900'>正在导出报表...</p>
              <div className='mt-4 w-full bg-slate-200 rounded-full h-2.5'>
                <div
                  className='bg-blue-600 h-2.5 rounded-full transition-all'
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className='text-sm text-slate-600 mt-2'>{exportProgress}%</p>
            </div>
          )}

          {exportComplete && (
            <div className='text-center py-12'>
              <div className='w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <CheckCircle className='w-8 h-8 text-green-600' />
              </div>
              <p className='text-lg font-medium text-slate-900'>导出成功！</p>
              <p className='text-sm text-slate-600 mt-2'>文件已开始下载</p>
            </div>
          )}

          {exportError && (
            <div className='text-center py-12'>
              <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <X className='w-8 h-8 text-red-600' />
              </div>
              <p className='text-lg font-medium text-red-900'>{exportError}</p>
              <button
                onClick={() => setExportError(null)}
                className='mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700'
              >
                重试
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!exporting && !exportComplete && !exportError && (
          <div className='p-6 border-t border-slate-200 flex justify-end space-x-3'>
            <button onClick={onClose} className='px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200'>
              取消
            </button>
            <button
              onClick={handleExport}
              className='px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center'
            >
              <Download className='w-4 h-4 mr-2' />
              导出
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;
