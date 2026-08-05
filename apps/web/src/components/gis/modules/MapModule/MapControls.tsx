// modules/MapModule/MapControls.tsx
import React from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Box, IconButton } from '@mui/material';

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  bounds?: [number, number][] | undefined;
  onFitBounds: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  zoom,
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
        aria-label='放大'
        title='放大'
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
        aria-label='缩小'
        title='缩小'
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
          aria-label='缩放到所有标记'
          title='缩放到所有标记'
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
