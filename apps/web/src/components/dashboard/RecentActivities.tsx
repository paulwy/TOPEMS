import React from "react";
import { Box, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";

export interface ActivityItem {
  id: string;
  title: string;
  type: string;
  time: string;
  icon: React.ReactNode;
}

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

const typeColors: Record<
  string,
  { bg: string; text: string; bar: string; iconBg: string }
> = {
  系统: { bg: "#eff6ff", text: "#2563eb", bar: "#3b82f6", iconBg: "#dbeafe" },
  文档: { bg: "#faf5ff", text: "#7c3aed", bar: "#8b5cf6", iconBg: "#ede9fe" },
  工作流: { bg: "#f0fdf4", text: "#16a34a", bar: "#22c55e", iconBg: "#dcfce7" },
  培训: { bg: "#fefce8", text: "#ca8a04", bar: "#eab308", iconBg: "#fef9c3" },
  默认: { bg: "#f8fafc", text: "#64748b", bar: "#94a3b8", iconBg: "#f1f5f9" },
};

export const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities,
}) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {activities.map((activity, index) => {
        const colors = typeColors[activity.type] || typeColors["默认"];
        const progressWidth = `${((activities.length - index) / activities.length) * 100}%`;

        return (
          <Box
            key={activity.id}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              padding: 2,
              borderRadius: 2,
              "&:hover": { backgroundColor: "#f8fafc" },
              transition: "backgroundColor 0.2s ease",
              cursor: "pointer",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginRight: 2,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  backgroundColor: colors.iconBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              >
                {activity.icon}
              </Box>
              {index < activities.length - 1 && (
                <Box
                  sx={{
                    position: "relative",
                    width: 4,
                    height: 32,
                    backgroundColor: "#e2e8f0",
                    borderRadius: 2,
                    marginTop: 1,
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      backgroundColor: colors.bar,
                      borderRadius: 2,
                      transition: "height 0.7s ease",
                    }}
                    style={{ height: progressWidth }}
                  />
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#1e293b",
                  marginBottom: 0.5,
                }}
              >
                {activity.title}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  sx={{
                    paddingX: 1.5,
                    paddingY: 0.5,
                    borderRadius: 1,
                    backgroundColor: colors.bg,
                  }}
                >
                  <Typography
                    sx={{ fontSize: 11, fontWeight: 500, color: colors.text }}
                  >
                    {activity.type}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                  {activity.time}
                </Typography>
              </Box>
            </Box>
            <ChevronRight
              sx={{ width: 16, height: 16, color: "#cbd5e1", marginLeft: 1 }}
            />
          </Box>
        );
      })}
    </Box>
  );
};
