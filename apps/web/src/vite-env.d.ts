/// <reference types="vite/client" />

// NOTE: 3D JSX intrinsic elements (group/mesh/etc.) are declared in
// src/types/react-three-fiber.d.ts with full prop types. Do not redeclare
// them here with `any` — interface merging would override the detailed types.

declare module 'leaflet.heat' {
  import type * as L from 'leaflet';

  export function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}

declare module 'leaflet-3d-tiles' {
  import type * as L from 'leaflet';

  const L3DTiles: L.Layer;
  export default L3DTiles;
}
