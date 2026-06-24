import React, { useState, useRef, useCallback, useEffect, useMemo, useId } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
  Rectangle,
} from 'react-leaflet';
import {
  MapPin,
  Info,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Globe,
  X,
  ChevronDown,
  ChevronUp,
  Ruler,
  Pencil,
  Eraser,
  Trash2,
  PlayCircle,
  Download,
  FileJson,
  Thermometer,
  Box,
} from 'lucide-react';
import { Box as MuiBox, Typography, Paper, Chip, IconButton } from '@mui/material';
import { Button } from '@mui/material';
import type { DevicePoint, Pipeline, StorageLocation, GeoJSONFeature } from '../../api/gis';
import DeviceTrackPanel from './DeviceTrackPanel';
import HeatmapLayer, { HeatmapLegend } from './HeatmapLayer';
import Map3DView from './Map3DView';
import AmapLayer from './AmapLayer';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

interface MapViewProps {
  devicePoints?: DevicePoint[];
  pipelines?: Pipeline[];
  storageLocations?: StorageLocation[];
  onMarkerClick?: (item: DevicePoint | StorageLocation) => void;
}

type ToolMode =
  | 'select'
  | 'measure-distance'
  | 'measure-area'
  | 'draw-point'
  | 'draw-line'
  | 'draw-polygon';

interface DrawPoint {
  lat: number;
  lng: number;
  timestamp?: number;
}

interface DrawFeature {
  id: string;
  type: 'point' | 'line' | 'polygon';
  points: DrawPoint[];
  color: string;
  label?: string;
}

const LayerToggle: React.FC<{
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
}> = ({ label, icon: _, checked, onChange, color }) => (
  <MuiBox
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      cursor: 'pointer',
      padding: '4px 8px',
      borderRadius: 1,
      '&:hover': {
        backgroundColor: 'grey.50',
      },
    }}
    onClick={() => onChange(!checked)}
  >
    <MuiBox
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: checked ? color : 'grey.300',
      }}
    />
    <Typography
      variant='body2'
      sx={{ color: 'grey.700', fontSize: '0.875rem' }}
    >
      {label}
    </Typography>
  </MuiBox>
);

const FitBoundsControl: React.FC<{
  bounds: [number, number][] | undefined;
  mapRef: React.RefObject<any>;
}> = ({ bounds, mapRef }) => {
  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (map && bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mapRef, bounds]);

  return (
    <IconButton
      onClick={fitBounds}
      title='缩放到所有标记'
      sx={{
        padding: 1,
        backgroundColor: 'white',
        borderRadius: 2,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        '&:hover': {
          backgroundColor: 'grey.50',
        },
        transition: 'background-color 0.2s',
      }}
    >
      <Maximize2
        size={20}
        style={{ color: 'grey.700' }}
      />
    </IconButton>
  );
};

interface MapEventHandlerProps {
  toolMode: ToolMode;
  measurePoints: [number, number][];
  setMeasurePoints: (points: [number, number][]) => void;
  setMeasureResult: (result: string) => void;
  currentDrawing: DrawFeature | null;
  setCurrentDrawing: (drawing: DrawFeature | null) => void;
  drawFeatures: DrawFeature[];
  setDrawFeatures: (features: DrawFeature[]) => void;
  setTooltipPosition: (pos: [number, number]) => void;
  setShowMeasureTooltip: (show: boolean) => void;
  bounds: [number, number][] | undefined;
  calculateTotalDistance: (points: [number, number][]) => number;
  calculateArea: (points: [number, number][]) => number;
  formatDistance: (meters: number) => string;
  formatArea: (squareMeters: number) => string;
}

