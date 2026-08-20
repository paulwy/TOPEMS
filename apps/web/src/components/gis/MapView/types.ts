import type { DevicePoint, Pipeline, StorageLocation } from '../../../api/gis';

export interface MapViewProps {
  devicePoints?: DevicePoint[];
  pipelines?: Pipeline[];
  storageLocations?: StorageLocation[];
  onMarkerClick?: (item: DevicePoint | StorageLocation) => void;
}

export type ToolMode =
  'select' | 'measure-distance' | 'measure-area' | 'draw-point' | 'draw-line' | 'draw-polygon';

interface DrawPoint {
  lat: number;
  lng: number;
  timestamp?: number;
}

export interface DrawFeature {
  id: string;
  type: 'point' | 'line' | 'polygon';
  points: DrawPoint[];
  color: string;
  label?: string;
}

export interface VisibleLayers {
  devices: boolean;
  pipelines: boolean;
  storage: boolean;
}
