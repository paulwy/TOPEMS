import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Typography, Box, Button, useTheme } from '@mui/material';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface FullscreenChartProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

export const FullscreenChart = ({ children, title, onClose }: FullscreenChartProps) => {
  const theme = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  if (!isFullscreen) {
    return (
      <div style={{ position: 'relative' }}>
        {children}
        <button
          onClick={() => setIsFullscreen(true)}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: 8,
            backgroundColor: 'common.white',
            borderRadius: 8,
            border: 'none',
            boxShadow: designTokens.shadows.sm,
            opacity: '0',
            transition: 'opacity 0.2s',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
          title={i18n.t('shared.fullscreen_chart.k0')}
        >
          <Maximize2 style={{ width: 16, height: 16, color: theme.palette.text.secondary }} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        backgroundColor: 'common.white',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 2,
          borderBottom: `1px solid ${designTokens.colors.action.selected}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold' }}
          >
            {title || i18n.t('shared.fullscreen_chart.k1')}
          </Typography>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Button
            variant='text'
            size='small'
            onClick={handleZoomOut}
            title={i18n.t('shared.fullscreen_chart.k2')}
          >
            <ZoomOut sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={handleResetZoom}
            title={i18n.t('shared.fullscreen_chart.k3')}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                width: 24,
                textAlign: 'center',
              }}
            >
              {Math.round(scale * 100)}%
            </span>
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={handleZoomIn}
            title={i18n.t('shared.fullscreen_chart.k4')}
          >
            <ZoomIn sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={() => setIsFullscreen(false)}
            title={i18n.t('shared.fullscreen_chart.k5')}
          >
            <Minimize2 sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant='text'
            size='small'
            onClick={() => {
              setIsFullscreen(false);
              onClose?.();
            }}
            sx={{ color: 'error.main' }}
            title={i18n.t('shared.fullscreen_chart.k6')}
          >
            <X sx={{ width: 16, height: 16 }} />
          </Button>
        </div>
      </Box>
      <div
        style={{
          flex: 1,
          padding: 32,
          overflow: 'auto',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          minHeight: `${100 / scale}vh`,
          minWidth: `${100 / scale}vw`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FullscreenChart;
