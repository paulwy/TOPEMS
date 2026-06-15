import { useState, useEffect } from "react";
import { X, Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button, Typography, Box } from "@mui/material";

interface FullscreenChartProps {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
}

export const FullscreenChart = ({
  children,
  title,
  onClose,
}: FullscreenChartProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, onClose]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setScale(1);

  if (!isFullscreen) {
    return (
      <div style={{ position: "relative" }}>
        {children}
        <button
          onClick={() => setIsFullscreen(true)}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            padding: 8,
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: 8,
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            opacity: "0",
            transition: "opacity 0.2s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "0"}
          title="全屏查看"
        >
          <Maximize2 style={{ width: 16, height: 16, color: "text.secondary" }} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "white" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 2, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>{title || "图表详情"}</Typography>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button
            variant="text"
            size="small"
            onClick={handleZoomOut}
            title="缩小"
          >
            <ZoomOut sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={handleResetZoom}
            title="重置"
          >
            <span style={{ fontSize: 14, fontWeight: 500, width: 24, textAlign: "center" }}>
              {Math.round(scale * 100)}%
            </span>
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={handleZoomIn}
            title="放大"
          >
            <ZoomIn sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => setIsFullscreen(false)}
            title="退出全屏"
          >
            <Minimize2 sx={{ width: 16, height: 16 }} />
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setIsFullscreen(false);
              onClose?.();
            }}
            sx={{ color: "error.main" }}
            title="关闭"
          >
            <X sx={{ width: 16, height: 16 }} />
          </Button>
        </div>
      </Box>
      <div
        style={{
          flex: 1,
          padding: 32,
          overflow: "auto",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          minHeight: `${100 / scale}vh`,
          minWidth: `${100 / scale}vw`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FullscreenChart;