/**
 * Type declarations for Leaflet 3D extension libraries
 * - leaflet-3d-tiles
 * - leaflet.heat
 */

declare module 'leaflet-3d-tiles' {
  import type * as L from 'leaflet';

  interface Tiles3DLayerOptions extends L.LayerOptions {
    url: string;
    maxZoom?: number;
    minZoom?: number;
    maxNativeZoom?: number;
    tileSize?: number;
  }

  function tiles3dLayer(options: Tiles3DLayerOptions): L.Layer;

  export = tiles3dLayer;
}

declare module 'leaflet.heat' {
  import type * as L from 'leaflet';

  interface HeatLayerOptions extends L.LayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: HeatLayerOptions
  ): L.Layer;

  export = heatLayer;
}
