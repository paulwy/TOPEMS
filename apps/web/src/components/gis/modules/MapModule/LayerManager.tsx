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
import { Box, Typography, Paper, IconButton } from "@mui/material";
import { Button } from "@/components/ui/Button";

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
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 2,
      cursor: "pointer",
      "&:hover": { bgcolor: "#f9fafb" },
      px: 2,
      py: 1,
      borderRadius: 1,
    }}
    onClick={() => onChange(!checked)}
  >
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        bgcolor: checked ? color : "#d1d5db",
      }}
    />
    <Typography variant="body2" sx={{ color: "#374151" }}>
      {label}
    </Typography>
  </Box>
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
    <Paper
      sx={{
        position: "absolute",
        top: 16,
        right: 16,
        borderRadius: 2,
        boxShadow: 2,
        overflow: "hidden",
      }}
    >
      <Button
        onClick={onTogglePanel}
        sx={{
          width: "100%",
          px: 4,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          "&:hover": { bgcolor: "#f9fafb" },
          textTransform: "none",
          bgcolor: "transparent",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Layers size={20} style={{ color: "#374151" }} />
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "#374151" }}
          >
            图层
          </Typography>
        </Box>
        {showPanel ? (
          <ChevronUp size={16} style={{ color: "#6b7280" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "#6b7280" }} />
        )}
      </Button>
      {showPanel && (
        <Box sx={{ px: 3, py: 3, borderTop: 1, borderColor: "#e5e7eb" }}>
          <LayerToggle
            label="设备点位"
            icon={<MapPin size={16} />}
            checked={visibleLayers.devices}
            onChange={() => onToggleLayer("devices")}
            color="#00C897"
          />
          <LayerToggle
            label="管线"
            icon={<Navigation size={16} />}
            checked={visibleLayers.pipelines}
            onChange={() => onToggleLayer("pipelines")}
            color="#6366F1"
          />
          <LayerToggle
            label="仓储位置"
            icon={<Info size={16} />}
            checked={visibleLayers.storage}
            onChange={() => onToggleLayer("storage")}
            color="#F59E0B"
          />
          {drawFeaturesLength > 0 && (
            <Box sx={{ borderTop: 1, borderColor: "#e5e7eb", pt: 2, mt: 2 }}>
              <LayerToggle
                label="绘制图形"
                icon={<Pencil size={16} />}
                checked={true}
                onChange={() => {}}
                color="#EF4444"
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default LayerManager;
