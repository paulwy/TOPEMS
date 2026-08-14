// modules/MapModule/MapView.tsx
import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTheme } from '@mui/material';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  Rectangle,
} from 'react-leaflet';
import i18n from '@/i18n';
import { MapPin, Info, Navigation, X } from 'lucide-react';
import type { DevicePoint, Pipeline, StorageLocation, GeoJSONFeature } from '../../../../api/gis';
import type { DrawFeature } from '../shared/types';
import { EARTH } from '@topems/shared-constants';
import MapEvents from './MapEvents';
import MapControls from './MapControls';
import LayerManager from './LayerManager';
import ToolPanel from './ToolPanel';
import HeatmapLayer, { HeatmapLegend } from '../HeatmapModule/HeatmapLayer';
// C3 §5 P1-2: Map3DView 按需懒加载，将 three.js + @react-three/* 拆分为独立 chunk
const Map3DView = lazy(() => import('../../Map3DView'));
import AmapLayer from '../../AmapLayer';
import DeviceTrackPanel from '../../DeviceTrackPanel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { designTokens, semanticTokens } from '@topems/tokens';

type ToolMode =
  'select' | 'measure-distance' | 'measure-area' | 'draw-point' | 'draw-line' | 'draw-polygon';

interface MapViewProps {
  devicePoints?: DevicePoint[];
  pipelines?: Pipeline[];
  storageLocations?: StorageLocation[];
  onMarkerClick?: (item: DevicePoint | StorageLocation) => void;
}

// Utility functions
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateTotalDistance = (points: [number, number][]): number => {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  return total;
};

const calculateArea = (points: [number, number][]): number => {
  if (points.length < 3) return 0;
  let area = 0;
  const R = EARTH.RADIUS_METERS;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = (points[i][0] * Math.PI) / 180;
    const lng1 = (points[i][1] * Math.PI) / 180;
    const lat2 = (points[j][0] * Math.PI) / 180;
    const lng2 = (points[j][1] * Math.PI) / 180;
    area += lng1 * Math.sin(lat2) - lng2 * Math.sin(lat1);
  }
  return Math.abs((R * R * area) / 2);
};

const formatDistance = (meters: number): string => {
  if (meters < EARTH.METERS_PER_KILOMETER) {
    return `${meters.toFixed(2)}${i18n.t('components.map_view.k0')}`;
  }
  return `${(meters / EARTH.METERS_PER_KILOMETER).toFixed(2)}${i18n.t('components.map_view.k1')}`;
};

const formatArea = (squareMeters: number): string => {
  if (squareMeters < EARTH.SQUARE_METERS_PER_HECTARE) {
    return `${squareMeters.toFixed(2)}${i18n.t('components.map_view.k2')}`;
  }
  return `${(squareMeters / EARTH.SQUARE_METERS_PER_HECTARE).toFixed(2)}${i18n.t('components.map_view.k3')}`;
};

const getStatusColor = (status: string) => {
  if (!status) return 'text.secondary';
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes(i18n.t('gis.map_view.k0'))) return '#00C897';
  if (s.includes('pending') || s.includes(i18n.t('gis.map_view.k1'))) return 'warning.main';
  if (s.includes('inactive') || s.includes(i18n.t('gis.map_view.k2'))) return 'error.main';
  return 'text.secondary';
};

