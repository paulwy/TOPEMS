// modules/shared/types.ts
// Types that are truly shared across modules

// Drawing Types - used by MapModule
export interface DrawPoint {
  lat: number;
  lng: number;
  timestamp?: number;
}

export interface DrawFeature {
  id: string;
  type: "point" | "line" | "polygon";
  points: DrawPoint[];
  color: string;
  label?: string;
}

// GeoJSON Types - used for export
export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point" | "LineString" | "Polygon";
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

// Tool Mode - shared across map interactions
export type ToolMode =
  | "select"
  | "measure-distance"
  | "measure-area"
  | "draw-point"
  | "draw-line"
  | "draw-polygon";

// Offline Module Types
export interface OfflineConfig {
  tileBounds: [[number, number], [number, number]];
  minZoom: number;
  maxZoom: number;
  tileSources: ("osm" | "amap")[];
}

export interface SyncStatus {
  lastSyncTime: string;
  pendingUploads: number;
  pendingDownloads: number;
}
