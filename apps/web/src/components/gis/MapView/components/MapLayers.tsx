import React from 'react';
import { Marker, Polyline, Popup, Tooltip, Rectangle } from 'react-leaflet';
import { MapPin, Info, Navigation } from 'lucide-react';
import { Box as MuiBox, Typography, Paper, Button, useTheme } from '@mui/material';
import L from 'leaflet';
import type { DevicePoint, Pipeline, StorageLocation } from '../../../../api/gis';
import type { ToolMode, DrawFeature, VisibleLayers } from '../types';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';

const ct = designTokens.colors;

const deviceIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(ct.success.main)}'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const storageIcon = new L.Icon({
  iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${encodeURIComponent(ct.warning.main)}'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'/%3E%3C/svg%3E`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const getStatusColor = (status: string) => {
  if (!status) return 'text.secondary';
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes(i18n.t('gis.map_layers.k0'))) return ct.success.main;
  if (s.includes('pending') || s.includes(i18n.t('gis.map_layers.k1'))) return 'warning.main';
  if (s.includes('inactive') || s.includes(i18n.t('gis.map_layers.k2'))) return 'error.main';
  return 'text.secondary';
};

interface MapLayersProps {
  devicePoints: DevicePoint[];
  pipelines: Pipeline[];
  storageLocations: StorageLocation[];
  visibleLayers: VisibleLayers;
  toolMode: ToolMode;
  measurePoints: [number, number][];
  drawFeatures: DrawFeature[];
  currentDrawing: DrawFeature | null;
  showHeatmap: boolean;
  heatmapMode: 'density' | 'status';
  leafletMapRef: React.RefObject<L.Map | null>;
  onMarkerClick: (item: DevicePoint | StorageLocation) => void;
}

const MapLayers: React.FC<MapLayersProps> = ({
  devicePoints,
  pipelines,
  storageLocations,
  visibleLayers,
  toolMode,
  measurePoints,
  drawFeatures,
  currentDrawing,
  onMarkerClick,
}) => {
  const theme = useTheme();

  return (
    <>
      {visibleLayers.pipelines &&
        pipelines.map((pipeline) => {
          const pathCoords: [number, number][] = [];
          if (pipeline.start_point && pipeline.end_point) {
            const startLat = pipeline.start_point[0];
            const startLng = pipeline.start_point[1];
            const endLat = pipeline.end_point[0];
            const endLng = pipeline.end_point[1];
            if (
              startLat !== undefined &&
              startLng !== undefined &&
              endLat !== undefined &&
              endLng !== undefined
            ) {
              pathCoords.push([startLat, startLng]);
              pathCoords.push([endLat, endLng]);
            }
          }
          if (pathCoords.length < 2) return null;
          return (
            <Polyline
              key={pipeline.id}
              positions={pathCoords}
              color={ct.secondary[400]}
              weight={4}
              opacity={0.8}
            >
              <Tooltip
                direction='top'
                offset={[0, -10]}
              >
                <Paper
                  sx={{
                    backgroundColor: 'common.white',
                    padding: `${designTokens.spacing.sm} 12px`,
                    borderRadius: 2,
                    boxShadow: designTokens.shadows.lg,
                    minWidth: '120px',
                  }}
                >
                  <Typography
                    variant='body1'
                    sx={{
                      fontWeight: 'medium',
                      color: 'text.primary',
                    }}
                  >
                    {pipeline.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.secondary',
                    }}
                  >
                    {pipeline.pipeline_type}
                  </Typography>
                </Paper>
              </Tooltip>
            </Polyline>
          );
        })}

      {visibleLayers.devices &&
        devicePoints.map((point) => (
          <Marker
            key={point.id}
            position={[point.latitude, point.longitude]}
            icon={deviceIcon}
            eventHandlers={{ click: () => onMarkerClick(point) }}
          >
            <Popup>
              <MuiBox sx={{ maxWidth: '320px' }}>
                <MuiBox
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <MapPin
                    size={20}
                    style={{ color: ct.success.main }}
                  />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'semibold', color: 'text.primary' }}
                  >
                    {point.name}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant='body2'>{i18n.t('components.map_layers.k0')}</Typography>
                  <Typography variant='body2'>
                    {i18n.t('components.map_layers.k0')}:{' '}
                    <span style={{ color: getStatusColor(point.status) }}>{point.status}</span>
                  </Typography>
                  <MuiBox
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Navigation size={12} />
                    <Typography variant='body2'>
                      {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                    </Typography>
                  </MuiBox>
                </MuiBox>
                {point.description && (
                  <MuiBox
                    sx={{
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                      color: 'text.secondary',
                      borderTop: '1px solid grey.200',
                      paddingTop: 1,
                      marginTop: 1,
                    }}
                  >
                    {point.description}
                  </MuiBox>
                )}
                <Button
                  fullWidth
                  onClick={() => onMarkerClick(point)}
                  sx={{
                    mt: 1,
                    color: ct.info[700],
                    backgroundColor: ct.info[100],
                    '&:hover': {
                      backgroundColor: ct.info[50],
                    },
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  }}
                >
                  {i18n.t('components.map_layers.k1')}
                </Button>
              </MuiBox>
            </Popup>
          </Marker>
        ))}

      {visibleLayers.storage &&
        storageLocations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={storageIcon}
            eventHandlers={{ click: () => onMarkerClick(location) }}
          >
            <Popup>
              <MuiBox sx={{ maxWidth: '320px' }}>
                <MuiBox
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Info
                    size={20}
                    style={{ color: theme.palette.warning.main }}
                  />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 'semibold', color: 'text.primary' }}
                  >
                    {location.name}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant='body2'>{i18n.t('components.map_layers.k1')}</Typography>
                  {location.capacity !== undefined && (
                    <Typography variant='body2'>{i18n.t('components.map_layers.k2')}</Typography>
                  )}
                  {location.current_usage !== undefined && (
                    <Typography variant='body2'>{i18n.t('components.map_layers.k3')}</Typography>
                  )}
                  <MuiBox
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    <Navigation size={12} />
                    <Typography variant='body2'>
                      {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                    </Typography>
                  </MuiBox>
                </MuiBox>
                <Button
                  fullWidth
                  onClick={() => onMarkerClick(location)}
                  sx={{
                    mt: 1,
                    color: ct.info[700],
                    backgroundColor: ct.info[100],
                    '&:hover': {
                      backgroundColor: ct.info[50],
                    },
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}px`,
                  }}
                >
                  {i18n.t('components.map_layers.k2')}
                </Button>
              </MuiBox>
            </Popup>
          </Marker>
        ))}

      {toolMode === 'measure-distance' && measurePoints.length > 0 && (
        <Polyline
          positions={measurePoints}
          color='error.main'
          weight={2}
          dashArray='5,5'
        />
      )}

      {toolMode === 'measure-area' && measurePoints.length > 2 && (
        <Rectangle
          bounds={[
            [
              Math.min(...measurePoints.map((p) => p[0])),
              Math.min(...measurePoints.map((p) => p[1])),
            ],
            [
              Math.max(...measurePoints.map((p) => p[0])),
              Math.max(...measurePoints.map((p) => p[1])),
            ],
          ]}
          color='warning.main'
          weight={2}
          fillOpacity={0.1}
        />
      )}

      {toolMode === 'measure-area' && measurePoints.length > 1 && (
        <Polyline
          positions={[...measurePoints, measurePoints[0]]}
          color='warning.main'
          weight={2}
          dashArray='5,5'
        />
      )}

      {drawFeatures.map((feature) => {
        if (feature.type === 'point') {
          return (
            <Marker
              key={feature.id}
              position={[feature.points[0].lat, feature.points[0].lng]}
              icon={
                new L.Icon({
                  iconUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${feature.color}'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3C/svg%3E`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })
              }
            />
          );
        }
        const coords = feature.points.map((p) => [p.lat, p.lng] as [number, number]);
        if (feature.type === 'line') {
          return (
            <Polyline
              key={feature.id}
              positions={coords}
              color={feature.color}
              weight={3}
            />
          );
        }
        if (feature.type === 'polygon') {
          return (
            <Polyline
              key={feature.id}
              positions={[...coords, coords[0]]}
              color={feature.color}
              weight={3}
              fill={true}
              fillOpacity={0.2}
            />
          );
        }
        return null;
      })}

      {currentDrawing && (
        <>
          {currentDrawing.type === 'line' && (
            <Polyline
              positions={currentDrawing.points.map((p) => [p.lat, p.lng] as [number, number])}
              color={currentDrawing.color}
              weight={3}
              dashArray='5,5'
            />
          )}
          {currentDrawing.type === 'polygon' && currentDrawing.points.length > 1 && (
            <Polyline
              positions={[
                ...currentDrawing.points.map((p) => [p.lat, p.lng] as [number, number]),
                [currentDrawing.points[0].lat, currentDrawing.points[0].lng] as [number, number],
              ]}
              color={currentDrawing.color}
              weight={3}
              dashArray='5,5'
              fill={true}
              fillOpacity={0.1}
            />
          )}
        </>
      )}
    </>
  );
};

export default MapLayers;
