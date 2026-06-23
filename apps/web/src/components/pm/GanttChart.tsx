import React, { useEffect, useRef, useState } from "react";
import { Box, Typography, Paper, IconButton } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { ChevronRight, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";
import type { GanttPhase, GanttMilestone } from "@/api/pm";

interface GanttChartProps {
  phases: GanttPhase[];
  milestones: GanttMilestone[];
  projectStartDate?: string;
  projectEndDate?: string;
}

const GanttChart: React.FC<GanttChartProps> = ({
  phases,
  milestones,
  projectStartDate,
  projectEndDate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [zoom, setZoom] = useState(100);

  const minDate = projectStartDate
    ? new Date(projectStartDate)
    : phases.length > 0
      ? new Date(
          Math.min(
            ...phases.map((p) =>
              new Date(p.start_date || Date.now()).getTime(),
            ),
          ),
        )
      : new Date();

  const maxDate = projectEndDate
    ? new Date(projectEndDate)
    : phases.length > 0
      ? new Date(
          Math.max(
            ...phases.map((p) => new Date(p.end_date || Date.now()).getTime()),
          ),
        )
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const totalDays = Math.ceil(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const daysToShow = Math.max(totalDays, 30);

  const getDayOffset = (dateStr?: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return Math.ceil(
      (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  };

  const getBarWidth = (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(duration, 1);
  };

  const getMonthLabels = () => {
    const labels = [];
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      labels.push({
        date: new Date(currentDate),
        offset: getDayOffset(currentDate.toISOString().split("T")[0]),
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return labels;
  };

  const getDayLabels = () => {
    const labels = [];
    for (let i = 0; i <= daysToShow; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 0) {
        labels.push({ day: date.getDate(), offset: i });
      }
    }
    return labels;
  };

  const scroll = (direction: "left" | "right") => {
    const scrollAmount = 200;
    setScrollLeft((prev) => {
      const maxScroll = Math.max(
        0,
        daysToShow * 20 - (containerRef.current?.clientWidth || 0),
      );
      if (direction === "left") {
        return Math.max(0, prev - scrollAmount);
      }
      return Math.min(maxScroll, prev + scrollAmount);
    });
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(150, Math.max(50, prev + delta)));
  };

  const monthLabels = getMonthLabels();
  const dayLabels = getDayLabels();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft]);

  return (
    <Paper
      sx={{
        backgroundColor: "white",
        borderRadius: 2,
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 4,
          py: 3,
          backgroundColor: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => scroll("left")}
            sx={{
              p: 1.5,
              borderRadius: 1,
              "&:hover": { backgroundColor: "#e5e7eb" },
            }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
          </IconButton>
          <IconButton
            onClick={() => scroll("right")}
            sx={{
              p: 1.5,
              borderRadius: 1,
              "&:hover": { backgroundColor: "#e5e7eb" },
            }}
          >
            <ChevronRight style={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => handleZoom(-10)}
            sx={{
              p: 1.5,
              borderRadius: 1,
              "&:hover": { backgroundColor: "#e5e7eb" },
            }}
            title="缩小"
          >
            <ZoomOut style={{ width: 16, height: 16 }} />
          </IconButton>
          <Typography sx={{ fontSize: "0.875rem", color: "#4b5563" }}>
            {zoom}%
          </Typography>
          <IconButton
            onClick={() => handleZoom(10)}
            sx={{
              p: 1.5,
              borderRadius: 1,
              "&:hover": { backgroundColor: "#e5e7eb" },
            }}
            title="放大"
          >
            <ZoomIn style={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: "flex" }}>
        <Box
          sx={{ width: 192, flexShrink: 0, borderRight: "1px solid #e5e7eb" }}
        >
          <Box
            sx={{
              height: 64,
              px: 3,
              py: 2,
              backgroundColor: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography
              sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#4b5563" }}
            >
              任务
            </Typography>
          </Box>
          <Box sx={{ maxHeight: 384, overflowY: "auto" }}>
            {phases.map((phase) => (
              <Box
                key={phase.id}
                sx={{
                  height: 48,
                  px: 3,
                  py: 2,
                  borderBottom: "1px solid #f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  "&:hover": { backgroundColor: "#f9fafb" },
                }}
              >
                <Box sx={{ overflow: "hidden" }}>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      color: "#111827",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {phase.name}
                  </Typography>
                  {phase.progress > 0 && (
                    <Typography sx={{ fontSize: "0.75rem", color: "#6b7280" }}>
                      {phase.progress}% 完成
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          ref={containerRef}
          sx={{
            flex: 1,
            overflowX: "auto",
          }}
          onScroll={(e) =>
            setScrollLeft((e.target as HTMLDivElement).scrollLeft)
          }
        >
          <Box
            sx={{
              minWidth: "max-content",
              width: `${daysToShow * (zoom / 100) * 20}px`,
            }}
          >
            <Box sx={{ height: 64, borderBottom: "1px solid #e5e7eb" }}>
              <Box sx={{ display: "flex" }}>
                {monthLabels.map((label, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: "absolute",
                      backgroundColor: "#f9fafb",
                      px: 2,
                      py: 1,
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "#4b5563",
                      left: `${48 + label.offset * (zoom / 100) * 20}px`,
                      top: 0,
                    }}
                  >
                    {label.date.getFullYear()}年{label.date.getMonth() + 1}月
                  </Box>
                ))}
              </Box>
              <Box
                sx={{ display: "flex", pt: 6, borderTop: "1px solid #e5e7eb" }}
              >
                {dayLabels.map((label, index) => (
                  <Box
                    key={index}
                    sx={{
                      flexShrink: 0,
                      textAlign: "center",
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                      width: `${(zoom / 100) * 140}px`,
                    }}
                  >
                    {label.day}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ borderTop: "1px solid #f3f4f6" }}>
              {phases.map((phase) => (
                <Box
                  key={phase.id}
                  sx={{
                    height: 48,
                    borderBottom: "1px solid #f3f4f6",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      borderRadius: 2,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      px: 2,
                      cursor: "pointer",
                      transition: "all",
                      "&:hover": { boxShadow: 3 },
                      left: `${48 + getDayOffset(phase.start_date) * (zoom / 100) * 20}px`,
                      width: `${getBarWidth(phase.start_date, phase.end_date) * (zoom / 100) * 20 - 4}px`,
                      backgroundColor:
                        phase.status === "completed"
                          ? "#10B981"
                          : phase.status === "active"
                            ? "#3B82F6"
                            : "#9CA3AF",
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "white",
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        px: 1,
                      }}
                    >
                      {phase.name}
                    </Typography>
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        height: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.3)",
                        borderRadius: "0 0 4px 4px",
                        width: `${phase.progress}%`,
                      }}
                    />
                  </Box>

                  {milestones
                    .filter((m) => m.project_id === phase.project_id)
                    .map((milestone) => (
                      <Box
                        key={milestone.id}
                        sx={{
                          position: "absolute",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          border: "2px solid #facc15",
                          backgroundColor: "#fef3c7",
                          left: `${48 + getDayOffset(milestone.date) * (zoom / 100) * 20 - 6}px`,
                        }}
                        title={milestone.name}
                      />
                    ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          px: 4,
          py: 3,
          backgroundColor: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              backgroundColor: "#3b82f6",
            }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "#4b5563" }}>
            进行中
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              backgroundColor: "#22c55e",
            }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "#4b5563" }}>
            已完成
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              border: "2px solid #facc15",
              backgroundColor: "#fef3c7",
            }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "#4b5563" }}>
            里程碑
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 1,
              backgroundColor: "#9ca3af",
            }}
          />
          <Typography sx={{ fontSize: "0.75rem", color: "#4b5563" }}>
            未开始
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default GanttChart;
