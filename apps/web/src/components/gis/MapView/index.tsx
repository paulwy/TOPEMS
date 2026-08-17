import React, { useState, useRef, useEffect, useMemo, useId, lazy, Suspense } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Box as MuiBox, Typography, Paper, IconButton } from '@mui/material';
import type { DevicePoint, Pipeline, StorageLocation, GeoJSONFeature } from '../../../api/gis';
import DeviceTrackPanel from '../DeviceTrackPanel';
import HeatmapLayer, { HeatmapLegend } from '../HeatmapLayer';
import i18n from '@/i18n';
import AmapLayer from '../AmapLayer';
import { designTokens } from '@/theme/tokens';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

import type { MapViewProps, ToolMode, DrawFeature, VisibleLayers } from './types';
import MapEventHandler from './components/MapEventHandler';
import MeasureTooltip from './components/MeasureTooltip';
import FitBoundsControl from './components/FitBoundsControl';
import MapLayers from './components/MapLayers';
import Toolbar from './components/Toolbar';
import LayerPanel from './components/LayerPanel';
import DetailsPanel from './components/DetailsPanel';
// C3 §5 P1-2: Map3DView 按需懒加载，将 three.js + @react-three/* 拆分为独立 chunk
const Map3DView = lazy(() => import('../Map3DView'));

const ct = designTokens.colors;

const MapView: React.FC<MapViewProps> = ({
  devicePoints = [],
  pipelines = [],
  storageLocations = [],
  onMarkerClick,
}) => {
  const [mapCenter, _setMapCenter] = useState<[number, number]>([39.9, 116.4]);
  const [zoom, setZoom] = useState(10);
  const [selectedItem, setSelectedItem] = useState<DevicePoint | StorageLocation | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [visibleLayers, setVisibleLayers] = useState<VisibleLayers>({
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
  const [offlineMode, _setOfflineMode] = useState(true);
  const leafletMapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapKey, setMapKey] = useState(0);
  const stableId = useId();

  const handleSetMapType = (type: 'osm' | 'amap') => {
    if (type !== mapType) {
      setMapKey((prev) => prev + 1);
      setMapType(type);
    }
  };

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
      return `${meters.toFixed(2)}${i18n.t('components.index.k0')}`;
    }
    return `${(meters / 1000).toFixed(2)}${i18n.t('components.index.k1')}`;
  };

  const formatArea = (squareMeters: number): string => {
    if (squareMeters < 10000) {
      return `${squareMeters.toFixed(2)}${i18n.t('components.index.k2')}`;
    }
    return `${(squareMeters / 10000).toFixed(2)}${i18n.t('components.index.k3')}`;
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
        setMeasureResult(`${i18n.t('components.index.k4')}${formatDistance(totalDistance)}`);
      }
    } else if (toolMode === 'measure-area') {
      const newPoints = [...measurePoints, point];
      setMeasurePoints(newPoints);
      if (newPoints.length >= 3) {
        const area = calculateArea(newPoints);
        setMeasureResult(`${i18n.t('components.index.k5')}${formatArea(area)}`);
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
          setMeasureResult(`${i18n.t('components.index.k6')}${formatDistance(totalDistance)}`);
        } else if (toolMode === 'measure-area' && tempPoints.length >= 3) {
          const area = calculateArea(tempPoints);
          setMeasureResult(`${i18n.t('components.index.k7')}${formatArea(area)}`);
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

  const toggleLayer = (layer: 'devices' | 'pipelines' | 'storage') => {
    setVisibleLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const closeDetailsPanel = () => {
    setShowDetailsPanel(false);
    setSelectedItem(null);
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

          <MapLayers
            devicePoints={devicePoints}
            pipelines={pipelines}
            storageLocations={storageLocations}
            visibleLayers={visibleLayers}
            toolMode={toolMode}
            measurePoints={measurePoints}
            drawFeatures={drawFeatures}
            currentDrawing={currentDrawing}
            showHeatmap={showHeatmap}
            heatmapMode={heatmapMode}
            leafletMapRef={leafletMapRef}
            onMarkerClick={handleMarkerClick}
          />

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

      <Toolbar
        toolMode={toolMode}
        drawFeaturesLength={drawFeatures.length}
        currentDrawing={!!currentDrawing}
        showTrackPanel={showTrackPanel}
        showHeatmap={showHeatmap}
        heatmapMode={heatmapMode}
        show3DView={show3DView}
        mapType={mapType}
        setTool={setTool}
        clearMeasure={clearMeasure}
        clearDrawings={clearDrawings}
        finishDrawing={finishDrawing}
        setShowTrackPanel={setShowTrackPanel}
        exportGeoJSON={exportGeoJSON}
        handleSetMapType={handleSetMapType}
        setShowHeatmap={setShowHeatmap}
        setHeatmapMode={setHeatmapMode}
        setShow3DView={setShow3DView}
      />

      {(toolMode === 'measure-distance' || toolMode === 'measure-area') && (
        <Paper
          sx={{
            position: 'absolute',
            top: 16,
            left: 128,
            backgroundColor: 'common.white',
            borderRadius: 2,
            boxShadow: designTokens.shadows.md,
            padding: `${designTokens.spacing.sm} 16px`,
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
            backgroundColor: ct.warning[100],
            border: `1px solid ${ct.warning[200]}`,
            borderRadius: 2,
            padding: `${designTokens.spacing.sm} 16px`,
          }}
        >
          <Typography
            variant='caption'
            sx={{ color: ct.warning[800] }}
          >
            {i18n.t('components.index.k0')}
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
          aria-label={i18n.t('gis.index.k0')}
          title={i18n.t('gis.index.k1')}
          sx={{
            padding: 1,
            backgroundColor: 'common.white',
            borderRadius: 2,
            boxShadow: designTokens.shadows.md,
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <ZoomIn
            size={20}
            style={{ color: 'var(--mui-palette-text-secondary)' }}
          />
        </IconButton>
        <IconButton
          onClick={() => setZoom((z) => Math.max(z - 1, 1))}
          aria-label={i18n.t('gis.index.k2')}
          title={i18n.t('gis.index.k3')}
          sx={{
            padding: 1,
            backgroundColor: 'common.white',
            borderRadius: 2,
            boxShadow: designTokens.shadows.md,
            '&:hover': {
              backgroundColor: 'grey.50',
            },
          }}
        >
          <ZoomOut
            size={20}
            style={{ color: 'var(--mui-palette-text-secondary)' }}
          />
        </IconButton>
        <FitBoundsControl
          bounds={bounds}
          mapRef={leafletMapRef}
        />
      </MuiBox>

      <LayerPanel
        showLayerPanel={showLayerPanel}
        setShowLayerPanel={setShowLayerPanel}
        visibleLayers={visibleLayers}
        toggleLayer={toggleLayer}
        drawFeaturesLength={drawFeatures.length}
      />

      {showDetailsPanel && selectedItem && (
        <DetailsPanel
          selectedItem={selectedItem}
          onClose={closeDetailsPanel}
        />
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
            backgroundColor: 'action.active',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              backgroundColor: 'common.white',
              borderRadius: 3,
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
            backgroundColor: 'action.active',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Paper
            sx={{
              backgroundColor: 'common.white',
              borderRadius: 3,
              boxShadow: designTokens.shadows['2xl'],
              width: '95%',
              maxWidth: '1536px',
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
          </Paper>
        </MuiBox>
      )}
    </MuiBox>
  );
};

export default MapView;
