// modules/MapModule/LayerManager.tsx
import React from "react";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  MapPin,
  Navigation,
  Info,
  Pencil,
} from "lucide-react";

interface LayerToggleProps {
  label: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color: string;
}

const LayerToggle: React.FC<LayerToggleProps> = ({
  label,
  icon: _,
  checked,
  onChange,
  color,
}) => (
  <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
    <div
      className={`w-3 h-3 rounded-full ${checked ? "" : "bg-gray-300"}`}
      style={{ backgroundColor: checked ? color : undefined }}
    />
    <span className="text-sm text-gray-700">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="hidden"
    />
  </label>
);

interface LayerManagerProps {
  visibleLayers: {
    devices: boolean;
    pipelines: boolean;
    storage: boolean;
  };
  onToggleLayer: (layer: "devices" | "pipelines" | "storage") => void;
  showPanel: boolean;
  onTogglePanel: () => void;
  drawFeaturesLength?: number;
}

const LayerManager: React.FC<LayerManagerProps> = ({
  visibleLayers,
  onToggleLayer,
  showPanel,
  onTogglePanel,
  drawFeaturesLength = 0,
}) => {
  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md overflow-hidden">
      <button
        onClick={onTogglePanel}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-gray-700" />
          <span className="text-sm font-medium text-gray-700">图层</span>
        </div>
        {showPanel ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {showPanel && (
        <div className="px-3 py-3 space-y-2 border-t">
          <LayerToggle
            label="设备点位"
            icon={<MapPin className="w-4 h-4" />}
            checked={visibleLayers.devices}
            onChange={() => onToggleLayer("devices")}
            color="#00C897"
          />
          <LayerToggle
            label="管线"
            icon={<Navigation className="w-4 h-4" />}
            checked={visibleLayers.pipelines}
            onChange={() => onToggleLayer("pipelines")}
            color="#6366F1"
          />
          <LayerToggle
            label="仓储位置"
            icon={<Info className="w-4 h-4" />}
            checked={visibleLayers.storage}
            onChange={() => onToggleLayer("storage")}
            color="#F59E0B"
          />
          {drawFeaturesLength > 0 && (
            <div className="border-t pt-2 mt-2">
              <LayerToggle
                label="绘制图形"
                icon={<Pencil className="w-4 h-4" />}
                checked={true}
                onChange={() => {}}
                color="#EF4444"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LayerManager;