// Icons
const createDeviceIcon = () =>
  new L.Icon({
    iconUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300C897'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

const createStorageIcon = () =>
  new L.Icon({
    iconUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'/%3E%3C/svg%3E",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });

// Measure Tooltip Component
const MeasureTooltip: React.FC<{
  position: [number, number];
  content: string;
}> = ({ position, content }) => (
  <div
    style={{
      position: 'absolute',
      backgroundColor: 'var(--mui-palette-grey-800)',
      color: 'var(--mui-palette-common-white)',
      fontSize: '0.75rem',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      boxShadow: `0 10px 15px -3px ${designTokens.colors.action.selected}, 0 4px 6px -2px ${designTokens.colors.action.hover}`,
      pointerEvents: 'none',
      zIndex: 50,
      left: position[1] + 10,
      top: position[0] - 20,
      transform: 'translateX(-50%)',
    }}
  >
    {content}
  </div>
);

// Details Panel Component
const DetailsPanel: React.FC<{
  selectedItem: DevicePoint | StorageLocation | null;
  onClose: () => void;
}> = ({ selectedItem, onClose }) => {
  const theme = useTheme();
  if (!selectedItem) return null;

  const formatCoordinate = (value: number) => value.toFixed(6);

  const getStatusStyles = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes(i18n.t('gis.map_view.k3'))) {
      return {
        backgroundColor: 'success.lighter',
        color: 'success.800',
      };
    }
    if (s.includes('pending') || s.includes(i18n.t('gis.map_view.k4'))) {
      return {
        backgroundColor: 'warning.light',
        color: 'warning.800',
      };
    }
    return {
      backgroundColor: 'error.lighter',
      color: 'error.800',
    };
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        width: '20rem',
        backgroundColor: 'common.white',
        borderRadius: '0.75rem',
        boxShadow: `0 20px 25px -5px ${designTokens.colors.action.selected}, 0 10px 10px -5px ${designTokens.colors.action.hover}`,
        overflow: 'hidden',
        border: '1px solid grey.200',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: `linear-gradient(to right, ${designTokens.colors.cyan['500']}, primary.main)`,
        }}
      >
        <h3 style={{ fontWeight: 600, color: 'common.white', margin: 0 }}>{i18n.t('gis.map_view.k5')}</h3>
        <button
          onClick={onClose}
          style={{
            padding: '0.25rem',
            borderRadius: '0.25rem',
            transition: 'background-color 0.2s',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'glass.topLight';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <X style={{ width: '1.25rem', height: '1.25rem', color: 'common.white' }} />
        </button>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
              marginBottom: '0.25rem',
            }}
          >
            {i18n.t('components.map_view.k0')}
          </div>
          <div style={{ fontWeight: 500, color: theme.palette.text.primary }}>
            {selectedItem.name}
          </div>
        </div>
        {'device_type' in selectedItem && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k1')}
            </div>
            <div style={{ color: 'var(--mui-palette-text-secondary)' }}>
              {selectedItem.device_type}
            </div>
          </div>
        )}
        {'location_type' in selectedItem && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k2')}
            </div>
            <div style={{ color: 'var(--mui-palette-text-secondary)' }}>
              {selectedItem.location_type}
            </div>
          </div>
        )}
        {'status' in selectedItem && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k3')}
            </div>
            <span
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 500,
                ...getStatusStyles(selectedItem.status),
              }}
            >
              {selectedItem.status}
            </span>
          </div>
        )}
        {'capacity' in selectedItem && selectedItem.capacity !== undefined && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k4')}
            </div>
            <div style={{ color: 'var(--mui-palette-text-secondary)' }}>
              {selectedItem.capacity}
            </div>
          </div>
        )}
        {'current_usage' in selectedItem && selectedItem.current_usage !== undefined && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k5')}
            </div>
            <div style={{ color: 'var(--mui-palette-text-secondary)' }}>
              {selectedItem.current_usage}
            </div>
          </div>
        )}
        {'description' in selectedItem && selectedItem.description && (
          <div style={{ marginBottom: '1rem' }}>
            <div
              style={{
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k6')}
            </div>
            <div style={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>
              {selectedItem.description}
            </div>
          </div>
        )}
        <div
          style={{
            paddingTop: '0.5rem',
            borderTop: '1px solid grey.200',
          }}
        >
          <div
            style={{
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
              marginBottom: '0.25rem',
            }}
          >
            {i18n.t('components.map_view.k7')}
          </div>
          <div
            style={{
              color: 'var(--mui-palette-text-secondary)',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          >
            {formatCoordinate(selectedItem.latitude)}, {formatCoordinate(selectedItem.longitude)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Main MapView Component
const MapView: React.FC<MapViewProps> = ({
  devicePoints = [],
  pipelines = [],
  storageLocations = [],
  onMarkerClick,
}) => {
  // State
  const [mapCenter] = useState<[number, number]>([39.9, 116.4]); // 北京
  const theme = useTheme();
  const [zoom, setZoom] = useState(10); // 在离线瓦片范围内
  const [selectedItem, setSelectedItem] = useState<DevicePoint | StorageLocation | null>(null);
  const [, setShowDetailsPanel] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState({
    devices: true,
    pipelines: true,
    storage: true,
  });
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureResult, setMeasureResult] = useState<string>('');
  const [drawFeatures, setDrawFeatures] = useState<DrawFeature[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawFeature | null>(null);
  const [showMeasureTooltip, setShowMeasureTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<[number, number]>([0, 0]);
  const [showTrackPanel, setShowTrackPanel] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<'density' | 'status'>('density');
  const [mapType, setMapType] = useState<'osm' | 'amap'>('osm');
  const [show3DView, setShow3DView] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true); // 默认使用离线瓦片

  // Icons
  const deviceIcon = useMemo(() => createDeviceIcon(), []);
  const storageIcon = useMemo(() => createStorageIcon(), []);

  // Tool handlers
  const setTool = useCallback((tool: ToolMode) => {
    setToolMode(tool);
    if (tool === 'select') {
      setMeasurePoints([]);
      setMeasureResult('');
      setShowMeasureTooltip(false);
      setCurrentDrawing(null);
    }
  }, []);

  const clearMeasure = useCallback(() => {
    setMeasurePoints([]);
    setMeasureResult('');
    setShowMeasureTooltip(false);
  }, []);

  const clearDrawings = useCallback(() => {
    setDrawFeatures([]);
    setCurrentDrawing(null);
  }, []);

  const finishDrawing = useCallback(() => {
    if (
      currentDrawing &&
      currentDrawing.points.length >= (currentDrawing.type === 'point' ? 1 : 2)
    ) {
      setDrawFeatures([...drawFeatures, currentDrawing]);
    }
    setCurrentDrawing(null);
  }, [currentDrawing, drawFeatures]);

  const toggleLayer = useCallback((layer: 'devices' | 'pipelines' | 'storage') => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleMarkerClick = useCallback(
    (item: DevicePoint | StorageLocation) => {
      if (toolMode !== 'select') return;
      setSelectedItem(item);
      setShowDetailsPanel(true);
      onMarkerClick?.(item);
    },
    [toolMode, onMarkerClick]
  );

  const closeDetailsPanel = useCallback(() => {
    setShowDetailsPanel(false);
    setSelectedItem(null);
  }, []);

  // Calculate bounds
  const calculateBounds = useCallback((): [number, number][] | undefined => {
    const allPoints: [number, number][] = [];
    if (visibleLayers.devices) {
      devicePoints.forEach((p) => allPoints.push([p.latitude, p.longitude]));
    }
    if (visibleLayers.storage) {
      storageLocations.forEach((s) => allPoints.push([s.latitude, s.longitude]));
    }
    if (allPoints.length > 0) {
      const lats = allPoints.map((p) => p[0]);
      const lngs = allPoints.map((p) => p[1]);
      return [
        [Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
        [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01],
      ];
    }
    return undefined;
  }, [visibleLayers, devicePoints, storageLocations]);

  const bounds = useMemo(() => calculateBounds(), [calculateBounds]);

  // Export functions
  const exportGeoJSON = useCallback(
    (drawOnly: boolean = false) => {
      const features: GeoJSONFeature[] = [];

      if (!drawOnly) {
        if (visibleLayers.devices) {
          devicePoints.forEach((point) => {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [point.longitude, point.latitude],
              },
              properties: {
                id: point.id,
                name: point.name,
                type: 'device',
                device_type: point.device_type,
                status: point.status,
                description: point.description,
                created_at: point.created_at,
                updated_at: point.updated_at,
              },
            });
          });
        }

        if (visibleLayers.storage) {
          storageLocations.forEach((location) => {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude],
              },
              properties: {
                id: location.id,
                name: location.name,
                type: 'storage',
                location_type: location.location_type,
                capacity: location.capacity,
                current_usage: location.current_usage,
                created_at: location.created_at,
                updated_at: location.updated_at,
              },
            });
          });
        }

        if (visibleLayers.pipelines) {
          pipelines.forEach((pipeline) => {
            if (pipeline.start_point && pipeline.end_point) {
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [pipeline.start_point[1], pipeline.start_point[0]],
                    [pipeline.end_point[1], pipeline.end_point[0]],
                  ],
                },
                properties: {
                  id: pipeline.id,
                  name: pipeline.name,
                  type: 'pipeline',
                  pipeline_type: pipeline.pipeline_type,
                  status: pipeline.status,
                  code: pipeline.code,
                  created_at: pipeline.created_at,
                  updated_at: pipeline.updated_at,
                },
              });
            }
          });
        }
      }

      const allDrawFeatures = [...drawFeatures];
      if (currentDrawing) {
        allDrawFeatures.push(currentDrawing);
      }

      allDrawFeatures.forEach((feature) => {
        let geometryType: 'Point' | 'LineString' | 'Polygon' = 'Point';
        let coordinates: unknown = [0, 0];

        if (feature.type === 'point') {
          geometryType = 'Point';
          coordinates = [feature.points[0].lng, feature.points[0].lat];
        } else if (feature.type === 'line') {
          geometryType = 'LineString';
          coordinates = feature.points.map((p) => [p.lng, p.lat]);
        } else if (feature.type === 'polygon') {
          geometryType = 'Polygon';
          const polygonCoords: number[][] = feature.points.map((p) => [p.lng, p.lat]);
          polygonCoords.push([feature.points[0].lng, feature.points[0].lat]);
          coordinates = [polygonCoords];
        }

        features.push({
          type: 'Feature',
          geometry: {
            type: geometryType,
            coordinates: coordinates as number[] | number[][] | number[][][],
          },
          properties: {
            id: feature.id,
            name: feature.label || 'Drawing',
            type: `drawing_${feature.type}`,
            color: feature.color,
            timestamp: Date.now(),
          },
        });
      });

      const geojson = {
        type: 'FeatureCollection',
        features,
        generated_at: new Date().toISOString(),
        source: 'TOPEMS GIS Module',
      };

      const blob = new Blob([JSON.stringify(geojson, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gis-export-${drawOnly ? 'drawings' : 'data'}-${Date.now()}.geojson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [visibleLayers, devicePoints, storageLocations, pipelines, drawFeatures, currentDrawing]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setToolMode('select');
        clearMeasure();
        setCurrentDrawing(null);
      }
      if (e.key === 'Enter' && currentDrawing) {
        finishDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDrawing, clearMeasure, finishDrawing]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map Type Switch */}
      {mapType === 'amap' ? (
        <AmapLayer
          devicePoints={devicePoints}
          storageLocations={storageLocations}
          center={[mapCenter[1], mapCenter[0]]}
          zoom={zoom}
        />
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
        >
          <MapEvents
            toolMode={toolMode}
            measurePoints={measurePoints}
            setMeasurePoints={setMeasurePoints}
            setMeasureResult={setMeasureResult}
            currentDrawing={currentDrawing}
            setCurrentDrawing={setCurrentDrawing}
            drawFeatures={drawFeatures}
            setDrawFeatures={setDrawFeatures}
            setTooltipPosition={setTooltipPosition}
            setShowMeasureTooltip={setShowMeasureTooltip}
            bounds={bounds}
            calculateTotalDistance={calculateTotalDistance}
            calculateArea={calculateArea}
            formatDistance={formatDistance}
            formatArea={formatArea}
          />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url={
              offlineMode
                ? '/offline_tiles/amap/{z}/{x}/{y}.png'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />

          {/* Pipelines */}
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
                  color={designTokens.colors.secondary.dark}
                  weight={4}
                  opacity={0.8}
                >
                  <Tooltip
                    direction='top'
                    offset={[0, -10]}
                  >
                    <div
                      style={{
                        backgroundColor: 'common.white',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        boxShadow:
                          `0 10px 15px -3px ${designTokens.colors.action.selected}, 0 4px 6px -2px ${designTokens.colors.action.hover}`,
                        minWidth: '120px',
                      }}
                    >
                      <div style={{ fontWeight: 500, color: theme.palette.text.primary }}>
                        {pipeline.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>
                        {pipeline.pipeline_type}
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

          {/* Device Markers */}
          {visibleLayers.devices &&
            devicePoints.map((point) => (
              <Marker
                key={point.id}
                position={[point.latitude, point.longitude]}
                icon={deviceIcon}
                eventHandlers={{ click: () => handleMarkerClick(point) }}
              >
                <Popup>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxWidth: '320px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <MapPin
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          color: theme.palette.success.dark,
                        }}
                      />
                      <h4 style={{ fontWeight: 600, color: theme.palette.text.primary, margin: 0 }}>
                        {point.name}
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>
                      <div>类型: {point.device_type}</div>
                      <div>
                        [i18n.t('components.map_view.k8')]:{' '}
                        <span style={{ color: getStatusColor(point.status) }}>{point.status}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        <Navigation style={{ width: '0.75rem', height: '0.75rem' }} />
                        {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                      </div>
                    </div>
                    {point.description && (
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: theme.palette.text.secondary,
                          borderTop: '1px solid grey.200',
                          paddingTop: '0.5rem',
                          marginTop: '0.5rem',
                        }}
                      >
                        {point.description}
                      </div>
                    )}
                    <button
                      onClick={() => handleMarkerClick(point)}
                      style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.875rem',
                        color: 'cyan.600',
                        backgroundColor: 'cyan.50',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = designTokens.colors.cyan[100];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = designTokens.colors.cyan[50];
                      }}
                    >
                      {i18n.t('components.map_view.k9')}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Storage Markers */}
          {visibleLayers.storage &&
            storageLocations.map((location) => (
              <Marker
                key={location.id}
                position={[location.latitude, location.longitude]}
                icon={storageIcon}
                eventHandlers={{ click: () => handleMarkerClick(location) }}
              >
                <Popup>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      maxWidth: '320px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Info
                        style={{
                          width: '1.25rem',
                          height: '1.25rem',
                          color: theme.palette.warning.main,
                        }}
                      />
                      <h4 style={{ fontWeight: 600, color: theme.palette.text.primary, margin: 0 }}>
                        {location.name}
                      </h4>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>
                      <div>类型: {location.location_type}</div>
                      {location.capacity !== undefined && <div>容量: {location.capacity}</div>}
                      {location.current_usage !== undefined && (
                        <div>当前: {location.current_usage}</div>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        <Navigation style={{ width: '0.75rem', height: '0.75rem' }} />
                        {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleMarkerClick(location)}
                      style={{
                        width: '100%',
                        marginTop: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.875rem',
                        color: 'cyan.600',
                        backgroundColor: 'cyan.50',
                        borderRadius: '0.25rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = designTokens.colors.cyan[100];
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = designTokens.colors.cyan[50];
                      }}
                    >
                      {i18n.t('components.map_view.k10')}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

          {/* Measure Polylines */}
          {toolMode === 'measure-distance' && measurePoints.length > 0 && (
            <Polyline
              positions={measurePoints}
              color='error.main'
              weight={2}
              dashArray='5,5'
            />
          )}

          {/* Measure Area */}
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

          {/* Draw Features */}
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

          {/* Current Drawing */}
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
                    [currentDrawing.points[0].lat, currentDrawing.points[0].lng] as [
                      number,
                      number,
                    ],
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

          {/* Heatmap */}
          {showHeatmap && (
            <HeatmapLayer
              devicePoints={devicePoints}
              storageLocations={storageLocations}
              visible={showHeatmap}
              intensityMode={heatmapMode}
            />
          )}
        </MapContainer>
      )}

      {/* Tool Panel */}
      <ToolPanel
        toolMode={toolMode}
        onSetTool={setTool}
        onClearMeasure={clearMeasure}
        onClearDrawings={clearDrawings}
        onFinishDrawing={finishDrawing}
        onExportGeoJSON={() => exportGeoJSON(false)}
        onExportDrawings={() => exportGeoJSON(true)}
        onToggleTrackPanel={() => setShowTrackPanel(true)}
        onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
        onToggle3DView={() => setShow3DView(true)}
        onToggleMapType={() => setMapType(mapType === 'osm' ? 'amap' : 'osm')}
        onToggleOfflineMode={() => setOfflineMode(!offlineMode)}
        showTrackPanel={showTrackPanel}
        showHeatmap={showHeatmap}
        mapType={mapType}
        offlineMode={offlineMode}
        measurePointsLength={measurePoints.length}
        drawFeaturesLength={drawFeatures.length}
        currentDrawing={currentDrawing}
        heatmapMode={heatmapMode}
        onSetHeatmapMode={setHeatmapMode}
      />

      {/* Measure Result Display */}
      {(toolMode === 'measure-distance' || toolMode === 'measure-area') && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '8rem',
            backgroundColor: 'common.white',
            borderRadius: '0.5rem',
            boxShadow: `0 4px 6px -1px ${designTokens.colors.action.selected}, 0 2px 4px -1px ${designTokens.colors.action.hover}`,
            padding: '0.5rem 1rem',
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--mui-palette-text-secondary)',
            }}
          >
            {measureResult}
          </span>
        </div>
      )}

      {/* Tool Mode Hint */}
      {toolMode !== 'select' && (
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            backgroundColor: 'warning.lighter',
            border: `1px solid ${designTokens.colors.warning[200]}`,
            borderRadius: '0.5rem',
            padding: '0.5rem 1rem',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'yellow.700' }}>
            {i18n.t('components.map_view.k11')}
          </span>
        </div>
      )}

      {/* Map Controls */}
      <MapControls
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z + 1, 18))}
        onZoomOut={() => setZoom((z) => Math.max(z - 1, 1))}
        bounds={bounds}
        onFitBounds={() => {
          if (bounds && bounds.length >= 2) {
            // Will be handled by MapEvents
          }
        }}
      />

      {/* Layer Manager */}
      <LayerManager
        visibleLayers={visibleLayers}
        onToggleLayer={toggleLayer}
        showPanel={showLayerPanel}
        onTogglePanel={() => setShowLayerPanel(!showLayerPanel)}
        drawFeaturesLength={drawFeatures.length}
      />

      {/* Details Panel */}
      <DetailsPanel
        selectedItem={selectedItem}
        onClose={closeDetailsPanel}
      />

      {/* Measure Tooltip */}
      {showMeasureTooltip && (
        <MeasureTooltip
          position={tooltipPosition}
          content={measureResult}
        />
      )}

      {/* Track Panel Modal */}
      {showTrackPanel && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'action.active',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'common.white',
              borderRadius: '0.75rem',
              boxShadow: designTokens.shadows['2xl'],
              width: '90%',
              maxWidth: '1024px',
              height: '80%',
              maxHeight: '600px',
              overflow: 'hidden',
            }}
          >
            <DeviceTrackPanel
              devicePoints={devicePoints}
              onClose={() => setShowTrackPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Heatmap Legend */}
      {showHeatmap && (
        <div style={{ position: 'absolute', bottom: '1rem', right: '6rem' }}>
          <HeatmapLegend mode={heatmapMode} />
        </div>
      )}

      {/* 3D View Modal */}
      {show3DView && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'action.active',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'common.white',
              borderRadius: '0.75rem',
              boxShadow: designTokens.shadows['2xl'],
              width: '95%',
              maxWidth: '1152px',
              height: '90%',
              maxHeight: '700px',
              overflow: 'hidden',
            }}
          >
            <Suspense fallback={null}>
              <Map3DView
                devicePoints={devicePoints}
                pipelines={pipelines}
                storageLocations={storageLocations}
                onClose={() => setShow3DView(false)}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
