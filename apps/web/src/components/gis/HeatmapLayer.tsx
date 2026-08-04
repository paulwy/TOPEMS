import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';
import { Box, Typography, Paper } from '@mui/material';
import 'leaflet/dist/leaflet.css';
import type { DevicePoint, StorageLocation } from '../../api/gis';

interface HeatmapLayerProps {
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];
  mapRef?: React.RefObject<L.Map | null>;
  visible: boolean;
  intensityMode: 'density' | 'status';
}

const colorCache = new Map<number, string>();

const getCachedColor = (intensity: number): string => {
  const key = Math.floor(intensity * 255);
  if (colorCache.has(key)) {
    return colorCache.get(key)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'rgba(255, 0, 0, 0.5)';

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
  gradient.addColorStop(0.3, 'rgba(0, 255, 0, 0.5)');
  gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.7)');
  gradient.addColorStop(0.7, 'rgba(255, 128, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 0, 0, 1)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  const imageData = ctx.getImageData(0, 0, 256, 1);
  const index = Math.min(key, 255);
  const i = index * 4;
  const color = `rgba(${imageData.data[i]}, ${imageData.data[i + 1]}, ${imageData.data[i + 2]}, ${imageData.data[i + 3] / 255})`;

  colorCache.set(key, color);
  return color;
};

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  devicePoints,
  storageLocations,
  mapRef,
  visible,
  intensityMode,
}) => {
  const heatmapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const map = useMap();
  const effectiveMap = mapRef?.current || map;

  const heatmapData = useMemo(() => {
    if (!visible || !effectiveMap) return [];

    const result: { x: number; y: number; value: number }[] = [];

    devicePoints.forEach((p) => {
      const pixel = effectiveMap.latLngToContainerPoint(L.latLng(p.latitude, p.longitude));
      let value = 1;
      if (intensityMode === 'status') {
        const status = p.status.toLowerCase();
        if (status.includes('active') || status.includes('启用')) {
          value = 0.3;
        } else if (status.includes('pending') || status.includes('待处理')) {
          value = 0.7;
        } else if (status.includes('inactive') || status.includes('禁用')) {
          value = 1;
        }
      }
      result.push({ x: pixel.x, y: pixel.y, value });
    });

    storageLocations.forEach((s) => {
      const pixel = effectiveMap.latLngToContainerPoint(L.latLng(s.latitude, s.longitude));
      result.push({ x: pixel.x, y: pixel.y, value: 1 });
    });

    return result;
  }, [devicePoints, storageLocations, effectiveMap, visible, intensityMode]);

  useEffect(() => {
    if (!visible || !effectiveMap || heatmapData.length === 0) {
      if (heatmapRef.current) {
        heatmapRef.current.remove();
        heatmapRef.current = null;
      }
      return;
    }

    const size = effectiveMap.getSize();

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size.x, size.y);

    const gridSize = 10;
    const gridRows = Math.ceil(size.y / gridSize);
    const gridCols = Math.ceil(size.x / gridSize);

    const grid = new Float32Array(gridRows * gridCols);
    grid.fill(0);

    heatmapData.forEach((point) => {
      const gridX = Math.floor(point.x / gridSize);
      const gridY = Math.floor(point.y / gridSize);

      const radius = 3;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = gridX + dx;
          const ny = gridY + dy;
          if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            const weight = distance <= radius ? (1 - distance / radius) * point.value : 0;
            grid[ny * gridCols + nx] += weight;
          }
        }
      }
    });

    let maxIntensity = 0;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] > maxIntensity) maxIntensity = grid[i];
    }
    if (maxIntensity === 0) return;

    for (let y = 0; y < gridRows; y++) {
      for (let x = 0; x < gridCols; x++) {
        const intensity = grid[y * gridCols + x] / maxIntensity;
        if (intensity < 0.05) continue;

        const color = getCachedColor(intensity);
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(intensity, 0.6);
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
    }

    ctx.globalAlpha = 1;

    if (!heatmapRef.current) {
      const overlay = L.DomUtil.create('div', 'leaflet-heatmap-overlay');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';

      const pane = effectiveMap.getPane('overlayPane');
      if (pane) {
        pane.appendChild(overlay);
        heatmapRef.current = overlay;
      }
    }

    if (heatmapRef.current && canvas.parentNode !== heatmapRef.current) {
      heatmapRef.current.innerHTML = '';
      heatmapRef.current.appendChild(canvas);
    }

    const handleMove = () => {
      if (heatmapRef.current) {
        heatmapRef.current.remove();
        heatmapRef.current = null;
      }
    };

    effectiveMap.on('move', handleMove);
    effectiveMap.on('zoom', handleMove);

    return () => {
      effectiveMap.off('move', handleMove);
      effectiveMap.off('zoom', handleMove);
      if (heatmapRef.current) {
        heatmapRef.current.remove();
        heatmapRef.current = null;
      }
    };
  }, [heatmapData, effectiveMap, visible]);

  return null;
};

export const HeatmapLegend: React.FC<{ mode: 'density' | 'status' }> = ({ mode }) => {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, boxShadow: 2 }}>
      <Typography
        variant='caption'
        sx={{ fontWeight: 500, color: 'text.secondary', mb: 2 }}
      >
        {mode === 'density' ? '密度图例' : '状态图例'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 128,
            height: 12,
            borderRadius: 1,
            background:
              'linear-gradient(to right, rgba(0, 255, 0, 0.3), rgba(0, 255, 0, 0.5), rgba(255, 255, 0, 0.7), rgba(255, 128, 0, 0.8), rgba(255, 0, 0, 1))',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          低
        </Typography>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          高
        </Typography>
      </Box>
      {mode === 'status' && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 1,
                bgcolor: 'common.white',
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              正常运行
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 1,
                bgcolor: 'common.white',
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              待处理
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: 1,
                bgcolor: 'common.white',
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              异常/禁用
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default HeatmapLayer;
