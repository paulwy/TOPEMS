// modules/MapModule/MapControls.tsx
import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Box, IconButton } from '@mui/material';
import i18n from '@/i18n';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  bounds?: [number, number][] | undefined;
  onFitBounds: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  zoom: _zoom,
  onZoomIn,
  onZoomOut,
  bounds,
  onFitBounds,
}) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <IconButton
        onClick={onZoomIn}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 2,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label={i18n.t('gis.map_controls.k0')}
        title={i18n.t('gis.map_controls.k1')}
      >
        <ZoomIn
          size={20}
          sx={{ color: 'text.secondary' }}
        />
      </IconButton>
      <IconButton
        onClick={onZoomOut}
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 2,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label={i18n.t('gis.map_controls.k2')}
        title={i18n.t('gis.map_controls.k3')}
      >
        <ZoomOut
          size={20}
          sx={{ color: 'text.secondary' }}
        />
      </IconButton>
      {bounds && bounds.length >= 2 && (
        <IconButton
          onClick={onFitBounds}
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
          aria-label={i18n.t('gis.map_controls.k4')}
          title={i18n.t('gis.map_controls.k5')}
        >
          <Maximize2
            size={20}
            sx={{ color: 'text.secondary' }}
          />
        </IconButton>
      )}
    </Box>
  );
};

export default MapControls;
