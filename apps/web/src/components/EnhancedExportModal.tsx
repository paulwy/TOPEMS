import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import {
  Download,
  X,
  FileSpreadsheet,
  File,
  FileJson,
  FileText,
  Image,
  Database,
  ChevronRight,
} from 'lucide-react';

export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json' | 'html' | 'markdown' | 'image' | 'xml';

export interface ExportOptions {
  format: ExportFormat;
  includeHeaders: boolean;
  includeSummary: boolean;
  dateRange?: { start: string; end: string };
  selectedColumns?: string[];
  fileName?: string;
}

interface EnhancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (_options: ExportOptions) => void;
  availableColumns?: string[];
  defaultColumns?: string[];
}

const exportFormats: {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  extension: string;
}[] = [
  {
    id: 'excel',
    label: 'Excel',
    description: 'Microsoft Excel 格式，支持复杂表格和公式',
    icon: FileSpreadsheet,
    color: '#22c55e',
    extension: '.xlsx',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: '便携文档格式，适合打印和分享',
    icon: File,
    color: '#ef4444',
    extension: '.pdf',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: '逗号分隔值，兼容各种电子表格软件',
    icon: FileText,
    color: '#3b82f6',
    extension: '.csv',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'JavaScript对象表示法，适合程序处理',
    icon: FileJson,
    color: '#8b5cf6',
    extension: '.json',
  },
  {
    id: 'html',
    label: 'HTML',
    description: '网页格式，可直接在浏览器中查看',
    icon: FileText,
    color: '#f97316',
    extension: '.html',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: '轻量级标记语言，适合文档编写',
    icon: FileText,
    color: '#6b7280',
    extension: '.md',
  },
  {
    id: 'image',
    label: '图片',
    description: 'PNG图片格式，适合嵌入文档或演示',
    icon: Image,
    color: '#ec4899',
    extension: '.png',
  },
  {
    id: 'xml',
    label: 'XML',
    description: '可扩展标记语言，适合数据交换',
    icon: Database,
    color: '#14b8a6',
    extension: '.xml',
  },
];

