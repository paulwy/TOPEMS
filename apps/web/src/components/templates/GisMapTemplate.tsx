import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { BoxProps } from '@mui/material';
import {
  Box,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Slider,
  Button,
  Typography,
  Divider,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Search,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Locate,
  Navigation,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Circle,
  Square,
  PenTool,
} from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Polygon,
  Circle as LeafletCircle,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { logger } from '@/utils/logger';
import { designTokens, semanticTokens } from '@topems/tokens';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export interface MapMarker {
  id: string;
  name: string;
  position: LatLngExpression;
  color?: string;
  icon?: React.ReactNode;
  popupContent?: React.ReactNode;
  type?: 'device' | 'storage' | 'warning' | 'custom';
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'tile' | 'overlay';
  visible: boolean;
  url?: string;
  attribution?: string;
}

export interface GeoFence {
  id: string;
  name: string;
  type: 'circle' | 'polygon' | 'rectangle';
  position: LatLngExpression;
  radius?: number;
  coordinates?: LatLngExpression[];
  color?: string;
  alertOnEnter?: boolean;
  alertOnExit?: boolean;
}

export interface TrackPoint {
  id: string;
  timestamp: string;
  position: LatLngExpression;
  speed?: number;
  accuracy?: number;
}

export interface GisMapTemplateProps extends BoxProps {
  initialCenter?: LatLngExpression;
  initialZoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  layers?: MapLayer[];
  onLayerVisibilityChange?: (layerId: string, visible: boolean) => void;
  fences?: GeoFence[];
  onFenceClick?: (fence: GeoFence) => void;
  trackPoints?: TrackPoint[];
  onTrackPlayback?: (isPlaying: boolean) => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  zoomControl?: boolean;
  fullscreenControl?: boolean;
  locateControl?: boolean;
  showLayerPanel?: boolean;
  children?: React.ReactNode;
}

const baseLayers: MapLayer[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    type: 'tile',
    visible: true,
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'satellite',
    name: i18n.t('components.gis_map_template.k0'),
    type: 'tile',
    visible: false,
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
  },
  {
    id: 'dark',
    name: i18n.t('components.gis_map_template.k1'),
    type: 'tile',
    visible: false,
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; CartoDB',
  },
];

const defaultOverlayLayers: MapLayer[] = [
  { id: 'markers', name: i18n.t('components.gis_map_template.k2'), type: 'overlay', visible: true },
  {
    id: 'clusters',
    name: i18n.t('components.gis_map_template.k3'),
    type: 'overlay',
    visible: true,
  },
  { id: 'fences', name: i18n.t('components.gis_map_template.k4'), type: 'overlay', visible: true },
  { id: 'tracks', name: i18n.t('components.gis_map_template.k5'), type: 'overlay', visible: true },
];

interface MapControlProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
}

function MapControl({
  onZoomIn,
  onZoomOut,
  onLocate,
  onFullscreen,
  isFullscreen,
}: MapControlProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        zIndex: 1000,
      }}
    >
      <Tooltip title={i18n.t('components.gis_map_template.k6')}>
        <IconButton
          onClick={onZoomIn}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          aria-label={i18n.t('components.gis_map_template.k7')}
        >
          <ZoomIn size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title={i18n.t('components.gis_map_template.k8')}>
        <IconButton
          onClick={onZoomOut}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          aria-label={i18n.t('components.gis_map_template.k9')}
        >
          <ZoomOut size={20} />
        </IconButton>
      </Tooltip>
      <Divider sx={{ my: 1, width: '100%' }} />
      <Tooltip title={i18n.t('components.gis_map_template.k10')}>
        <IconButton
          onClick={onLocate}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          aria-label={i18n.t('components.gis_map_template.k11')}
        >
          <Locate size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={
          isFullscreen
            ? i18n.t('components.gis_map_template.k13')
            : i18n.t('components.gis_map_template.k12')
        }
      >
        <IconButton
          onClick={onFullscreen}
          sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
          aria-label={i18n.t('components.gis_map_template.k14')}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

