// modules/MapModule/OfflineManager.tsx
import {} from 'react';
import type {} from '../shared/types';

// 生成瓦片key字符串用于IDB存储

// 瓦片坐标工具函数
export function tileToLatLng(z: number, x: number, y: number): [number, number] {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  const lng = (x / Math.pow(2, z)) * 360 - 180;
  return [lat, lng];
}
