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
import i18n from '@/i18n';
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
import { designTokens, semanticTokens } from '@topems/tokens';

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
    description: i18n.t('components.enhanced_export_modal.k0'),
    icon: <FileSpreadsheet sx={{ width: 24, height: 24 }} />,
    color: 'success.main',
    extension: '.xlsx',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: i18n.t('components.enhanced_export_modal.k0'),
    icon: <File sx={{ width: 24, height: 24 }} />,
    color: 'error.main',
    extension: '.pdf',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: i18n.t('components.enhanced_export_modal.k1'),
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'info.main',
    extension: '.csv',
  },
  {
    id: 'json',
    label: 'JSON',
    description: i18n.t('components.enhanced_export_modal.k1'),
    icon: <FileJson sx={{ width: 24, height: 24 }} />,
    color: 'secondary.main',
    extension: '.json',
  },
  {
    id: 'html',
    label: 'HTML',
    description: i18n.t('components.enhanced_export_modal.k2'),
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'warning.main',
    extension: '.html',
  },
  {
    id: 'markdown',
    label: 'Markdown',
    description: i18n.t('components.enhanced_export_modal.k3'),
    icon: <FileText sx={{ width: 24, height: 24 }} />,
    color: 'grey.600',
    extension: '.md',
  },
  {
    id: 'image',
    label: i18n.t('components.enhanced_export_modal.k4'),
    description: i18n.t('components.enhanced_export_modal.k2'),
    icon: <Image sx={{ width: 24, height: 24 }} />,
    color: 'pink.main',
    extension: '.png',
  },
  {
    id: 'xml',
    label: 'XML',
    description: i18n.t('components.enhanced_export_modal.k5'),
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
            boxShadow: designTokens.shadows['2xl'],
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
            {i18n.t('components.enhanced_export_modal.k3')}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
          sx={{ color: 'inherit' }}
          aria-label={i18n.t('components.enhanced_export_modal.k6')}
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
            {i18n.t('components.enhanced_export_modal.k4')}
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
                    color:
                      selectedFormat === format.id
                        ? 'var(--color-primary-foreground, #ffffff)'
                        : 'text.secondary',
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
            {i18n.t('components.enhanced_export_modal.k5')}
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
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                {i18n.t('components.enhanced_export_modal.k7')}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {i18n.t('components.enhanced_export_modal.k6')}
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
              <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
                {i18n.t('components.enhanced_export_modal.k8')}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {i18n.t('components.enhanced_export_modal.k7')}
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
              {i18n.t('components.enhanced_export_modal.k8')}
            </Typography>
            <TextField
              size='small'
              fullWidth
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              placeholder={i18n.t('components.enhanced_export_modal.k9')}
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
          <Typography sx={{ fontWeight: 500 }}>
            {i18n.t('components.enhanced_export_modal.k10')}
          </Typography>
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
                {i18n.t('components.enhanced_export_modal.k9')}
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
                  {i18n.t('components.enhanced_export_modal.k0')} {selectedColumns.length}/
                  {availableColumns.length} {i18n.t('components.enhanced_export_modal.k1')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    onClick={selectAllColumns}
                    size='small'
                    sx={{ fontSize: '0.75rem', color: 'primary.main' }}
                  >
                    {i18n.t('components.enhanced_export_modal.k10')}
                  </Button>
                  <Typography sx={{ color: 'divider' }}>|</Typography>
                  <Button
                    onClick={deselectAllColumns}
                    size='small'
                    sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    {i18n.t('components.enhanced_export_modal.k11')}
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
            {selectedFormat === 'excel' && i18n.t('components.enhanced_export_modal.xlsx_12')}
            {selectedFormat === 'pdf' && i18n.t('components.enhanced_export_modal.k11')}
            {selectedFormat === 'csv' && i18n.t('components.enhanced_export_modal.k12')}
            {selectedFormat === 'json' && i18n.t('components.enhanced_export_modal.k13')}
            {selectedFormat === 'html' && i18n.t('components.enhanced_export_modal.k14')}
            {selectedFormat === 'markdown' && i18n.t('components.enhanced_export_modal.k15')}
            {selectedFormat === 'image' && i18n.t('components.enhanced_export_modal.png_13')}
            {selectedFormat === 'xml' && i18n.t('components.enhanced_export_modal.k16')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={onClose}
              disabled={isExporting}
              variant='outlined'
              sx={{ borderRadius: 1.5 }}
            >
              {i18n.t('components.enhanced_export_modal.k14')}
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
              {isExporting
                ? i18n.t('components.enhanced_export_modal.k15')
                : i18n.t('components.enhanced_export_modal.k17')}
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default EnhancedExportModal;
