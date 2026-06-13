// modules/MapModule/MapControls.tsx
import React from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface MapControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  bounds?: [number, number][] | undefined;
  onFitBounds: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  bounds,
  onFitBounds,
}) => {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-2">
      <button
        onClick={onZoomIn}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        title="放大"
      >
        <ZoomIn className="w-5 h-5 text-gray-700" />
      </button>
      <button
        onClick={onZoomOut}
        className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        title="缩小"
      >
        <ZoomOut className="w-5 h-5 text-gray-700" />
      </button>
      {bounds && bounds.length >= 2 && (
        <button
          onClick={onFitBounds}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
          title="缩放到所有标记"
        >
          <Maximize2 className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  );
};

export default MapControls;
