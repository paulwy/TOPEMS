import { useState } from 'react';
import {
  Image,
  Download,
  FileImage,
  Copy,
  Check,
} from 'lucide-react';
import { Menu, MenuItem, Button } from '@mui/material';
import { logger } from '@/utils/logger';

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
      alert('导出失败，请重试');
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
      alert('复制失败，请重试');
    }
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={(e) => setAnchorEl(e.currentTarget)}
        title='导出图表'
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
          <span style={{ fontSize: 12, fontWeight: 500, color: 'text.secondary' }}>导出格式</span>
        </MenuItem>
        {exportFormats.map((format) => (
          <MenuItem
            key={format.id}
            onClick={() => handleExport(format.id, format.mimeType)}
          >
            <FileImage sx={{ width: 16, height: 16, marginRight: 8 }} />
            导出为 {format.label}
          </MenuItem>
        ))}
        <MenuItem onClick={handleCopy}>
          {copied ? (
            <>
              <Check sx={{ width: 16, height: 16, marginRight: 8, color: 'success.main' }} />
              已复制
            </>
          ) : (
            <>
              <Copy sx={{ width: 16, height: 16, marginRight: 8 }} />
              复制到剪贴板
            </>
          )}
        </MenuItem>
      </Menu>
    </>
  );
};
