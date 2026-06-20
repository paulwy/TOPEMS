// modules/EvidenceModule/EvidencePanel.tsx
import React, { useState, useCallback } from "react";
import { Camera, Mic, Video, List, Grid, Search, X, Tag } from "lucide-react";
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  IconButton,
  Chip,
  Grid as MuiGrid,
  Stack,
} from "@mui/material";
import type { EvidenceRecord, EvidenceType } from "./types";
import PhotoCapture from "./PhotoCapture";
import AudioCapture from "./AudioCapture";
import VideoCapture from "./VideoCapture";

interface EvidencePanelProps {
  position: [number, number]; // [lat, lng]
  onCapture: (record: EvidenceRecord) => void;
  onClose: () => void;
  existingRecords?: EvidenceRecord[];
}

type ViewMode = "list" | "grid";
type CaptureMode = "photo" | "audio" | "video" | null;

const EvidencePanel: React.FC<EvidencePanelProps> = ({
  position,
  onCapture,
  onClose,
  existingRecords = [],
}) => {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [records, setRecords] = useState<EvidenceRecord[]>(existingRecords);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<EvidenceType | "all">("all");

  // Handle capture
  const handlePhotoCapture = useCallback(
    (file: File, thumbnail?: string) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `照片_${new Date().toLocaleString()}`,
        evidence_type: "photo",
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  const handleAudioCapture = useCallback(
    (file: File, duration: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `录音_${new Date().toLocaleString()}`,
        evidence_type: "audio",
        position,
        file_url: URL.createObjectURL(file),
        duration,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  const handleVideoCapture = useCallback(
    (file: File, thumbnail?: string, duration?: number) => {
      const record: EvidenceRecord = {
        id: `evidence-${Date.now()}`,
        title: `录像_${new Date().toLocaleString()}`,
        evidence_type: "video",
        position,
        file_url: URL.createObjectURL(file),
        thumbnail_url: thumbnail,
        duration,
        file_size: file.size,
        recorded_by: "current-user",
        recorded_at: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      onCapture(record);
      setCaptureMode(null);
    },
    [position, onCapture],
  );

  // Filter records
  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === "all" || record.evidence_type === filterType;
    return matchesSearch && matchesType;
  });

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Render capture mode
  if (captureMode === "photo") {
    return (
      <Box sx={{ height: "100%" }}>
        <PhotoCapture
          onCapture={handlePhotoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  if (captureMode === "audio") {
    return (
      <Box sx={{ height: "100%" }}>
        <AudioCapture
          onCapture={handleAudioCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  if (captureMode === "video") {
    return (
      <Box sx={{ height: "100%" }}>
        <VideoCapture
          onCapture={handleVideoCapture}
          onCancel={() => setCaptureMode(null)}
        />
      </Box>
    );
  }

  // Main panel
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "white",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 16,
          py: 12,
          borderBottom: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <Typography
          sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}
        >
          取证记录
        </Typography>
        <IconButton
          onClick={onClose}
          sx={{ borderRadius: 4, "&:hover": { bgcolor: "#f3f4f6" } }}
        >
          <X size={20} style={{ color: "#6b7280" }} />
        </IconButton>
      </Box>

      {/* Capture Buttons */}
      <Box
        sx={{
          p: 16,
          borderBottom: 1,
          borderColor: "#e5e7eb",
          bgcolor: "#f9fafb",
        }}
      >
        <Typography sx={{ fontSize: "0.875rem", color: "#6b7280", mb: 12 }}>
          采集取证
        </Typography>
        <Box sx={{ display: "flex", gap: 12 }}>
          <Button
            onClick={() => setCaptureMode("photo")}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              p: 16,
              bgcolor: "white",
              border: 1,
              borderColor: "#e5e7eb",
              borderRadius: 8,
              "&:hover": { bgcolor: "#eff6ff", borderColor: "#93c5fd" },
              textTransform: "none",
            }}
          >
            <Box sx={{ p: 12, bgcolor: "#dbeafe", borderRadius: "9999px" }}>
              <Camera size={24} style={{ color: "#2563eb" }} />
            </Box>
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}
            >
              拍照
            </Typography>
          </Button>
          <Button
            onClick={() => setCaptureMode("audio")}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              p: 16,
              bgcolor: "white",
              border: 1,
              borderColor: "#e5e7eb",
              borderRadius: 8,
              "&:hover": { bgcolor: "#f0fdf4", borderColor: "#86efac" },
              textTransform: "none",
            }}
          >
            <Box sx={{ p: 12, bgcolor: "#dcfce7", borderRadius: "9999px" }}>
              <Mic size={24} style={{ color: "#16a34a" }} />
            </Box>
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}
            >
              录音
            </Typography>
          </Button>
          <Button
            onClick={() => setCaptureMode("video")}
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              p: 16,
              bgcolor: "white",
              border: 1,
              borderColor: "#e5e7eb",
              borderRadius: 8,
              "&:hover": { bgcolor: "#faf5ff", borderColor: "#c4b5fd" },
              textTransform: "none",
            }}
          >
            <Box sx={{ p: 12, bgcolor: "#f3e8ff", borderRadius: "9999px" }}>
              <Video size={24} style={{ color: "#9333ea" }} />
            </Box>
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}
            >
              录像
            </Typography>
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 16, borderBottom: 1, borderColor: "#e5e7eb" }}>
        <Box sx={{ position: "relative", mb: 12 }}>
          <Box
            sx={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#9ca3af",
            }}
          >
            <Search size={16} />
          </Box>
          <TextField
            placeholder="搜索取证记录..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": {
                pl: 36,
                fontSize: "0.875rem",
                "& fieldset": { borderColor: "#e5e7eb" },
                "&:hover fieldset": { borderColor: "#d1d5db" },
                "&.Mui-focused fieldset": { borderColor: "#3b82f6" },
              },
            }}
          />
        </Box>
        <Box sx={{ display: "flex", gap: 8 }}>
          {(["all", "photo", "audio", "video"] as const).map((type) => (
            <Chip
              key={type}
              label={
                type === "all"
                  ? "全部"
                  : type === "photo"
                    ? "照片"
                    : type === "audio"
                      ? "录音"
                      : "录像"
              }
              onClick={() => setFilterType(type)}
              sx={{
                fontSize: "0.875rem",
                bgcolor: filterType === type ? "#3b82f6" : "#f3f4f6",
                color: filterType === type ? "white" : "#4b5563",
                "&:hover": {
                  bgcolor: filterType === type ? "#3b82f6" : "#e5e7eb",
                },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* View Mode Toggle */}
      <Box
        sx={{
          px: 16,
          py: 8,
          borderBottom: 1,
          borderColor: "#e5e7eb",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 4,
            bgcolor: "#f3f4f6",
            borderRadius: 8,
            p: 4,
          }}
        >
          <IconButton
            onClick={() => setViewMode("grid")}
            sx={{
              borderRadius: 4,
              bgcolor: viewMode === "grid" ? "white" : "transparent",
              boxShadow: viewMode === "grid" ? 1 : 0,
              "&:hover": { bgcolor: viewMode === "grid" ? "white" : "#e5e7eb" },
            }}
          >
            <Grid size={16} style={{ color: "#4b5563" }} />
          </IconButton>
          <IconButton
            onClick={() => setViewMode("list")}
            sx={{
              borderRadius: 4,
              bgcolor: viewMode === "list" ? "white" : "transparent",
              boxShadow: viewMode === "list" ? 1 : 0,
              "&:hover": { bgcolor: viewMode === "list" ? "white" : "#e5e7eb" },
            }}
          >
            <List size={16} style={{ color: "#4b5563" }} />
          </IconButton>
        </Box>
      </Box>

      {/* Records List/Grid */}
      <Box sx={{ flex: 1, overflow: "auto", p: 16 }}>
        {filteredRecords.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#6b7280",
            }}
          >
            <Tag size={48} style={{ color: "#d1d5db", marginBottom: 12 }} />
            <Typography sx={{ fontSize: "0.875rem" }}>暂无取证记录</Typography>
          </Box>
        ) : viewMode === "grid" ? (
          <MuiGrid container spacing={12}>
            {filteredRecords.map((record) => (
              <MuiGrid key={record.id} size={6}>
                <Paper
                  sx={{
                    border: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 8,
                    overflow: "hidden",
                    cursor: "pointer",
                    "&:hover": { boxShadow: 2 },
                  }}
                >
                  {record.thumbnail_url ? (
                    <Box
                      component="img"
                      src={record.thumbnail_url}
                      alt={record.title}
                      sx={{ width: "100%", height: 96, objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: 96,
                        bgcolor: "#f3f4f6",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {record.evidence_type === "photo" && (
                        <Camera size={32} style={{ color: "#9ca3af" }} />
                      )}
                      {record.evidence_type === "audio" && (
                        <Mic size={32} style={{ color: "#9ca3af" }} />
                      )}
                      {record.evidence_type === "video" && (
                        <Video size={32} style={{ color: "#9ca3af" }} />
                      )}
                    </Box>
                  )}
                  <Box sx={{ p: 8 }}>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {record.title}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {record.evidence_type === "photo"
                        ? "照片"
                        : record.evidence_type === "audio"
                          ? "录音"
                          : "录像"}
                      {record.duration &&
                        ` · ${formatDuration(record.duration)}`}
                    </Typography>
                  </Box>
                </Paper>
              </MuiGrid>
            ))}
          </MuiGrid>
        ) : (
          <Stack spacing={8}>
            {filteredRecords.map((record) => (
              <Paper
                key={record.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  p: 12,
                  border: 1,
                  borderColor: "#e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#f9fafb" },
                }}
              >
                {record.thumbnail_url ? (
                  <Box
                    component="img"
                    src={record.thumbnail_url}
                    alt={record.title}
                    sx={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 4,
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: "#f3f4f6",
                      borderRadius: 4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {record.evidence_type === "photo" && (
                      <Camera size={20} style={{ color: "#9ca3af" }} />
                    )}
                    {record.evidence_type === "audio" && (
                      <Mic size={20} style={{ color: "#9ca3af" }} />
                    )}
                    {record.evidence_type === "video" && (
                      <Video size={20} style={{ color: "#9ca3af" }} />
                    )}
                  </Box>
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {record.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {new Date(record.recorded_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    textAlign: "right",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {formatFileSize(record.file_size)}
                  </Typography>
                  {record.duration && (
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {formatDuration(record.duration)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default EvidencePanel;
