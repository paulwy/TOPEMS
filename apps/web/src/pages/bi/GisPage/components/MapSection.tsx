import React from 'react';
import { Paper, Box, CircularProgress } from '@mui/material';
import MapView from '@/components/gis/MapView';
import type { DevicePoint, Pipeline, StorageLocation } from '@/api/gis';

interface MapSectionProps {
  loading: boolean;
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
  onMarkerClick: (item: DevicePoint | StorageLocation) => void;
}

export const MapSection: React.FC<MapSectionProps> = ({
  loading,
  devicePoints,
  pipelines,
  storageLocations,
  onMarkerClick,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.5,
        overflow: 'hidden',
        height: 500,
        position: 'relative',
      }}
    >
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}
        >
          <CircularProgress sx={{ color: 'info.main' }} />
        </Box>
      ) : (
        <MapView
          devicePoints={devicePoints}
          pipelines={pipelines}
          storageLocations={storageLocations}
          onMarkerClick={(item) => onMarkerClick(item)}
        />
      )}
    </Paper>
  );
};
