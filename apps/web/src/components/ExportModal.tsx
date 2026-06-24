/**
 * @deprecated 此组件已弃用，请使用 @/components/export/ExportModal 中的 ExportModal 组件
 * 该组件将保留作为向后兼容，预计在未来的版本中移除
 */
import React, { useState } from 'react';
import { logger } from '@/utils/logger';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Button } from '@mui/material';
import { X, FileSpreadsheet, File, FileText, Download, CheckCircle, Columns } from 'lucide-react';
import type { ReportData, ExportFormat } from '@/api/report';

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
      color: 'success.dark',
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      icon: File,
      description: '适合打印和文档分享',
      color: 'error.main',
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      icon: FileText,
      description: '适合数据交换和程序读取',
      color: 'primary.main',
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
    } catch (err: unknown) {
      setExportError('导出失败，请重试');
      logger.error('导出失败:', err);
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

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        p: 4,
      }}
    >
      <Paper
        sx={{
          backgroundColor: 'white',
          borderRadius: 3,
          boxShadow: 20,
          width: '100%',
          maxWidth: 600,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 6,
            borderBottom: '1px solid border.default',
            background: 'linear-gradient(90deg, success.light 0%, success.lighter 100%)',
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
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: 'grey.900' }}>
                导出报表
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', mt: 1 }}>
                {report.config.title}
              </Typography>
            </Box>
            <IconButton
              onClick={onClose}
              sx={{
                p: 2,
                color: 'grey.400',
                borderRadius: 2,
                '&:hover': {
                  color: 'grey.600',
                  backgroundColor: 'grey.100',
                },
              }}
            >
              <X style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {!exporting && !exportComplete && !exportError && (
            <>
              {/* Format Selection */}
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'grey.700',
                    mb: 3,
                  }}
                >
                  选择导出格式
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 3,
                  }}
                >
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <Button
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        sx={{
                          p: 4,
                          borderRadius: 2,
                          border: '2px solid',
                          borderColor: format === option.value ? 'primary.dark' : 'border.default',
                          backgroundColor: format === option.value ? 'primary.light' : 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transition: 'all',
                          '&:hover': {
                            borderColor: format === option.value ? 'primary.dark' : 'grey.300',
                          },
                        }}
                      >
                        <Icon
                          style={{
                            width: 32,
                            height: 32,
                            marginBottom: 8,
                            color: format === option.value ? 'primary.dark' : option.color,
                          }}
                        />
                        <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>
                          {option.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'grey.500', mt: 1 }}>
                          {option.description}
                        </Typography>
                      </Button>
                    );
                  })}
                </Box>
              </Box>

              {/* Options */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'grey.700',
                      mb: 2,
                    }}
                  >
                    自定义文件名（可选）
                  </Typography>
                  <TextField
                    fullWidth
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder={generateFilename()}
                    size='small'
                  />
                  <Typography sx={{ fontSize: '0.75rem', color: 'grey.500', mt: 1 }}>
                    默认文件名包含报表名称和导出日期
                  </Typography>
                </Box>

                {format === 'csv' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <input
                      type='checkbox'
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      style={{ width: 16, height: 16 }}
                    />
                    <Typography sx={{ fontSize: '0.875rem', color: 'grey.700' }}>
                      包含表头
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Preview */}
              <Box sx={{ backgroundColor: 'grey.50', borderRadius: 2, p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Columns style={{ width: 16, height: 16, color: 'grey.500' }} />
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'grey.700',
                    }}
                  >
                    导出预览
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    fontSize: '0.875rem',
                    color: 'grey.600',
                  }}
                >
                  <Typography>• 报表名称：{report.config.title}</Typography>
                  <Typography>• 数据行数：{report.row_count} 条</Typography>
                  <Typography>• 导出列数：{report.config.columns.length} 列</Typography>
                  <Typography>• 导出格式：{format.toUpperCase()}</Typography>
                  <Typography>
                    • 文件名：{generateFilename()}.{format === 'excel' ? 'csv' : format}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {exporting && (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <CircularProgress
                sx={{ color: 'primary.dark', mb: 4 }}
                size={64}
              />
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 500, color: 'grey.900' }}>
                正在导出报表...
              </Typography>
              <Box
                sx={{
                  mt: 4,
                  width: '100%',
                  backgroundColor: 'border.default',
                  borderRadius: 20,
                  height: 10,
                }}
              >
                <Box
                  sx={{
                    backgroundColor: 'primary.dark',
                    height: 10,
                    borderRadius: 20,
                    transition: 'all',
                    width: `${exportProgress}%`,
                  }}
                />
              </Box>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', mt: 2 }}>
                {exportProgress}%
              </Typography>
            </Box>
          )}

          {exportComplete && (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'success.lighter',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 4,
                }}
              >
                <CheckCircle style={{ width: 32, height: 32, color: 'success.dark' }} />
              </Box>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 500, color: 'grey.900' }}>
                导出成功！
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'grey.600', mt: 2 }}>
                文件已开始下载
              </Typography>
            </Box>
          )}

          {exportError && (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'error.lighter',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 4,
                }}
              >
                <X style={{ width: 32, height: 32, color: 'error.dark' }} />
              </Box>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 500, color: 'error.dark' }}>
                {exportError}
              </Typography>
              <Button
                onClick={() => setExportError(null)}
                sx={{
                  mt: 4,
                  px: 4,
                  py: 2,
                  backgroundColor: 'error.dark',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: 'error.darker' },
                }}
              >
                重试
              </Button>
            </Box>
          )}
        </Box>

        {/* Footer */}
        {!exporting && !exportComplete && !exportError && (
          <Box
            sx={{
              p: 6,
              borderTop: '1px solid border.default',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 3,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                px: 4,
                py: 2,
                color: 'grey.700',
                backgroundColor: 'grey.100',
                borderRadius: 2,
                '&:hover': { backgroundColor: 'border.default' },
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              sx={{
                px: 6,
                py: 2,
                backgroundColor: 'success.dark',
                color: 'white',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                '&:hover': { backgroundColor: 'success.dark' },
              }}
            >
              <Download style={{ width: 16, height: 16, marginRight: 8 }} />
              导出
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ExportModal;