const MapEventHandler: React.FC<MapEventHandlerProps> = ({
  toolMode,
  measurePoints,
  setMeasurePoints,
  setMeasureResult,
  currentDrawing,
  setCurrentDrawing,
  drawFeatures,
  setDrawFeatures,
  setTooltipPosition,
  setShowMeasureTooltip,
  bounds,
  calculateTotalDistance,
  calculateArea,
  formatDistance,
  formatArea,
}) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  useMapEvents({
    click: (e) => {
      const latlng = e.latlng;
      const point: [number, number] = [latlng.lat, latlng.lng];

      if (toolMode === 'measure-distance') {
        const newPoints = [...measurePoints, point];
        setMeasurePoints(newPoints);
        if (newPoints.length >= 2) {
          const totalDistance = calculateTotalDistance(newPoints);
          setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
        }
      } else if (toolMode === 'measure-area') {
        const newPoints = [...measurePoints, point];
        setMeasurePoints(newPoints);
        if (newPoints.length >= 3) {
          const area = calculateArea(newPoints);
          setMeasureResult(`面积: ${formatArea(area)}`);
        }
      } else if (toolMode === 'draw-point') {
        const newFeature: DrawFeature = {
          id: `point-${Date.now()}`,
          type: 'point',
          points: [{ lat: point[0], lng: point[1], timestamp: Date.now() }],
          color: 'error.main',
        };
        setDrawFeatures([...drawFeatures, newFeature]);
      } else if (toolMode === 'draw-line') {
        if (!currentDrawing) {
          setCurrentDrawing({
            id: `line-${Date.now()}`,
            type: 'line',
            points: [{ lat: point[0], lng: point[1] }],
            color: 'primary.main',
          });
        } else {
          const updatedDrawing = {
            ...currentDrawing,
            points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
          };
          setCurrentDrawing(updatedDrawing);
        }
      } else if (toolMode === 'draw-polygon') {
        if (!currentDrawing) {
          setCurrentDrawing({
            id: `polygon-${Date.now()}`,
            type: 'polygon',
            points: [{ lat: point[0], lng: point[1] }],
            color: 'success.main',
          });
        } else {
          const updatedDrawing = {
            ...currentDrawing,
            points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
          };
          setCurrentDrawing(updatedDrawing);
        }
      }
    },
    mousemove: (e) => {
      if (
        (toolMode === 'measure-distance' || toolMode === 'measure-area') &&
        measurePoints.length > 0
      ) {
        const latlng = e.latlng;
        setTooltipPosition([latlng.lat, latlng.lng]);
        setShowMeasureTooltip(true);

        const tempPoints: [number, number][] = [...measurePoints, [latlng.lat, latlng.lng]];
        if (toolMode === 'measure-distance') {
          const totalDistance = calculateTotalDistance(tempPoints);
          setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
        } else if (toolMode === 'measure-area' && tempPoints.length >= 3) {
          const area = calculateArea(tempPoints);
          setMeasureResult(`面积: ${formatArea(area)}`);
        }
      } else {
        setShowMeasureTooltip(false);
      }
    },
  });

  return null;
};

const MeasureTooltip: React.FC<{
  position: [number, number];
  content: string;
}> = ({ position, content }) => {
  return (
    <Paper
      sx={{
        position: 'absolute',
        backgroundColor: 'text.primary',
        color: 'white',
        fontSize: '0.75rem',
        padding: '4px 8px',
        borderRadius: 1,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'none',
        zIndex: 50,
        left: position[1] + 10,
        top: position[0] - 20,
        transform: 'translateX(-50%)',
      }}
    >
      {content}
    </Paper>
  );
};

