import { useState } from 'react';
import { Image, Download, FileImage, Copy, Check } from 'lucide-react';
import { Menu, MenuItem, Button, useTheme } from '@mui/material';
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

interface ChartExportProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
}

const exportFormats = [
  { id: 'png', label: 'PNG', mimeType: 'image/png' },
  { id: 'jpeg', label: 'JPEG', mimeType: 'image/jpeg' },
  { id: 'svg', label: 'SVG', mimeType: 'image/svg+xml' },
];

export const ChartExport = ({ chartRef, filename = 'chart' }: ChartExportProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const [copied, setCopied] = useState(false);

  const handleExport = async (format: string, mimeType: string) => {
    try {
      if (!chartRef.current) return;

      const canvas = chartRef.current.querySelector('canvas');

      if (canvas) {
        const link = document.createElement('a');
        link.download = `${filename}.${format}`;
        link.href = canvas.toDataURL(mimeType);
        link.click();
      } else {
        const svgElement = chartRef.current.querySelector('svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: mimeType });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `${filename}.${format}`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to export chart:', error);
      alert(i18n.t('shared.chart_export.k0'));
    }
    setAnchorEl(null);
  };

  const handleCopy = async () => {
    try {
      if (!chartRef.current) return;

      const canvas = chartRef.current.querySelector('canvas');

      if (canvas) {
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/png')
        );
        if (blob) {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (error: unknown) {
      logger.error('Failed to copy chart:', error);
      alert(i18n.t('shared.chart_export.k1'));
    }
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={(e) => setAnchorEl(e.currentTarget)}
        title={i18n.t('shared.chart_export.k2')}
      >
        <Image sx={{ width: 16, height: 16, marginRight: 4 }} />
        <Download sx={{ width: 16, height: 16 }} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem disabled>
          <span style={{ fontSize: 12, fontWeight: 500, color: theme.palette.text.secondary }}>
            {i18n.t('components.chart_export.k0')}
          </span>
        </MenuItem>
        {exportFormats.map((format) => (
          <MenuItem
            key={format.id}
            onClick={() => handleExport(format.id, format.mimeType)}
          >
            <FileImage sx={{ width: 16, height: 16, marginRight: 8 }} />
            {i18n.t('components.chart_export.k0')} {format.label}
          </MenuItem>
        ))}
        <MenuItem onClick={handleCopy}>
          {copied ? (
            <>
              <Check sx={{ width: 16, height: 16, marginRight: 8, color: 'success.main' }} />
              {i18n.t('components.chart_export.k1')}
            </>
          ) : (
            <>
              <Copy sx={{ width: 16, height: 16, marginRight: 8 }} />
              {i18n.t('components.chart_export.k2')}
            </>
          )}
        </MenuItem>
      </Menu>
    </>
  );
};
