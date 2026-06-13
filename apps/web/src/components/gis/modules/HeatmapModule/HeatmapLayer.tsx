// modules/HeatmapModule/HeatmapLayer.tsx
import React, { useEffect, useRef, useMemo } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { DevicePoint, StorageLocation } from "../../../../api/gis";

interface HeatmapLayerProps {
  devicePoints: DevicePoint[];
  storageLocations: StorageLocation[];
  mapRef: unknown;
  visible: boolean;
  intensityMode: "density" | "status";
}

// Simple heatmap implementation using Canvas
const HeatmapLayer: React.FC<HeatmapLayerProps> = ({
  devicePoints,
  storageLocations,
  visible,
  intensityMode,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<L.Layer | null>(null);

  // Generate heatmap data points
  const heatmapData = useMemo(() => {
    const points: Array<{ lat: number; lng: number; intensity: number }> = [];

    devicePoints.forEach((point) => {
      let intensity = 0.5;
      if (intensityMode === "status") {
        if (
          point.status?.toLowerCase().includes("active") ||
          point.status?.includes("启用")
        ) {
          intensity = 1.0;
        } else if (
          point.status?.toLowerCase().includes("pending") ||
          point.status?.includes("待处理")
        ) {
          intensity = 0.6;
        } else {
          intensity = 0.3;
        }
      }
      points.push({
        lat: point.latitude,
        lng: point.longitude,
        intensity,
      });
    });

    storageLocations.forEach((location) => {
      points.push({
        lat: location.latitude,
        lng: location.longitude,
        intensity: 0.7,
      });
    });

    return points;
  }, [devicePoints, storageLocations, intensityMode]);

  // Render heatmap
  useEffect(() => {
    if (!visible || !map) return;

    const canvas = document.createElement("canvas");
    canvas.width = map.getSize().x;
    canvas.height = map.getSize().y;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "400";
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw heatmap
    const bounds = map.getBounds();
    const zoom = map.getZoom();

    heatmapData.forEach((point) => {
      const latlng = L.latLng(point.lat, point.lng);
      if (!bounds.contains(latlng)) return;

      const pixelPoint = map.latLngToContainerPoint(latlng);
      const radius = Math.max(20, 60 - zoom * 2);

      const gradient = ctx.createRadialGradient(
        pixelPoint.x,
        pixelPoint.y,
        0,
        pixelPoint.x,
        pixelPoint.y,
        radius * point.intensity,
      );

      gradient.addColorStop(0, `rgba(255, 0, 0, ${0.6 * point.intensity})`);
      gradient.addColorStop(0.5, `rgba(255, 165, 0, ${0.3 * point.intensity})`);
      gradient.addColorStop(1, "rgba(255, 255, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        pixelPoint.x,
        pixelPoint.y,
        radius * point.intensity,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    // Create overlay layer
    const HeatmapOverlay = L.Layer.extend({
      initialize: function (this: L.Layer & { _canvas: HTMLCanvasElement }) {
        this._canvas = canvas;
      },
      onAdd: function (this: L.Layer & { _canvas: HTMLCanvasElement }) {
        L.DomUtil.get(this._canvas.id) || L.DomUtil.get(this._canvas.id);
      },
      setCanvas: function (
        this: L.Layer & { _canvas: HTMLCanvasElement },
        newCanvas: HTMLCanvasElement,
      ) {
        this._canvas = newCanvas;
      },
    });

    const overlay = new HeatmapOverlay() as L.Layer;
    overlayRef.current = overlay;
    map.addLayer(overlay);

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
      }
      if (canvasRef.current) {
        canvasRef.current.remove();
      }
    };
  }, [map, visible, heatmapData]);

  // Update on move/zoom
  useEffect(() => {
    if (!visible || !map) return;

    const handleMove = () => {
      if (!canvasRef.current || !map) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = map.getSize().x;
      canvas.height = map.getSize().y;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bounds = map.getBounds();
      const zoom = map.getZoom();

      heatmapData.forEach((point) => {
        const latlng = L.latLng(point.lat, point.lng);
        if (!bounds.contains(latlng)) return;

        const pixelPoint = map.latLngToContainerPoint(latlng);
        const radius = Math.max(20, 60 - zoom * 2);

        const gradient = ctx.createRadialGradient(
          pixelPoint.x,
          pixelPoint.y,
          0,
          pixelPoint.x,
          pixelPoint.y,
          radius * point.intensity,
        );

        gradient.addColorStop(0, `rgba(255, 0, 0, ${0.6 * point.intensity})`);
        gradient.addColorStop(
          0.5,
          `rgba(255, 165, 0, ${0.3 * point.intensity})`,
        );
        gradient.addColorStop(1, "rgba(255, 255, 0, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
          pixelPoint.x,
          pixelPoint.y,
          radius * point.intensity,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      });
    };

    map.on("move", handleMove);
    map.on("zoom", handleMove);

    return () => {
      map.off("move", handleMove);
      map.off("zoom", handleMove);
    };
  }, [map, visible, heatmapData]);

  return null;
};

// HeatmapLegend Component
const HeatmapLegend: React.FC<{ mode: "density" | "status" }> = ({ mode }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">热力图</div>
      <div className="flex items-center gap-1">
        <div
          className="w-4 h-4 rounded"
          style={{
            background:
              "linear-gradient(to right, rgba(0,255,0,0), rgba(255,0,0,1))",
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>低</span>
        <span>高</span>
      </div>
      {mode === "status" && (
        <div className="mt-2 pt-2 border-t space-y-1">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">活跃</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">待处理</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">禁用</span>
          </div>
        </div>
      )}
    </div>
  );
};

export { HeatmapLayer, HeatmapLegend };
export default HeatmapLayer;
