import type { ReactNode } from 'react';
import type * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: {
        children?: ReactNode;
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: [number, number, number] | number;
        ref?: any;
        [key: string]: any;
      };
      mesh: {
        children?: ReactNode;
        position?: [number, number, number];
        rotation?: [number, number, number];
        ref?: any;
        args?: any[];
        [key: string]: any;
      };
      meshStandardMaterial: {
        children?: ReactNode;
        color?: string | number;
        emissive?: string | number;
        emissiveIntensity?: number;
        ref?: any;
        [key: string]: any;
      };
      meshBasicMaterial: {
        children?: ReactNode;
        color?: string | number;
        ref?: any;
        [key: string]: any;
      };
      meshLambertMaterial: {
        children?: ReactNode;
        color?: string | number;
        ref?: any;
        [key: string]: any;
      };
      ambientLight: {
        children?: ReactNode;
        intensity?: number;
        color?: string | number;
        [key: string]: any;
      };
      pointLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        distance?: number;
        [key: string]: any;
      };
      directionalLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        [key: string]: any;
      };
      spotLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        [key: string]: any;
      };
      sphereGeometry: { args?: any[]; [key: string]: any };
      boxGeometry: { args?: any[]; [key: string]: any };
      cylinderGeometry: { args?: any[]; [key: string]: any };
      coneGeometry: { args?: any[]; [key: string]: any };
      torusGeometry: { args?: any[]; [key: string]: any };
      planeGeometry: { args?: any[]; [key: string]: any };
      lineGeometry: { args?: any[]; [key: string]: any };
      lineMaterial: { color?: string | number; [key: string]: any };
      pointLightHelper: { args?: any[]; [key: string]: any };
      gridHelper: { args?: any[]; [key: string]: any };
      axesHelper: { args?: any[]; [key: string]: any };
    }
  }
}

export {};
