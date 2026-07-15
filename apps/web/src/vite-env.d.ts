/// <reference types="vite/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshLambertMaterial: any;
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      spotLight: any;
      sphereGeometry: any;
      boxGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      torusGeometry: any;
      planeGeometry: any;
      lineGeometry: any;
      lineMaterial: any;
      pointLightHelper: any;
      gridHelper: any;
      axesHelper: any;
      primitive: any;
    }
  }
}

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
