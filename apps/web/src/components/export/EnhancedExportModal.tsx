import React, { useState } from 'react';
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
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Checkbox,
  Collapse,
  CircularProgress,
  Button,
} from '@mui/material';

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
  icon: React.ReactNode;
  color: string;
  extension: string;
}[] = [
  {
    id: 'excel',
    label: 'Excel',
    description: 'Microsoft Excel 格式，支持复杂表格和公式',
    icon: <FileSpreadsheet sx={{ width: 24, height: 24 }} />,
    color: 'success.main',
    extension: '.xlsx',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: '便携文档格式，适合打印和分享',
    icon: <File sx={{ width: 24, height: 24 }} />,
    color: 'error.main',
    extension: '.pdf',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: '逗号分隔值，兼容各种电子表格软件',
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'info.main',
    extension: '.csv',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'JavaScript对象表示法，适合程序处理',
    icon: <FileJson sx={{ width: 24, height: 24 }} />,
    color: 'secondary.main',
    extension: '.json',
  },
  {
    id: 'html',
    label: 'HTML',
    description: '网页格式，可直接在浏览器中查看',
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'warning.main',
    extension: '.html',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: '轻量级标记语言，适合文档编写',
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'grey.600',
    extension: '.md',
  },
  {
    id: 'image',
    label: '图片',
    description: 'PNG图片格式，适合嵌入文档或演示',
    icon: <Image sx={{ width: 24, height: 24 }} />,
    color: 'pink.main',
    extension: '.png',
  },
  {
    id: 'xml',
    label: 'XML',
    description: '可扩展标记语言，适合数据交换',
    icon: <Database sx={{ width: 24, height: 24 }} />,
    color: 'teal.main',
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
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxHeight: '90vh',
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, primary.main, secondary.main)',
          color: 'primary.contrastText',
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Download sx={{ width: 24, height: 24 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 700 }}
          >
            导出数据
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
          sx={{ color: 'inherit' }}
          aria-label='关闭'
        >
          <X sx={{ width: 24, height: 24 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography sx={{ color: 'action.active', fontSize: '0.875rem' }}>
          {formatDescription()}
        </Typography>

        {/* Format Selection */}
        <Box>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            选择格式
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1.5,
            }}
          >
            {exportFormats.map((format) => (
              <Button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  border: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  borderColor: selectedFormat === format.id ? 'primary.main' : 'divider',
                  bgcolor: selectedFormat === format.id ? 'primary.50' : 'background.paper',
                  '&:hover': {
                    borderColor: 'primary.main',
                  },
                }}
              >
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: selectedFormat === format.id ? format.color : 'action.hover',
                    color: selectedFormat === format.id ? 'white' : 'text.secondary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {format.icon}
                </Box>
                <Typography
                  sx={{
                    mt: 1,
                    fontWeight: 500,
                    color: 'text.primary',
                    fontSize: '0.875rem',
                  }}
                >
                  {format.label}
                </Typography>
                <Typography
                  sx={{
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                >
                  {format.extension}
                </Typography>
              </Button>
            ))}
          </Box>
        </Box>

        {/* Basic Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            基本选项
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>包含表头</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                在文件开头包含列标题
              </Typography>
            </Box>
            <Switch
              checked={includeHeaders}
              onChange={(e) => setIncludeHeaders(e.target.checked)}
              color='primary'
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>包含摘要</Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                在文件末尾添加统计摘要
              </Typography>
            </Box>
            <Switch
              checked={includeSummary}
              onChange={(e) => setIncludeSummary(e.target.checked)}
              color='primary'
            />
          </Box>

          <Box>
            <Typography
              sx={{
                fontWeight: 500,
                color: 'text.primary',
                mb: 1,
                fontSize: '0.875rem',
              }}
            >
              自定义文件名
            </Typography>
            <TextField
              size='small'
              fullWidth
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder='输入文件名（不含扩展名）'
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                },
              }}
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
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.selected' },
          }}
        >
          <Typography sx={{ fontWeight: 500 }}>高级选项</Typography>
          <ChevronRight
            sx={{
              width: 20,
              height: 20,
              transform: showAdvancedOptions ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </Button>

        {/* Advanced Options */}
        <Collapse in={showAdvancedOptions}>
          {availableColumns.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                选择列
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                }}
              >
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                  已选择 {selectedColumns.length}/{availableColumns.length} 列
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    onClick={selectAllColumns}
                    size='small'
                    sx={{ fontSize: '0.75rem', color: 'primary.main' }}
                  >
                    全选
                  </Button>
                  <Typography sx={{ color: 'divider' }}>|</Typography>
                  <Button
                    onClick={deselectAllColumns}
                    size='small'
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    取消全选
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                }}
              >
                {availableColumns.map((column) => (
                  <FormControlLabel
                    key={column}
                    control={
                      <Checkbox
                        checked={selectedColumns.includes(column)}
                        onChange={() => toggleColumn(column)}
                        size='small'
                        sx={{ color: 'text.secondary' }}
                      />
                    }
                    label={<Typography sx={{ fontSize: '0.875rem' }}>{column}</Typography>}
                    sx={{
                      m: 0,
                      p: 1,
                      border: 1,
                      borderRadius: 1,
                      borderColor: selectedColumns.includes(column) ? 'primary.main' : 'divider',
                      bgcolor: selectedColumns.includes(column) ? 'primary.50' : 'background.paper',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Collapse>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: 'action.hover',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {selectedFormat === 'excel' && '支持 .xlsx 格式'}
            {selectedFormat === 'pdf' && '支持分页和打印'}
            {selectedFormat === 'csv' && '兼容所有电子表格'}
            {selectedFormat === 'json' && '结构化数据格式'}
            {selectedFormat === 'html' && '浏览器友好'}
            {selectedFormat === 'markdown' && '文档友好'}
            {selectedFormat === 'image' && 'PNG 图片格式'}
            {selectedFormat === 'xml' && '数据交换标准'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={onClose}
              disabled={isExporting}
              variant='outlined'
              sx={{ borderRadius: 1.5 }}
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant='contained'
              startIcon={
                isExporting ? (
                  <CircularProgress
                    size={16}
                    color='inherit'
                  />
                ) : (
                  <Download size={16} />
                )
              }
              sx={{ borderRadius: 1.5 }}
            >
              {isExporting ? '导出中...' : '导出'}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedExportModal;