const deviceIcon = new (window as any).L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2300C897'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const storageIcon = new (window as any).L.Icon({
  iconUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F59E0B'%3E%3Cpath d='M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z'/%3E%3C/svg%3E",
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const MapView: React.FC<MapViewProps> = ({
  devicePoints = [],
  pipelines = [],
  storageLocations = [],
  onMarkerClick,
}) => {
  const [mapCenter, _setMapCenter] = useState<[number, number]>([
    39.9,
    116.4, // 北京
  ]);
  const [zoom, setZoom] = useState(10); // 在离线瓦片范围内
  const [selectedItem, setSelectedItem] = useState<DevicePoint | StorageLocation | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
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
  const _mapRef = useRef<any>(null);
  const leafletMapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = useState(0);
  const renderCountRef = useRef(0);
  const stableId = useId();

  // Force new key when map type changes to ensure proper remount
  const handleSetMapType = (type: 'osm' | 'amap') => {
    if (type !== mapType) {
      setMapKey((prev) => prev + 1);
      setMapType(type);
    }
  };

  // Generate unique key that only changes when map type changes
  // Using useId for stability + mapKey for map type changes
  const currentMapKey = `${stableId}-${mapKey}`;

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
    const R = 6371000;
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
    if (meters < 1000) {
      return `${meters.toFixed(2)} 米`;
    }
    return `${(meters / 1000).toFixed(2)} 公里`;
  };

  const formatArea = (squareMeters: number): string => {
    if (squareMeters < 10000) {
      return `${squareMeters.toFixed(2)} 平方米`;
    }
    return `${(squareMeters / 10000).toFixed(2)} 公顷`;
  };

  const handleMarkerClick = (item: DevicePoint | StorageLocation) => {
    if (toolMode !== 'select') return;
    setSelectedItem(item);
    setShowDetailsPanel(true);
    if (onMarkerClick) {
      onMarkerClick(item);
    }
  };

  const _handleMapClick = (e: { latlng: { lat: number; lng: number } }) => {
    const latlng = e.latlng;
    const point: [number, number] = [latlng.lat, latlng.lng];

    if (toolMode === 'measure-distance') {
      const newPoints = [...measurePoints, point];
      setMeasurePoints(newPoints);
      if (newPoints.length >= 2) {
        const totalDistance = calculateTotalDistance(newPoints);
        setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
      }
    } else if (toolMode === 'measure-area') {
      const newPoints = [...measurePoints, point];
      setMeasurePoints(newPoints);
      if (newPoints.length >= 3) {
        const area = calculateArea(newPoints);
        setMeasureResult(`面积: ${formatArea(area)}`);
      }
    } else if (toolMode === 'draw-point') {
      const newFeature: DrawFeature = {
        id: `point-${Date.now()}`,
        type: 'point',
        points: [{ lat: point[0], lng: point[1], timestamp: Date.now() }],
        color: 'error.main',
      };
      setDrawFeatures([...drawFeatures, newFeature]);
    } else if (toolMode === 'draw-line') {
      if (!currentDrawing) {
        setCurrentDrawing({
          id: `line-${Date.now()}`,
          type: 'line',
          points: [{ lat: point[0], lng: point[1] }],
          color: 'primary.main',
        });
      } else {
        const updatedDrawing = {
          ...currentDrawing,
          points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
        };
        setCurrentDrawing(updatedDrawing);
      }
    } else if (toolMode === 'draw-polygon') {
      if (!currentDrawing) {
        setCurrentDrawing({
          id: `polygon-${Date.now()}`,
          type: 'polygon',
          points: [{ lat: point[0], lng: point[1] }],
          color: 'success.main',
        });
      } else {
        const updatedDrawing = {
          ...currentDrawing,
          points: [...currentDrawing.points, { lat: point[0], lng: point[1] }],
        };
        setCurrentDrawing(updatedDrawing);
      }
    }
  };

  const _handleMapMove = (e: {
    latlng?: { lat: number; lng: number };
    target?: { getCenter(): { lat: number; lng: number } };
  }) => {
    if (
      (toolMode === 'measure-distance' || toolMode === 'measure-area') &&
      measurePoints.length > 0
    ) {
      const latlng = e.latlng || e.target?.getCenter();
      if (latlng) {
        setTooltipPosition([latlng.lat, latlng.lng]);
        setShowMeasureTooltip(true);

        const tempPoints: [number, number][] = [...measurePoints, [latlng.lat, latlng.lng]];
        if (toolMode === 'measure-distance') {
          const totalDistance = calculateTotalDistance(tempPoints);
          setMeasureResult(`距离: ${formatDistance(totalDistance)}`);
        } else if (toolMode === 'measure-area' && tempPoints.length >= 3) {
          const area = calculateArea(tempPoints);
          setMeasureResult(`面积: ${formatArea(area)}`);
        }
      }
    } else {
      setShowMeasureTooltip(false);
    }
  };

  const finishDrawing = () => {
    if (
      currentDrawing &&
      currentDrawing.points.length >= (currentDrawing.type === 'point' ? 1 : 2)
    ) {
      setDrawFeatures([...drawFeatures, currentDrawing]);
    }
    setCurrentDrawing(null);
  };

  const clearMeasure = () => {
    setMeasurePoints([]);
    setMeasureResult('');
    setShowMeasureTooltip(false);
  };

  const clearDrawings = () => {
    setDrawFeatures([]);
    setCurrentDrawing(null);
  };

  const setTool = (tool: ToolMode) => {
    setToolMode(tool);
    if (tool === 'select') {
      clearMeasure();
      setCurrentDrawing(null);
    }
  };

  const exportGeoJSON = (drawOnly: boolean = false) => {
    let features: GeoJSONFeature[] = [];

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
      let coordinates: any[] = [];

      if (feature.type === 'point') {
        geometryType = 'Point';
        coordinates = [feature.points[0].lng, feature.points[0].lat];
      } else if (feature.type === 'line') {
        geometryType = 'LineString';
        coordinates = feature.points.map((p) => [p.lng, p.lat]);
      } else if (feature.type === 'polygon') {
        geometryType = 'Polygon';
        coordinates = [feature.points.map((p) => [p.lng, p.lat])];
        coordinates[0].push([feature.points[0].lng, feature.points[0].lat]);
      }

      features.push({
        type: 'Feature',
        geometry: {
          type: geometryType,
          coordinates,
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
  };

  const bounds = useMemo((): [number, number][] | undefined => {
    const allPoints: [number, number][] = [];
    if (visibleLayers.devices) {
      devicePoints.forEach((p) => {
        allPoints.push([p.latitude, p.longitude]);
      });
    }
    if (visibleLayers.storage) {
      storageLocations.forEach((s) => {
        allPoints.push([s.latitude, s.longitude]);
      });
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
  }, [devicePoints, storageLocations, visibleLayers]);

  const getStatusColor = (status: string) => {
    if (!status) return 'text.secondary';
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('启用')) return '#00C897';
    if (s.includes('pending') || s.includes('待处理')) return 'warning.main';
    if (s.includes('inactive') || s.includes('禁用')) return 'error.main';
    return 'text.secondary';
  };

  const toggleLayer = (layer: 'devices' | 'pipelines' | 'storage') => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedItem(null);
  };

  const formatCoordinate = (value: number) => {
    return value.toFixed(6);
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDrawing]);

  return (
    <MuiBox
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 500,
      }}
      ref={containerRef}
    >
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
          style={{ height: '100%', width: '100%', minHeight: 500 }}
          ref={leafletMapRef}
          key={currentMapKey}
        >
          <MapEventHandler
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
                  color='#6366F1'
                  weight={4}
                  opacity={0.8}
                >
                  <Tooltip
                    direction='top'
                    offset={[0, -10]}
                  >
                    <Paper
                      sx={{
                        backgroundColor: 'white',
                        padding: '8px 12px',
                        borderRadius: 2,
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
                eventHandlers={{ click: () => handleMarkerClick(point) }}
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
                        style={{ color: '#00C897' }}
                      />
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 'semibold', color: 'text.primary' }}
                      >
                        {point.name}
                      </Typography>
                    </MuiBox>
                    <MuiBox sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      <Typography variant='body2'>类型: {point.device_type}</Typography>
                      <Typography variant='body2'>
                        状态:{' '}
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
                          fontSize: '0.875rem',
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
                      onClick={() => handleMarkerClick(point)}
                      sx={{
                        mt: 1,
                        color: '#0891b2',
                        backgroundColor: '#ecfeff',
                        '&:hover': {
                          backgroundColor: '#cffafe',
                        },
                        fontSize: '0.875rem',
                        padding: '4px 8px',
                      }}
                    >
                      查看详情
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
                eventHandlers={{ click: () => handleMarkerClick(location) }}
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
                        style={{ color: 'warning.main' }}
                      />
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 'semibold', color: 'text.primary' }}
                      >
                        {location.name}
                      </Typography>
                    </MuiBox>
                    <MuiBox sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                      <Typography variant='body2'>类型: {location.location_type}</Typography>
                      {location.capacity !== undefined && (
                        <Typography variant='body2'>容量: {location.capacity}</Typography>
                      )}
                      {location.current_usage !== undefined && (
                        <Typography variant='body2'>当前: {location.current_usage}</Typography>
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
                      onClick={() => handleMarkerClick(location)}
                      sx={{
                        mt: 1,
                        color: '#0891b2',
                        backgroundColor: '#ecfeff',
                        '&:hover': {
                          backgroundColor: '#cffafe',
                        },
                        fontSize: '0.875rem',
                        padding: '4px 8px',
                      }}
                    >
                      查看详情
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
                    new (window as any).L.Icon({
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

          {showHeatmap && (
            <HeatmapLayer
              devicePoints={devicePoints}
              storageLocations={storageLocations}
              mapRef={leafletMapRef}
              visible={showHeatmap}
              intensityMode={heatmapMode}
            />
          )}
        </MapContainer>
      )}

      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <MuiBox sx={{ padding: '12px', borderBottom: '1px solid grey.100' }}>
          <Typography
            variant='caption'
            sx={{ fontWeight: 'medium', color: 'text.secondary' }}
          >
            工具
          </Typography>
        </MuiBox>
        <MuiBox
          sx={{
            padding: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          <Button
            fullWidth
            onClick={() => setTool('select')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'select' ? 'primary.main' : 'white',
              color: toolMode === 'select' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'select' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='选择工具'
          >
            <MuiBox
              sx={{
                width: 16,
                height: 16,
                border: '2px solid grey.700',
                borderRadius: 1,
              }}
            />
            选择
          </Button>
          <Button
            fullWidth
            onClick={() => setTool('measure-distance')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'measure-distance' ? 'primary.main' : 'white',
              color: toolMode === 'measure-distance' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'measure-distance' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='距离测量'
          >
            <Ruler size={16} />
            测距
          </Button>
          <Button
            fullWidth
            onClick={() => setTool('measure-area')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'measure-area' ? 'primary.main' : 'white',
              color: toolMode === 'measure-area' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'measure-area' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='面积测量'
          >
            <Ruler size={16} />
            测面积
          </Button>
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          <Button
            fullWidth
            onClick={() => setTool('draw-point')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'draw-point' ? 'primary.main' : 'white',
              color: toolMode === 'draw-point' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'draw-point' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='绘制点'
          >
            <Pencil size={16} />
            绘点
          </Button>
          <Button
            fullWidth
            onClick={() => setTool('draw-line')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'draw-line' ? 'primary.main' : 'white',
              color: toolMode === 'draw-line' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'draw-line' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='绘制线'
          >
            <Pencil size={16} />
            绘线
          </Button>
          <Button
            fullWidth
            onClick={() => setTool('draw-polygon')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: toolMode === 'draw-polygon' ? 'primary.main' : 'white',
              color: toolMode === 'draw-polygon' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: toolMode === 'draw-polygon' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='绘制多边形'
          >
            <Pencil size={16} />
            绘多边形
          </Button>
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          {(toolMode === 'measure-distance' || toolMode === 'measure-area') && (
            <Button
              fullWidth
              onClick={clearMeasure}
              sx={{
                padding: 1,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'grey.100',
                color: 'grey.700',
                '&:hover': {
                  backgroundColor: 'grey.200',
                },
                fontSize: '0.75rem',
              }}
              title='清除测量'
            >
              <Eraser size={16} />
              清除
            </Button>
          )}
          {drawFeatures.length > 0 && (
            <Button
              fullWidth
              onClick={clearDrawings}
              sx={{
                padding: 1,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'error.lighter',
                color: 'error.dark',
                '&:hover': {
                  backgroundColor: 'error.light',
                },
                fontSize: '0.75rem',
              }}
              title='清除所有绘制'
            >
              <Trash2 size={16} />
              清除绘制
            </Button>
          )}
          {currentDrawing && (
            <Button
              fullWidth
              onClick={finishDrawing}
              sx={{
                padding: 1,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'success.lighter',
                color: 'success.dark',
                '&:hover': {
                  backgroundColor: 'success.light',
                },
                fontSize: '0.75rem',
              }}
              title='完成绘制 (Enter)'
            >
              完成绘制
            </Button>
          )}
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          <Button
            fullWidth
            onClick={() => {
              setShowTrackPanel(true);
              setToolMode('select');
            }}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: showTrackPanel ? '#9333ea' : 'white',
              color: showTrackPanel ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: showTrackPanel ? 'secondary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='设备轨迹追踪'
          >
            <PlayCircle size={16} />
            轨迹追踪
          </Button>
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          <Button
            fullWidth
            onClick={() => exportGeoJSON()}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: '#dbeafe',
              color: 'primary.dark',
              '&:hover': {
                backgroundColor: 'primary.light',
              },
              fontSize: '0.75rem',
            }}
            title='导出GeoJSON'
          >
            <Download size={16} />
            导出GeoJSON
          </Button>
          <Button
            fullWidth
            onClick={() => exportGeoJSON(true)}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: 'secondary.light',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'secondary.main',
              },
              fontSize: '0.75rem',
            }}
            title='导出绘制图形'
          >
            <FileJson size={16} />
            导出绘制图形
          </Button>
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          <Button
            fullWidth
            onClick={() => handleSetMapType(mapType === 'osm' ? 'amap' : 'osm')}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: mapType === 'amap' ? 'primary.main' : 'white',
              color: mapType === 'amap' ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: mapType === 'amap' ? 'primary.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='切换地图'
          >
            <Globe size={16} />
            {mapType === 'osm' ? '切换高德' : '切换OSM'}
          </Button>
          <MuiBox sx={{ borderTop: '1px solid grey.100', my: 1 }} />
          <Button
            fullWidth
            onClick={() => setShowHeatmap(!showHeatmap)}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: showHeatmap ? 'error.main' : 'white',
              color: showHeatmap ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: showHeatmap ? 'error.dark' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='热力图'
          >
            <Thermometer size={16} />
            热力图
          </Button>
          {showHeatmap && (
            <MuiBox
              sx={{
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
              }}
            >
              <Button
                fullWidth
                onClick={() => setHeatmapMode('density')}
                sx={{
                  padding: '6px',
                  borderRadius: 1,
                  textAlign: 'left',
                  backgroundColor: heatmapMode === 'density' ? 'error.lighter' : 'transparent',
                  color: heatmapMode === 'density' ? 'error.darker' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: heatmapMode === 'density' ? 'error.light' : 'grey.100',
                  },
                  fontSize: '0.75rem',
                }}
              >
                密度模式
              </Button>
              <Button
                fullWidth
                onClick={() => setHeatmapMode('status')}
                sx={{
                  padding: '6px',
                  borderRadius: 1,
                  textAlign: 'left',
                  backgroundColor: heatmapMode === 'status' ? 'error.lighter' : 'transparent',
                  color: heatmapMode === 'status' ? 'error.darker' : 'text.secondary',
                  '&:hover': {
                    backgroundColor: heatmapMode === 'status' ? 'error.light' : 'grey.100',
                  },
                  fontSize: '0.75rem',
                }}
              >
                状态模式
              </Button>
            </MuiBox>
          )}
          <Button
            fullWidth
            onClick={() => {
              setShow3DView(true);
              setToolMode('select');
            }}
            sx={{
              padding: 1,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              backgroundColor: show3DView ? 'primary.main' : 'white',
              color: show3DView ? 'white' : 'grey.700',
              '&:hover': {
                backgroundColor: show3DView ? '#4338ca' : 'grey.50',
              },
              fontSize: '0.75rem',
            }}
            title='3D视图'
          >
            <Box size={16} />
            3D视图
          </Button>
        </MuiBox>
      </Paper>

      {(toolMode === 'measure-distance' || toolMode === 'measure-area') && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 128,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '8px 16px',
          }}
        >
          <Typography
            variant='body2'
            sx={{ fontWeight: 'medium', color: 'grey.700' }}
          >
            {measureResult}
          </Typography>
        </Paper>
      )}

      {toolMode !== 'select' && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: 'warning.light',
            border: '1px solid #fde68a',
            borderRadius: 2,
            padding: '8px 16px',
          }}
        >
          <Typography
            variant='caption'
            sx={{ color: '#92400e' }}
          >
            按 ESC 退出工具模式 | 按 Enter 完成绘制
          </Typography>
        </Paper>
      )}

      <MuiBox
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <IconButton
          onClick={() => setZoom((z) => Math.min(z + 1, 18))}
          title='放大'
          sx={{
            padding: 1,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <ZoomIn
            size={20}
            style={{ color: 'grey.700' }}
          />
        </IconButton>
        <IconButton
          onClick={() => setZoom((z) => Math.max(z - 1, 1))}
          title='缩小'
          sx={{
            padding: 1,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <ZoomOut
            size={20}
            style={{ color: 'grey.700' }}
          />
        </IconButton>
        <FitBoundsControl
          bounds={bounds}
          mapRef={leafletMapRef}
        />
      </MuiBox>

      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          backgroundColor: 'white',
          borderRadius: 2,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
      >
        <Button
          fullWidth
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          sx={{
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <MuiBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Layers
              size={20}
              style={{ color: 'grey.700' }}
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium', color: 'grey.700' }}
            >
              图层
            </Typography>
          </MuiBox>
          {showLayerPanel ? (
            <ChevronUp
              size={16}
              style={{ color: 'text.secondary' }}
            />
          ) : (
            <ChevronDown
              size={16}
              style={{ color: 'text.secondary' }}
            />
          )}
        </Button>
        {showLayerPanel && (
          <MuiBox
            sx={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              borderTop: '1px solid grey.200',
            }}
          >
            <LayerToggle
              label='设备点位'
              icon={<MapPin size={16} />}
              checked={visibleLayers.devices}
              onChange={() => toggleLayer('devices')}
              color='#00C897'
            />
            <LayerToggle
              label='管线'
              icon={<Navigation size={16} />}
              checked={visibleLayers.pipelines}
              onChange={() => toggleLayer('pipelines')}
              color='#6366F1'
            />
            <LayerToggle
              label='仓储位置'
              icon={<Info size={16} />}
              checked={visibleLayers.storage}
              onChange={() => toggleLayer('storage')}
              color='warning.main'
            />
            {drawFeatures.length > 0 && (
              <MuiBox
                sx={{
                  borderTop: '1px solid grey.200',
                  paddingTop: 1,
                  marginTop: 1,
                }}
              >
                <LayerToggle
                  label='绘制图形'
                  icon={<Pencil size={16} />}
                  checked={true}
                  onChange={() => {}}
                  color='error.main'
                />
              </MuiBox>
            )}
          </MuiBox>
        )}
      </Paper>

      {showDetailsPanel && selectedItem && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            width: '320px',
            backgroundColor: 'white',
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            border: '1px solid grey.200',
          }}
        >
          <MuiBox
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'linear-gradient(to right, #06b6d4, primary.main)',
            }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 'semibold', color: 'white' }}
            >
              详情信息
            </Typography>
            <IconButton
              onClick={closeDetailsPanel}
              sx={{
                padding: 0.5,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                },
                borderRadius: 1,
              }}
            >
              <X
                size={20}
                style={{ color: 'white' }}
              />
            </IconButton>
          </MuiBox>
          <MuiBox
            sx={{
              padding: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <MuiBox>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', marginBottom: 0.5 }}
              >
                名称
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 'medium', color: 'text.primary' }}
              >
                {selectedItem.name}
              </Typography>
            </MuiBox>
            {'device_type' in selectedItem && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  设备类型
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.700' }}
                >
                  {selectedItem.device_type}
                </Typography>
              </MuiBox>
            )}
            {'location_type' in selectedItem && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  位置类型
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.700' }}
                >
                  {selectedItem.location_type}
                </Typography>
              </MuiBox>
            )}
            {'status' in selectedItem && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  状态
                </Typography>
                <Chip
                  label={selectedItem.status}
                  size='small'
                  sx={{
                    backgroundColor:
                      selectedItem.status.toLowerCase().includes('active') ||
                      selectedItem.status.includes('启用')
                        ? 'success.lighter'
                        : selectedItem.status.toLowerCase().includes('pending') ||
                            selectedItem.status.includes('待处理')
                          ? 'warning.light'
                          : 'error.lighter',
                    color:
                      selectedItem.status.toLowerCase().includes('active') ||
                      selectedItem.status.includes('启用')
                        ? '#065f46'
                        : selectedItem.status.toLowerCase().includes('pending') ||
                            selectedItem.status.includes('待处理')
                          ? '#92400e'
                          : '#991b1b',
                    fontWeight: 'medium',
                  }}
                />
              </MuiBox>
            )}
            {'capacity' in selectedItem && selectedItem.capacity !== undefined && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  容量
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.700' }}
                >
                  {selectedItem.capacity}
                </Typography>
              </MuiBox>
            )}
            {'current_usage' in selectedItem && selectedItem.current_usage !== undefined && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  当前用量
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.700' }}
                >
                  {selectedItem.current_usage}
                </Typography>
              </MuiBox>
            )}
            {'description' in selectedItem && selectedItem.description && (
              <MuiBox>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', marginBottom: 0.5 }}
                >
                  描述
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {selectedItem.description}
                </Typography>
              </MuiBox>
            )}
            <MuiBox sx={{ paddingTop: 1, borderTop: '1px solid grey.200' }}>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', marginBottom: 0.5 }}
              >
                坐标
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.700', fontFamily: 'monospace' }}
              >
                {formatCoordinate(selectedItem.latitude)},{' '}
                {formatCoordinate(selectedItem.longitude)}
              </Typography>
            </MuiBox>
          </MuiBox>
        </Paper>
      )}

      {showMeasureTooltip && (
        <MeasureTooltip
          position={tooltipPosition}
          content={measureResult}
        />
      )}

      {showTrackPanel && (
        <MuiBox
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              backgroundColor: 'white',
              borderRadius: 3,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
          </Paper>
        </MuiBox>
      )}

      {showHeatmap && (
        <MuiBox sx={{ position: 'absolute', bottom: 16, right: 96 }}>
          <HeatmapLegend mode={heatmapMode} />
        </MuiBox>
      )}

      {show3DView && (
        <MuiBox
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              backgroundColor: 'white',
              borderRadius: 3,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              width: '95%',
              maxWidth: '1536px',
              height: '90%',
              maxHeight: '700px',
              overflow: 'hidden',
            }}
          >
            <Map3DView
              devicePoints={devicePoints}
              pipelines={pipelines}
              storageLocations={storageLocations}
              onClose={() => setShow3DView(false)}
            />
          </Paper>
        </MuiBox>
      )}
    </MuiBox>
  );
};

export default MapView;