const EnhancedExportModal: React.FC<EnhancedExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  availableColumns = [],
  defaultColumns = [],
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('excel');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(defaultColumns);
  const [customFileName, setCustomFileName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    // Simulate export process
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const options: ExportOptions = {
      format: selectedFormat,
      includeHeaders,
      includeSummary,
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : undefined,
      fileName: customFileName || undefined,
    };

    onExport(options);
    setIsExporting(false);
    onClose();
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(availableColumns);
  };

  const deselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const formatDescription = () => {
    const format = exportFormats.find((f) => f.id === selectedFormat);
    return format?.description || '';
  };

  if (!isOpen) return null;

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
          borderRadius: 2,
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: 'linear-gradient(90deg, #2563eb 0%, #4f46e5 100%)',
            color: 'white',
            p: 6,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Download style={{ width: 24, height: 24 }} />
              <Typography sx={{ fontSize: '1.5rem', fontWeight: 700 }}>导出数据</Typography>
            </Box>
            <IconButton
              onClick={onClose}
              sx={{
                p: 2,
                borderRadius: 2,
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              }}
            >
              <X style={{ width: 24, height: 24 }} />
            </IconButton>
          </Box>
          <Typography sx={{ color: '#bfdbfe', fontSize: '0.875rem', mt: 2 }}>
            {formatDescription()}
          </Typography>
        </Box>

        {/* Content */}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {/* Format Selection */}
          <Box>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#111827',
                mb: 4,
              }}
            >
              选择格式
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(4, 1fr)',
                },
                gap: 3,
              }}
            >
              {exportFormats.map((format) => {
                const Icon = format.icon as React.ComponentType<{
                  size?: number;
                }>;
                return (
                  <Button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    sx={{
                      p: 4,
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: selectedFormat === format.id ? '#2563eb' : '#e5e7eb',
                      backgroundColor: selectedFormat === format.id ? '#eff6ff' : 'white',
                      textAlign: 'left',
                      transition: 'all',
                      '&:hover': {
                        borderColor: selectedFormat === format.id ? '#1d4ed8' : '#bfdbfe',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: selectedFormat === format.id ? format.color : '#f3f4f6',
                        color: selectedFormat === format.id ? 'white' : '#6b7280',
                      }}
                    >
                      <Icon size={24} />
                    </Box>
                    <Typography sx={{ mt: 2, fontWeight: 500, color: '#111827' }}>
                      {format.label}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 1 }}>
                      {format.extension}
                    </Typography>
                  </Button>
                );
              })}
            </Box>
          </Box>

          {/* Basic Options */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
              基本选项
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 4,
                backgroundColor: '#f9fafb',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 500, color: '#111827' }}>包含表头</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  在文件开头包含列标题
                </Typography>
              </Box>
              <Switch
                checked={includeHeaders}
                onChange={(e) => setIncludeHeaders(e.target.checked)}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 4,
                backgroundColor: '#f9fafb',
                borderRadius: 2,
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 500, color: '#111827' }}>包含摘要</Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  在文件末尾添加统计摘要
                </Typography>
              </Box>
              <Switch
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  mb: 2,
                }}
              >
                自定义文件名
              </Typography>
              <TextField
                fullWidth
                value={customFileName}
                onChange={(e) => setCustomFileName(e.target.value)}
                placeholder='输入文件名（不含扩展名）'
                size='small'
              />
            </Box>
          </Box>

          {/* Advanced Options Toggle */}
          <Button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 4,
              backgroundColor: '#f9fafb',
              borderRadius: 2,
              '&:hover': { backgroundColor: '#f3f4f6' },
            }}
          >
            <Typography sx={{ fontWeight: 500, color: '#111827' }}>高级选项</Typography>
            <ChevronRight
              style={{
                width: 20,
                height: 20,
                color: '#6b7280',
                transform: showAdvancedOptions ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            />
          </Button>

          {/* Advanced Options */}
          {showAdvancedOptions && availableColumns.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>
                选择列
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  已选择 {selectedColumns.length}/{availableColumns.length} 列
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    onClick={selectAllColumns}
                    sx={{
                      fontSize: '0.875rem',
                      color: '#2563eb',
                      '&:hover': { color: '#1d4ed8' },
                    }}
                  >
                    全选
                  </Button>
                  <Typography sx={{ color: '#d1d5db' }}>|</Typography>
                  <Button
                    onClick={deselectAllColumns}
                    sx={{
                      fontSize: '0.875rem',
                      color: '#4b5563',
                      '&:hover': { color: '#374151' },
                    }}
                  >
                    取消全选
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                {availableColumns.map((column) => (
                  <Box
                    key={column}
                    onClick={() => toggleColumn(column)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 3,
                      border: '1px solid',
                      borderColor: selectedColumns.includes(column) ? '#2563eb' : '#e5e7eb',
                      borderRadius: 2,
                      backgroundColor: selectedColumns.includes(column) ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all',
                      '&:hover': {
                        borderColor: selectedColumns.includes(column) ? '#1d4ed8' : '#bfdbfe',
                      },
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={selectedColumns.includes(column)}
                      onChange={() => toggleColumn(column)}
                      style={{ width: 16, height: 16 }}
                    />
                    <Typography sx={{ ml: 2, fontSize: '0.875rem', color: '#374151' }}>
                      {column}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            backgroundColor: '#f9fafb',
            px: 6,
            py: 4,
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography sx={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {selectedFormat === 'excel' && '支持 .xlsx 格式'}
              {selectedFormat === 'pdf' && '支持分页和打印'}
              {selectedFormat === 'csv' && '兼容所有电子表格'}
              {selectedFormat === 'json' && '结构化数据格式'}
              {selectedFormat === 'html' && '浏览器友好'}
              {selectedFormat === 'markdown' && '文档友好'}
              {selectedFormat === 'image' && 'PNG 图片格式'}
              {selectedFormat === 'xml' && '数据交换标准'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Button
                onClick={onClose}
                disabled={isExporting}
                sx={{
                  px: 6,
                  py: 2,
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#f3f4f6' },
                  opacity: isExporting ? 0.5 : 1,
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleExport}
                disabled={isExporting}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 6,
                  py: 2,
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#1d4ed8' },
                  opacity: isExporting ? 0.5 : 1,
                }}
              >
                {isExporting ? (
                  <>
                    <CircularProgress
                      size={16}
                      sx={{ mr: 2, color: 'white' }}
                    />
                    导出中...
                  </>
                ) : (
                  <>
                    <Download style={{ width: 16, height: 16, marginRight: 8 }} />
                    导出
                  </>
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default EnhancedExportModal;
