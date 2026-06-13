// modules/MapModule/ToolPanel.tsx
import React from "react";
import {
  Ruler,
  Pencil,
  Eraser,
  Trash2,
  PlayCircle,
  Download,
  FileJson,
  Thermometer,
  Box,
  Globe,
} from "lucide-react";
import type { DrawFeature } from "../shared/types";

type ToolMode =
  | "select"
  | "measure-distance"
  | "measure-area"
  | "draw-point"
  | "draw-line"
  | "draw-polygon";

interface ToolPanelProps {
  toolMode: ToolMode;
  onSetTool: (tool: ToolMode) => void;
  onClearMeasure: () => void;
  onClearDrawings: () => void;
  onFinishDrawing: () => void;
  onExportGeoJSON: () => void;
  onExportDrawings: () => void;
  onToggleTrackPanel: () => void;
  onToggleHeatmap: () => void;
  onToggle3DView: () => void;
  onToggleMapType: () => void;
  showTrackPanel: boolean;
  showHeatmap: boolean;
  mapType: "osm" | "amap";
  measurePointsLength: number;
  drawFeaturesLength: number;
  currentDrawing: DrawFeature | null;
  heatmapMode: "density" | "status";
  onSetHeatmapMode: (mode: "density" | "status") => void;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  toolMode,
  onSetTool,
  onClearMeasure,
  onClearDrawings,
  onFinishDrawing,
  onExportGeoJSON,
  onExportDrawings,
  onToggleTrackPanel,
  onToggleHeatmap,
  onToggle3DView,
  onToggleMapType,
  showTrackPanel,
  showHeatmap,
  mapType,
  measurePointsLength,
  drawFeaturesLength,
  currentDrawing,
  heatmapMode,
  onSetHeatmapMode,
}) => {
  const getToolColor = (tool: ToolMode) => {
    return toolMode === tool
      ? "bg-blue-500 text-white"
      : "bg-white text-gray-700 hover:bg-gray-50";
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500">工具</span>
      </div>
      <div className="p-2 space-y-1">
        <button
          onClick={() => onSetTool("select")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("select")}`}
          title="选择工具"
        >
          <div className="w-4 h-4 border-2 border-gray-600 rounded" />
          <span className="text-xs">选择</span>
        </button>
        <button
          onClick={() => onSetTool("measure-distance")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("measure-distance")}`}
          title="距离测量"
        >
          <Ruler className="w-4 h-4" />
          <span className="text-xs">测距</span>
        </button>
        <button
          onClick={() => onSetTool("measure-area")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("measure-area")}`}
          title="面积测量"
        >
          <Ruler className="w-4 h-4" />
          <span className="text-xs">测面积</span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        <button
          onClick={() => onSetTool("draw-point")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("draw-point")}`}
          title="绘制点"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-xs">绘点</span>
        </button>
        <button
          onClick={() => onSetTool("draw-line")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("draw-line")}`}
          title="绘制线"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-xs">绘线</span>
        </button>
        <button
          onClick={() => onSetTool("draw-polygon")}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${getToolColor("draw-polygon")}`}
          title="绘制多边形"
        >
          <Pencil className="w-4 h-4" />
          <span className="text-xs">绘多边形</span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        {(toolMode === "measure-distance" || toolMode === "measure-area") &&
          measurePointsLength > 0 && (
            <button
              onClick={onClearMeasure}
              className="w-full p-2 rounded-lg transition-colors flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
              title="清除测量"
            >
              <Eraser className="w-4 h-4" />
              <span className="text-xs">清除</span>
            </button>
          )}
        {drawFeaturesLength > 0 && (
          <button
            onClick={onClearDrawings}
            className="w-full p-2 rounded-lg transition-colors flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100"
            title="清除所有绘制"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs">清除绘制</span>
          </button>
        )}
        {currentDrawing && (
          <button
            onClick={onFinishDrawing}
            className="w-full p-2 rounded-lg transition-colors flex items-center gap-2 bg-green-50 text-green-600 hover:bg-green-100"
            title="完成绘制 (Enter)"
          >
            <span className="text-xs">完成绘制</span>
          </button>
        )}
        <div className="border-t border-gray-100 my-2" />
        <button
          onClick={onToggleTrackPanel}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${
            showTrackPanel
              ? "bg-purple-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="设备轨迹追踪"
        >
          <PlayCircle className="w-4 h-4" />
          <span className="text-xs">轨迹追踪</span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        <button
          onClick={onExportGeoJSON}
          className="w-full p-2 rounded-lg transition-colors flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100"
          title="导出GeoJSON"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs">导出GeoJSON</span>
        </button>
        <button
          onClick={onExportDrawings}
          className="w-full p-2 rounded-lg transition-colors flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          title="导出绘制图形"
        >
          <FileJson className="w-4 h-4" />
          <span className="text-xs">导出绘制图形</span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        <button
          onClick={onToggleMapType}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${
            mapType === "amap"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="切换地图"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs">
            {mapType === "osm" ? "切换高德" : "切换OSM"}
          </span>
        </button>
        <div className="border-t border-gray-100 my-2" />
        <button
          onClick={onToggleHeatmap}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${
            showHeatmap
              ? "bg-red-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="热力图"
        >
          <Thermometer className="w-4 h-4" />
          <span className="text-xs">热力图</span>
        </button>
        {showHeatmap && (
          <div className="px-2 py-1 space-y-1">
            <button
              onClick={() => onSetHeatmapMode("density")}
              className={`w-full p-1.5 rounded text-xs text-left transition-colors ${
                heatmapMode === "density"
                  ? "bg-red-100 text-red-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              密度模式
            </button>
            <button
              onClick={() => onSetHeatmapMode("status")}
              className={`w-full p-1.5 rounded text-xs text-left transition-colors ${
                heatmapMode === "status"
                  ? "bg-red-100 text-red-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              状态模式
            </button>
          </div>
        )}
        <button
          onClick={onToggle3DView}
          className={`w-full p-2 rounded-lg transition-colors flex items-center gap-2 ${
            showHeatmap
              ? "bg-indigo-500 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="3D视图"
        >
          <Box className="w-4 h-4" />
          <span className="text-xs">3D视图</span>
        </button>
      </div>
    </div>
  );
};

export default ToolPanel;