interface LayerPanelProps {
  open: boolean;
  onClose: () => void;
  baseLayers: MapLayer[];
  overlayLayers: MapLayer[];
  selectedBaseLayer: string;
  onBaseLayerChange: (layerId: string) => void;
  onOverlayToggle: (layerId: string) => void;
}

function LayerPanel({
  open,
  onClose,
  baseLayers,
  overlayLayers,
  selectedBaseLayer,
  onBaseLayerChange,
  onOverlayToggle,
}: LayerPanelProps) {
  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { width: 280, padding: 2 } }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          {i18n.t('components.gis_map_template.k33')}
        </Typography>
      </Box>
      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 500, mb: 2 }}
      >
        {i18n.t('components.gis_map_template.k34')}
      </Typography>
      <List
        dense
        sx={{ mb: 3 }}
      >
        {baseLayers.map((layer) => {
          const isSelected = selectedBaseLayer === layer.id;
          return (
            <ListItem
              key={layer.id}
              component='button'
              onClick={() => onBaseLayerChange(layer.id)}
              sx={{
                backgroundColor: isSelected ? 'primary.main' : 'transparent',
                color: isSelected ? designTokens.colors.background.paper : 'inherit',
                '&:hover': {
                  backgroundColor: isSelected
                    ? 'primary.main'
                    : designTokens.colors.cyber.glass.bgLight,
                },
              }}
            >
              <ListItemText primary={layer.name} />
              {isSelected && (
                <Layers
                  size={16}
                  sx={{ color: 'common.white' }}
                />
              )}
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ mb: 3 }} />
      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 500, mb: 2 }}
      >
        {i18n.t('components.gis_map_template.k35')}
      </Typography>
      <List dense>
        {overlayLayers.map((layer) => (
          <ListItem key={layer.id}>
            <FormControlLabel
              control={
                <Switch
                  checked={layer.visible}
                  onChange={() => onOverlayToggle(layer.id)}
                  size='small'
                />
              }
              label={layer.name}
              sx={{ margin: 0 }}
            />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

function SearchPanel({ open, onClose, onSearch }: SearchPanelProps) {
  const [searchValue, setSearchValue] = useState('');
  const handleSearch = useCallback(() => {
    onSearch(searchValue);
    onClose();
  }, [searchValue, onSearch, onClose]);

  useEffect(() => {
    if (!open) setSearchValue('');
  }, [open]);

  return (
    <Drawer
      anchor='top'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { height: 'auto', padding: 2 } }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          autoFocus
          placeholder={i18n.t('components.gis_map_template.k32')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position='start'>
                  <Search size={20} />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant='contained'
          onClick={handleSearch}
        >
          {i18n.t('components.gis_map_template.k4')}
        </Button>
      </Box>
    </Drawer>
  );
}

interface DrawControlProps {
  onDraw: (type: 'circle' | 'polygon' | 'rectangle') => void;
  onClear: () => void;
  drawMode: 'circle' | 'polygon' | 'rectangle' | null;
}

function DrawControl({ onDraw, onClear, drawMode }: DrawControlProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 20,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        zIndex: 1000,
        bgcolor: 'background.paper',
        borderRadius: 1,
        padding: 1,
        boxShadow: 2,
      }}
    >
      <Typography
        variant='caption'
        sx={{ textAlign: 'center', fontWeight: 500, mb: 1 }}
      >
        {i18n.t('components.gis_map_template.k37')}
      </Typography>
      <Tooltip title={i18n.t('components.gis_map_template.k15')}>
        <IconButton
          onClick={() => onDraw('circle')}
          sx={{ color: drawMode === 'circle' ? 'primary.main' : 'text.primary' }}
          aria-label={i18n.t('components.gis_map_template.k16')}
        >
          <Circle size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title={i18n.t('components.gis_map_template.k17')}>
        <IconButton
          onClick={() => onDraw('rectangle')}
          sx={{ color: drawMode === 'rectangle' ? 'primary.main' : 'text.primary' }}
          aria-label={i18n.t('components.gis_map_template.k18')}
        >
          <Square size={20} />
        </IconButton>
      </Tooltip>
      <Tooltip title={i18n.t('components.gis_map_template.k19')}>
        <IconButton
          onClick={() => onDraw('polygon')}
          sx={{ color: drawMode === 'polygon' ? 'primary.main' : 'text.primary' }}
          aria-label={i18n.t('components.gis_map_template.k20')}
        >
          <PenTool size={20} />
        </IconButton>
      </Tooltip>
      <Divider sx={{ my: 1, width: '100%' }} />
      <Tooltip title={i18n.t('components.gis_map_template.k21')}>
        <IconButton
          onClick={onClear}
          color='error'
          aria-label={i18n.t('components.gis_map_template.k22')}
        >
          <Trash2 size={20} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

interface TrackPlaybackProps {
  open: boolean;
  onClose: () => void;
  isPlaying: boolean;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
}

function TrackPlayback({
  open,
  onClose,
  isPlaying,
  playbackSpeed,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
}: TrackPlaybackProps) {
  return (
    <Drawer
      anchor='bottom'
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { height: 160, padding: 3 } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 500 }}
          >
            {i18n.t('components.gis_map_template.k36')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              onClick={onReset}
              aria-label={i18n.t('components.gis_map_template.k23')}
            >
              <RotateCcw size={20} />
            </IconButton>
            {isPlaying ? (
              <IconButton
                onClick={onPause}
                color='primary'
                aria-label={i18n.t('components.gis_map_template.k24')}
              >
                <Pause size={24} />
              </IconButton>
            ) : (
              <IconButton
                onClick={onPlay}
                color='primary'
                aria-label={i18n.t('components.gis_map_template.k25')}
              >
                <Play size={24} />
              </IconButton>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Typography
            variant='body2'
            sx={{ width: 80 }}
          >
            {i18n.t('components.gis_map_template.k7')}
          </Typography>
          <Slider
            value={playbackSpeed}
            onChange={(_, value) => onSpeedChange(value as number)}
            min={0.5}
            max={4}
            step={0.5}
            marks={[
              { value: 0.5, label: '0.5x' },
              { value: 1, label: '1x' },
              { value: 2, label: '2x' },
              { value: 4, label: '4x' },
            ]}
            sx={{ flex: 1 }}
          />
        </Box>
      </Box>
    </Drawer>
  );
}

export function GisMapTemplate({
  initialCenter = [31.2304, 121.4737],
  initialZoom = 14,
  markers = [],
  onMarkerClick,
  layers,
  onLayerVisibilityChange,
  fences = [],
  onFenceClick,
  trackPoints = [],
  onTrackPlayback,
  searchable = true,
  onSearch,
  zoomControl = true,
  fullscreenControl = true,
  locateControl = true,
  showLayerPanel = true,
  children,
  ...props
}: GisMapTemplateProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showTrackPlayback, setShowTrackPlayback] = useState(false);
  const [selectedBaseLayer, setSelectedBaseLayer] = useState('osm');
  const [overlayLayers, setOverlayLayers] = useState<MapLayer[]>(defaultOverlayLayers);
  const [drawMode, setDrawMode] = useState<'circle' | 'polygon' | 'rectangle' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const baseLayersToRender = layers?.filter((l) => l.type === 'tile') || baseLayers;
  const overlaysToRender = layers?.filter((l) => l.type === 'overlay') || overlayLayers;

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying && trackPoints.length > 0) {
      interval = setInterval(() => {
        setCurrentTrackIndex((prev) => {
          const next = prev + 1;
          if (next >= trackPoints.length) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, trackPoints.length, playbackSpeed]);

  useEffect(() => {
    if (currentTrackIndex > 0 && trackPoints[currentTrackIndex]) {
      mapRef.current?.setView(trackPoints[currentTrackIndex].position, 16);
    }
  }, [currentTrackIndex, trackPoints]);

  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleLocate = useCallback(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          mapRef.current?.setView([position.coords.latitude, position.coords.longitude], 15),
        (error) => logger.error(i18n.t('components.gis_map_template.k8'), error)
      );
    }
  }, []);
  const handleFullscreen = useCallback(() => {
    const container = mapRef.current?.getContainer();
    if (container) {
      if (!document.fullscreenElement) container.requestFullscreen();
      else document.exitFullscreen();
    }
  }, []);

  const handleBaseLayerChange = useCallback((layerId: string) => {
    setSelectedBaseLayer(layerId);
    setShowLayers(false);
  }, []);

  const handleOverlayToggle = useCallback(
    (layerId: string) => {
      setOverlayLayers((prev) =>
        prev.map((layer) => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer))
      );
      onLayerVisibilityChange?.(layerId, !overlayLayers.find((l) => l.id === layerId)?.visible);
    },
    [overlayLayers, onLayerVisibilityChange]
  );

  const handleDraw = useCallback((type: 'circle' | 'polygon' | 'rectangle') => {
    setDrawMode((prev) => (prev === type ? null : type));
  }, []);

  const handleClearDraw = useCallback(() => setDrawMode(null), []);

  const handleTrackPlay = useCallback(() => {
    setIsPlaying(true);
    onTrackPlayback?.(true);
  }, [onTrackPlayback]);

  const handleTrackPause = useCallback(() => {
    setIsPlaying(false);
    onTrackPlayback?.(false);
  }, [onTrackPlayback]);

  const handleTrackReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentTrackIndex(0);
    mapRef.current?.setView(trackPoints[0]?.position || initialCenter, initialZoom);
  }, [trackPoints, initialCenter, initialZoom]);

  const handleSpeedChange = useCallback((speed: number) => setPlaybackSpeed(speed), []);

  const getMarkerIcon = (type: string = 'custom') => {
    const colors: Record<string, string> = {
      device: designTokens.colors.primary.dark,
      storage: designTokens.colors.success.main,
      warning: 'colors.error.main',
      custom: designTokens.colors.warning.main,
    };
    const color = colors[type] || colors.custom;
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 24px; height: 24px; background: ${color}; border-radius: 50%; border: 3px solid var(--color-primary-foreground, #ffffff); box-shadow: var(--shadow-custom, 0 2px 8px rgba(0,0,0,0.3));"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const isLayerVisible = (layerId: string) =>
    overlaysToRender.find((l) => l.id === layerId)?.visible ?? true;

  return (
    <Box
      {...props}
      sx={{ position: 'relative', width: '100%', height: '100%', ...props.sx }}
    >
      <MapContainer
        ref={mapRef}
        center={initialCenter}
        zoom={initialZoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={zoomControl}
      >
        {baseLayersToRender
          .filter((layer) => layer.id === selectedBaseLayer)
          .map((layer) => (
            <TileLayer
              key={layer.id}
              url={layer.url || ''}
              attribution={layer.attribution}
            />
          ))}

        {isLayerVisible('markers') &&
          markers.map((marker) => (
            <Marker
              key={marker.id}
              position={marker.position}
              icon={getMarkerIcon(marker.type)}
              eventHandlers={{ click: () => onMarkerClick?.(marker) }}
            >
              {marker.popupContent && typeof marker.popupContent !== 'bigint' && (
                <Popup>{marker.popupContent as React.ReactNode}</Popup>
              )}
            </Marker>
          ))}

        {isLayerVisible('fences') &&
          fences.map((fence) => (
            <React.Fragment key={fence.id}>
              {fence.type === 'circle' && fence.radius && (
                <LeafletCircle
                  center={fence.position}
                  radius={fence.radius}
                  color={fence.color || 'colors.error.main'}
                  fillColor={fence.color || 'colors.error.main'}
                  fillOpacity={0.2}
                  eventHandlers={{ click: () => onFenceClick?.(fence) }}
                />
              )}
              {(fence.type === 'polygon' || fence.type === 'rectangle') && fence.coordinates && (
                <Polygon
                  positions={fence.coordinates as L.LatLngExpression[]}
                  color={fence.color || 'colors.error.main'}
                  fillColor={fence.color || 'colors.error.main'}
                  fillOpacity={0.2}
                  eventHandlers={{ click: () => onFenceClick?.(fence) }}
                />
              )}
            </React.Fragment>
          ))}

        {isLayerVisible('tracks') && trackPoints.length > 0 && (
          <Polyline
            positions={trackPoints.slice(0, currentTrackIndex + 1).map((p) => p.position)}
            color={designTokens.colors.primary.dark}
            weight={4}
            opacity={0.8}
          />
        )}

        {isLayerVisible('tracks') && trackPoints[currentTrackIndex] && (
          <Marker
            position={trackPoints[currentTrackIndex].position}
            icon={L.divIcon({
              className: 'track-marker',
              html: `<div style="width: 30px; height: 30px; background: ${designTokens.colors.primary.dark}; border-radius: 50%; border: 4px solid var(--color-primary-foreground, #ffffff); box-shadow: var(--shadow-custom, 0 0 10px rgba(25,118,210,0.5)); animation: pulse 1s infinite;"></div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
          />
        )}

        {children}
      </MapContainer>

      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1000,
        }}
      >
        {searchable && (
          <Tooltip title={i18n.t('components.gis_map_template.k26')}>
            <IconButton
              onClick={() => setShowSearch(true)}
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              aria-label={i18n.t('components.gis_map_template.k27')}
            >
              <Search size={20} />
            </IconButton>
          </Tooltip>
        )}
        {showLayerPanel && (
          <Tooltip title={i18n.t('components.gis_map_template.k28')}>
            <IconButton
              onClick={() => setShowLayers(true)}
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              aria-label={i18n.t('components.gis_map_template.k29')}
            >
              <Layers size={20} />
            </IconButton>
          </Tooltip>
        )}
        {trackPoints.length > 0 && (
          <Tooltip title={i18n.t('components.gis_map_template.k30')}>
            <IconButton
              onClick={() => setShowTrackPlayback(true)}
              sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
              aria-label={i18n.t('components.gis_map_template.k31')}
            >
              <Navigation size={20} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <DrawControl
        onDraw={handleDraw}
        onClear={handleClearDraw}
        drawMode={drawMode}
      />

      {(zoomControl || fullscreenControl || locateControl) && (
        <MapControl
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onLocate={handleLocate}
          onFullscreen={handleFullscreen}
          isFullscreen={isFullscreen}
        />
      )}

      <LayerPanel
        open={showLayers}
        onClose={() => setShowLayers(false)}
        baseLayers={baseLayersToRender}
        overlayLayers={overlaysToRender}
        selectedBaseLayer={selectedBaseLayer}
        onBaseLayerChange={handleBaseLayerChange}
        onOverlayToggle={handleOverlayToggle}
      />

      <SearchPanel
        open={showSearch}
        onClose={() => setShowSearch(false)}
        onSearch={onSearch || (() => {})}
      />

      <TrackPlayback
        open={showTrackPlayback}
        onClose={() => setShowTrackPlayback(false)}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onPlay={handleTrackPlay}
        onPause={handleTrackPause}
        onReset={handleTrackReset}
        onSpeedChange={handleSpeedChange}
      />

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .custom-marker, .track-marker { pointer-events: none; }
      `}</style>
    </Box>
  );
}

const MemoizedGisMapTemplate = React.memo(GisMapTemplate) as typeof GisMapTemplate;
export default MemoizedGisMapTemplate;
