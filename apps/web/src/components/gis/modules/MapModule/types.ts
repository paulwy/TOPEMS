// modules/MapModule/types.ts
export interface MapModuleConfig {
  center: [number, number];
  zoom: number;
  tileSource: "osm" | "amap";
  offlineEnabled: boolean;
}

export interface MapMarker {
  id: string;
  position: [number, number];
  type: "device" | "storage" | "evidence";
  data: unknown;
}

export interface MapLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  data: MapMarker[];
}
