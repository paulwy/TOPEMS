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
import { Box as MuiBox, Typography, Paper, Divider,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
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
  onToggleOfflineMode: () => void;
  showTrackPanel: boolean;
  showHeatmap: boolean;
  mapType: "osm" | "amap";
  offlineMode: boolean;
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
  onToggleOfflineMode,
  showTrackPanel,
  showHeatmap,
  mapType,
  offlineMode,
  measurePointsLength,
  drawFeaturesLength,
  currentDrawing,
  heatmapMode,
  onSetHeatmapMode,
}) => {
  const getToolColor = (tool: ToolMode) => {
    return toolMode === tool
      ? { bgcolor: "#2563eb", color: "white" }
      : { bgcolor: "white", color: "#374151", hover: "#f9fafb" };
  };

  return (
    <Paper
      sx={{
        position: "absolute",
        top: 16,
        left: 16,
        borderRadius: 2,
        boxShadow: 2,
        overflow: "hidden",
      }}
    >
      <MuiBox sx={{ px: 3, py: 2, borderBottom: 1, borderColor: "#f3f4f6" }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 500, color: "#6b7280" }}
        >
          工具
        </Typography>
      </MuiBox>
      <MuiBox sx={{ p: 2 }}>
        <Button
          onClick={() => onSetTool("select")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("select").bgcolor,
            color: getToolColor("select").color,
            "&:hover": {
              bgcolor:
                getToolColor("select").hover || getToolColor("select").bgcolor,
            },
            textTransform: "none",
          }}
          title="选择工具"
        >
          <MuiBox
            sx={{
              width: 16,
              height: 16,
              border: 2,
              borderColor: "#374151",
              borderRadius: 1,
            }}
          />
          <Typography variant="caption">选择</Typography>
        </Button>
        <Button
          onClick={() => onSetTool("measure-distance")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("measure-distance").bgcolor,
            color: getToolColor("measure-distance").color,
            "&:hover": {
              bgcolor:
                getToolColor("measure-distance").hover ||
                getToolColor("measure-distance").bgcolor,
            },
            textTransform: "none",
            mt: 1,
          }}
          title="距离测量"
        >
          <Ruler size={16} />
          <Typography variant="caption">测距</Typography>
        </Button>
        <Button
          onClick={() => onSetTool("measure-area")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("measure-area").bgcolor,
            color: getToolColor("measure-area").color,
            "&:hover": {
              bgcolor:
                getToolColor("measure-area").hover ||
                getToolColor("measure-area").bgcolor,
            },
            textTransform: "none",
            mt: 1,
          }}
          title="面积测量"
        >
          <Ruler size={16} />
          <Typography variant="caption">测面积</Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={() => onSetTool("draw-point")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("draw-point").bgcolor,
            color: getToolColor("draw-point").color,
            "&:hover": {
              bgcolor:
                getToolColor("draw-point").hover ||
                getToolColor("draw-point").bgcolor,
            },
            textTransform: "none",
          }}
          title="绘制点"
        >
          <Pencil size={16} />
          <Typography variant="caption">绘点</Typography>
        </Button>
        <Button
          onClick={() => onSetTool("draw-line")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("draw-line").bgcolor,
            color: getToolColor("draw-line").color,
            "&:hover": {
              bgcolor:
                getToolColor("draw-line").hover ||
                getToolColor("draw-line").bgcolor,
            },
            textTransform: "none",
            mt: 1,
          }}
          title="绘制线"
        >
          <Pencil size={16} />
          <Typography variant="caption">绘线</Typography>
        </Button>
        <Button
          onClick={() => onSetTool("draw-polygon")}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: getToolColor("draw-polygon").bgcolor,
            color: getToolColor("draw-polygon").color,
            "&:hover": {
              bgcolor:
                getToolColor("draw-polygon").hover ||
                getToolColor("draw-polygon").bgcolor,
            },
            textTransform: "none",
            mt: 1,
          }}
          title="绘制多边形"
        >
          <Pencil size={16} />
          <Typography variant="caption">绘多边形</Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        {(toolMode === "measure-distance" || toolMode === "measure-area") &&
          measurePointsLength > 0 && (
            <Button
              onClick={onClearMeasure}
              sx={{
                width: "100%",
                p: 2,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 2,
                bgcolor: "#f1f5f9",
                color: "#374151",
                "&:hover": { bgcolor: "#e5e7eb" },
                textTransform: "none",
              }}
              title="清除测量"
            >
              <Eraser size={16} />
              <Typography variant="caption">清除</Typography>
            </Button>
          )}
        {drawFeaturesLength > 0 && (
          <Button
            onClick={onClearDrawings}
            sx={{
              width: "100%",
              p: 2,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "#fee2e2",
              color: "#dc2626",
              "&:hover": { bgcolor: "#fecaca" },
              textTransform: "none",
              mt: 1,
            }}
            title="清除所有绘制"
          >
            <Trash2 size={16} />
            <Typography variant="caption">清除绘制</Typography>
          </Button>
        )}
        {currentDrawing && (
          <Button
            onClick={onFinishDrawing}
            sx={{
              width: "100%",
              p: 2,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
              bgcolor: "#dcfce7",
              color: "#16a34a",
              "&:hover": { bgcolor: "#bbf7d0" },
              textTransform: "none",
              mt: 1,
            }}
            title="完成绘制 (Enter)"
          >
            <Typography variant="caption">完成绘制</Typography>
          </Button>
        )}
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={onToggleTrackPanel}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: showTrackPanel ? "#9333ea" : "white",
            color: showTrackPanel ? "white" : "#374151",
            "&:hover": { bgcolor: showTrackPanel ? "#7c3aed" : "#f9fafb" },
            textTransform: "none",
          }}
          title="设备轨迹追踪"
        >
          <PlayCircle size={16} />
          <Typography variant="caption">轨迹追踪</Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={onExportGeoJSON}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: "#eff6ff",
            color: "#2563eb",
            "&:hover": { bgcolor: "#dbeafe" },
            textTransform: "none",
          }}
          title="导出GeoJSON"
        >
          <Download size={16} />
          <Typography variant="caption">导出GeoJSON</Typography>
        </Button>
        <Button
          onClick={onExportDrawings}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: "#eef2ff",
            color: "#6366f1",
            "&:hover": { bgcolor: "#e0e7ff" },
            textTransform: "none",
            mt: 1,
          }}
          title="导出绘制图形"
        >
          <FileJson size={16} />
          <Typography variant="caption">导出绘制图形</Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={onToggleMapType}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: mapType === "amap" ? "#2563eb" : "white",
            color: mapType === "amap" ? "white" : "#374151",
            "&:hover": { bgcolor: mapType === "amap" ? "#1d4ed8" : "#f9fafb" },
            textTransform: "none",
          }}
          title="切换地图"
        >
          <Globe size={16} />
          <Typography variant="caption">
            {mapType === "osm" ? "切换高德" : "切换OSM"}
          </Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={onToggleHeatmap}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: showHeatmap ? "#dc2626" : "white",
            color: showHeatmap ? "white" : "#374151",
            "&:hover": { bgcolor: showHeatmap ? "#b91c1c" : "#f9fafb" },
            textTransform: "none",
          }}
          title="热力图"
        >
          <Thermometer size={16} />
          <Typography variant="caption">热力图</Typography>
        </Button>
        {showHeatmap && (
          <MuiBox sx={{ px: 2, py: 1 }}>
            <Button
              onClick={() => onSetHeatmapMode("density")}
              sx={{
                width: "100%",
                p: 1.5,
                borderRadius: 1,
                textAlign: "left",
                bgcolor: heatmapMode === "density" ? "#fee2e2" : "transparent",
                color: heatmapMode === "density" ? "#b91c1c" : "#4b5563",
                "&:hover": {
                  bgcolor: heatmapMode === "density" ? "#fee2e2" : "#f3f4f6",
                },
                textTransform: "none",
                fontSize: "0.75rem",
              }}
            >
              密度模式
            </Button>
            <Button
              onClick={() => onSetHeatmapMode("status")}
              sx={{
                width: "100%",
                p: 1.5,
                borderRadius: 1,
                textAlign: "left",
                bgcolor: heatmapMode === "status" ? "#fee2e2" : "transparent",
                color: heatmapMode === "status" ? "#b91c1c" : "#4b5563",
                "&:hover": {
                  bgcolor: heatmapMode === "status" ? "#fee2e2" : "#f3f4f6",
                },
                textTransform: "none",
                fontSize: "0.75rem",
                mt: 1,
              }}
            >
              状态模式
            </Button>
          </MuiBox>
        )}
        <Button
          onClick={onToggle3DView}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: showHeatmap ? "#6366f1" : "white",
            color: showHeatmap ? "white" : "#374151",
            "&:hover": { bgcolor: showHeatmap ? "#4f46e5" : "#f9fafb" },
            textTransform: "none",
          }}
          title="3D视图"
        >
          <Box size={16} />
          <Typography variant="caption">3D视图</Typography>
        </Button>
        <Divider sx={{ my: 2 }} />
        <Button
          onClick={onToggleOfflineMode}
          sx={{
            width: "100%",
            p: 2,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
            bgcolor: offlineMode ? "#16a34a" : "white",
            color: offlineMode ? "white" : "#374151",
            "&:hover": { bgcolor: offlineMode ? "#15803d" : "#f9fafb" },
            textTransform: "none",
          }}
          title="离线模式"
        >
          <Typography variant="caption">
            {offlineMode ? "离线模式" : "在线模式"}
          </Typography>
        </Button>
      </MuiBox>
    </Paper>
  );
};

export default ToolPanel;
