/**
 * GIS组件性能优化工具
 *
 * 包含：
 * - 轨迹点简化算法
 * - 虚拟列表辅助函数
 * - 地图渲染节流
 */

import { useMemo, useCallback, useRef } from 'react';

/**
 * 轨迹简化 - Douglas-Peucker 算法
 * 用于减少轨迹点数量以提高渲染性能
 */
export function simplifyTrack(
  points: Array<{ lat: number; lng: number; timestamp?: number }>,
  tolerance: number = 0.0001
): Array<{ lat: number; lng: number; timestamp?: number }> {
  if (points.length <= 2) return points;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyTrack(points.slice(0, maxIndex + 1), tolerance);
    const right = simplifyTrack(points.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [firstPoint, lastPoint];
}

function perpendicularDistance(
  point: { lat: number; lng: number },
  lineStart: { lat: number; lng: number },
  lineEnd: { lat: number; lng: number }
): number {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.lng - lineStart.lng, 2) + Math.pow(point.lat - lineStart.lat, 2)
    );
  }

  const t =
    ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy);

  const closestLng = lineStart.lng + t * dx;
  const closestLat = lineStart.lat + t * dy;

  return Math.sqrt(Math.pow(point.lng - closestLng, 2) + Math.pow(point.lat - closestLat, 2));
}

/**
 * 计算两点间距离（米）
 */
export function calculateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 计算轨迹总长度（米）
 */
export function calculateTrackLength(points: Array<{ lat: number; lng: number }>): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += calculateDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * 创建防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * 创建节流函数
 */

export function throttle(
  func: (...args: any[]) => void,
  limit: number
): (...args: Parameters<typeof func>) => void {
  let inThrottle = false;

  return function (...args: Parameters<typeof func>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 虚拟列表范围计算
 * 用于大型列表的按需渲染
 */
export function getVirtualRange(
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  overscan: number = 3
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return { startIndex, endIndex };
}

/**
 * 批量处理大数组
 * 将大数组分割成小块进行处理以避免阻塞UI
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 100,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, total));
    const batchResults = batch.map(processor);
    results.push(...batchResults);

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total);
    }

    // 让出主线程
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}

/**
 * 缓存计算结果
 * 用于缓存 expensive 的计算
 */
export class MemoCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      // 删除最老的条目
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * useMemoizedTrack - 用于缓存轨迹计算的 Hook
 */
export function useMemoizedTrack<T extends { lat: number; lng: number }>(
  points: T[],
  tolerance: number = 0.0001
) {
  return useMemo(() => simplifyTrack(points, tolerance), [points, tolerance]);
}

/**
 * useThrottledCallback - 节流回调 Hook
 */

export function useThrottledCallback<T extends (...args: any[]) => void>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const throttledRef = useRef<((...args: Parameters<T>) => void) | null>(null);

  callbackRef.current = callback;

  if (!throttledRef.current) {
    throttledRef.current = throttle(
      (...args: Parameters<T>) => callbackRef.current(...args),
      limit
    );
  }

  return throttledRef.current;
}

/**
 * 瓦片加载优化 - 预加载周围瓦片
 */
export function preloadAdjacentTiles(
  centerTile: { z: number; x: number; y: number },
  getTileUrl: (z: number, x: number, y: number) => string,
  preloadLevels: number[] = [1, 2]
): string[] {
  const urls: string[] = [];

  for (const level of preloadLevels) {
    for (let dx = -level; dx <= level; dx++) {
      for (let dy = -level; dy <= level; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = centerTile.x + dx;
        const ny = centerTile.y + dy;
        urls.push(getTileUrl(centerTile.z, nx, ny));
      }
    }
  }

  return urls;
}

/**
 * 批量预加载图片
 */
export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load: ${url}`));
          img.src = url;
        })
    )
  ).then(() => {});
}
