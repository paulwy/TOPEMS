import type { ReactNode, Ref } from 'react';
import type * as THREE from 'three';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: {
        children?: ReactNode;
        position?: [number, number, number];
        rotation?: [number, number, number];
        scale?: [number, number, number] | number;
        ref?: Ref<THREE.Object3D>;
        [key: string]: unknown;
      };
      mesh: {
        children?: ReactNode;
        position?: [number, number, number];
        rotation?: [number, number, number];
        ref?: Ref<THREE.Object3D>;
        args?: unknown[];
        [key: string]: unknown;
      };
      meshStandardMaterial: {
        children?: ReactNode;
        color?: string | number;
        emissive?: string | number;
        emissiveIntensity?: number;
        ref?: Ref<THREE.Object3D>;
        [key: string]: unknown;
      };
      meshBasicMaterial: {
        children?: ReactNode;
        color?: string | number;
        ref?: Ref<THREE.Object3D>;
        [key: string]: unknown;
      };
      meshLambertMaterial: {
        children?: ReactNode;
        color?: string | number;
        ref?: Ref<THREE.Object3D>;
        [key: string]: unknown;
      };
      ambientLight: {
        children?: ReactNode;
        intensity?: number;
        color?: string | number;
        [key: string]: unknown;
      };
      pointLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        distance?: number;
        [key: string]: unknown;
      };
      directionalLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        [key: string]: unknown;
      };
      spotLight: {
        children?: ReactNode;
        position?: [number, number, number];
        intensity?: number;
        color?: string | number;
        [key: string]: unknown;
      };
      sphereGeometry: { args?: unknown[]; [key: string]: unknown };
      boxGeometry: { args?: unknown[]; [key: string]: unknown };
      cylinderGeometry: { args?: unknown[]; [key: string]: unknown };
      coneGeometry: { args?: unknown[]; [key: string]: unknown };
      torusGeometry: { args?: unknown[]; [key: string]: unknown };
      planeGeometry: { args?: unknown[]; [key: string]: unknown };
      lineGeometry: { args?: unknown[]; [key: string]: unknown };
      lineMaterial: { color?: string | number; [key: string]: unknown };
      pointLightHelper: { args?: unknown[]; [key: string]: unknown };
      gridHelper: { args?: unknown[]; [key: string]: unknown };
      axesHelper: { args?: unknown[]; [key: string]: unknown };
    }
  }
}

export {};
