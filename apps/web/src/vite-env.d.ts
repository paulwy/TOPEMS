/// <reference types="vite/client" />

declare module "leaflet.heat" {
  import type * as L from "leaflet";
  export function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    },
  ): L.Layer;
}

declare module "leaflet-3d-tiles" {
  import type * as L from "leaflet";
  const L3DTiles: L.Layer;
  export default L3DTiles;
}
