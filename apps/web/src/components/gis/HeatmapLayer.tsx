import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DevicePoint, StorageLocation } from "../../api/gis";

interface HeatmapLayerProps {
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];
  mapRef: React.RefObject<L.Map | null>;
  visible: boolean;
  intensityMode: "density" | "status";
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  devicePoints,
  storageLocations,
  mapRef,
  visible,
  intensityMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!visible || !mapRef.current) {
      if (heatmapRef.current) {
        heatmapRef.current.remove();
        heatmapRef.current = null;
      }
      return;
    }

    const map = mapRef.current;
    const bounds = map.getBounds();
    const size = map.getSize();

    const canvas = document.createElement("canvas");
    canvas.width = size.x;
    canvas.height = size.y;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const heatmapData: { x: number; y: number; value: number }[] = [];

    const allPoints = [
      ...devicePoints.map((p) => ({
        lat: p.latitude,
        lng: p.longitude,
        type: "device" as const,
        status: p.status,
      })),
      ...storageLocations.map((s) => ({
        lat: s.latitude,
        lng: s.longitude,
        type: "storage" as const,
        status: "active",
      })),
    ];

    allPoints.forEach((point) => {
      const pixel = map.latLngToContainerPoint(L.latLng(point.lat, point.lng));

      let value = 1;
      if (intensityMode === "status") {
        const status = point.status.toLowerCase();
        if (status.includes("active") || status.includes("启用")) {
          value = 0.3;
        } else if (status.includes("pending") || status.includes("待处理")) {
          value = 0.7;
        } else if (status.includes("inactive") || status.includes("禁用")) {
          value = 1;
        }
      } else {
        value = 1;
      }

      heatmapData.push({
        x: pixel.x,
        y: pixel.y,
        value,
      });
    });

    drawHeatmap(ctx, heatmapData, size.x, size.y);

    const overlay = L.DomUtil.create("div", "leaflet-heatmap-overlay");
    overlay.appendChild(canvas);
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";

    const pane = map.getPane("overlayPane");
    if (pane) {
      pane.appendChild(overlay);
      heatmapRef.current = overlay;
      setIsReady(true);
    }

    const handleMove = () => {
      if (!heatmapRef.current) return;
      heatmapRef.current.remove();
      heatmapRef.current = null;
    };

    map.on("move", handleMove);
    map.on("zoom", handleMove);

    return () => {
      map.off("move", handleMove);
      map.off("zoom", handleMove);
      if (heatmapRef.current) {
        heatmapRef.current.remove();
        heatmapRef.current = null;
      }
    };
  }, [devicePoints, storageLocations, mapRef, visible, intensityMode]);

  return null;
};

const drawHeatmap = (
  ctx: CanvasRenderingContext2D,
  data: { x: number; y: number; value: number }[],
  width: number,
  height: number,
) => {
  ctx.clearRect(0, 0, width, height);

  const gridSize = 10;
  const grid: number[][] = Array(Math.ceil(height / gridSize))
    .fill(null)
    .map(() => Array(Math.ceil(width / gridSize)).fill(0));

  data.forEach((point) => {
    const gridX = Math.floor(point.x / gridSize);
    const gridY = Math.floor(point.y / gridSize);

    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gridX + dx;
        const ny = gridY + dy;
        if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          const weight =
            distance <= radius ? (1 - distance / radius) * point.value : 0;
          grid[ny][nx] += weight;
        }
      }
    }
  });

  const maxIntensity = Math.max(...grid.flat());
  if (maxIntensity === 0) return;

  const gradient = createGradient();

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const intensity = grid[y][x] / maxIntensity;
      if (intensity < 0.05) continue;

      const color = getColor(gradient, intensity);
      ctx.fillStyle = color;
      ctx.globalAlpha = Math.min(intensity, 0.6);
      ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    }
  }

  ctx.globalAlpha = 1;
};

const createGradient = (): CanvasGradient => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null as any;
  }

  canvas.width = 256;
  canvas.height = 1;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  gradient.addColorStop(0, "rgba(0, 255, 0, 0)");
  gradient.addColorStop(0.3, "rgba(0, 255, 0, 0.5)");
  gradient.addColorStop(0.5, "rgba(255, 255, 0, 0.7)");
  gradient.addColorStop(0.7, "rgba(255, 128, 0, 0.8)");
  gradient.addColorStop(1, "rgba(255, 0, 0, 1)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return gradient;
};

const getColor = (gradient: CanvasGradient, intensity: number): string => {
  if (!gradient) return "rgba(255, 0, 0, 0.5)";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "rgba(255, 0, 0, 0.5)";

  canvas.width = 256;
  canvas.height = 1;
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  const imageData = ctx.getImageData(0, 0, 256, 1);
  const index = Math.min(Math.floor(intensity * 255), 255);
  const i = index * 4;

  return `rgba(${imageData.data[i]}, ${imageData.data[i + 1]}, ${imageData.data[i + 2]}, ${imageData.data[i + 3] / 255})`;
};

export const HeatmapLegend: React.FC<{ mode: "density" | "status" }> = ({
  mode,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">
        {mode === "density" ? "密度图例" : "状态图例"}
      </div>
      <div className="flex items-center gap-1">
        <div
          className="w-32 h-3 rounded"
          style={{
            background:
              "linear-gradient(to right, rgba(0, 255, 0, 0.3), rgba(0, 255, 0, 0.5), rgba(255, 255, 0, 0.7), rgba(255, 128, 0, 0.8), rgba(255, 0, 0, 1))",
          }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>低</span>
        <span>高</span>
      </div>
      {mode === "status" && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(0, 255, 0, 0.5)" }}
            />
            <span>正常运行</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(255, 255, 0, 0.7)" }}
            />
            <span>待处理</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: "rgba(255, 0, 0, 1)" }}
            />
            <span>异常/禁用</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeatmapLayer;
