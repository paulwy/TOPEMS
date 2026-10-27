// modules/MapModule/MapView.tsx
import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { useMapMeasure } from './useMapMeasure';
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
import { EARTH, designTokens } from '@topems/tokens';
import MapEvents from './MapEvents';
import MapControls from './MapControls';
import LayerManager from './LayerManager';
import ToolPanel from './ToolPanel';
import HeatmapLayer, { HeatmapLegend } from '../HeatmapModule/HeatmapLayer';
import AmapLayer from '../../AmapLayer';
import DeviceTrackPanel from '../../DeviceTrackPanel';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
// C3 §5 P1-2: Map3DView 按需懒加载，将 three.js + @react-three/* 拆分为独立 chunk
const Map3DView = lazy(() => import('../../Map3DView'));
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
  if (s.includes('active') || s.includes(i18n.t('gis.map_view.k0')))
    return 'var(--color-fallback-ant-blue)';
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
      color: 'var(--mui-palette-common-var(--color-primary-foreground))',
      fontSize: designTokens.typography.fontSize.scale['0.75rem'],
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      boxShadow: `0 10px 15px -3px ${designTokens.colors.action.selected}, 0 4px 6px -2px ${designTokens.colors.action.hover}`,
      pointerEvents: 'none',
      zIndex: designTokens.zIndex.overlay,
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
        <h3
          style={{
            fontWeight: 600,
            color: 'common.white',
            margin: 0,
          }}
        >
          {i18n.t('gis.map_view.k5')}
        </h3>
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
          <X
            style={{
              width: '1.25rem',
              height: '1.25rem',
              color: 'common.white',
            }}
          />
        </button>
      </div>
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.75rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                color: theme.palette.text.secondary,
                marginBottom: '0.25rem',
              }}
            >
              {i18n.t('components.map_view.k6')}
            </div>
            <div
              style={{
                color: theme.palette.text.secondary,
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
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
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              color: theme.palette.text.secondary,
              marginBottom: '0.25rem',
            }}
          >
            {i18n.t('components.map_view.k7')}
          </div>
          <div
            style={{
              color: 'var(--mui-palette-text-secondary)',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
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
