import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { integrationApi } from "../api/integration";
import type { IntegrationEvent } from "../api/integration";

const IntegrationEventsPage: React.FC = () => {
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await integrationApi.listEvents();
      if (res.success && res.data !== undefined) setEvents(res.data);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "synced":
        return { backgroundColor: "#dcfce7", color: "#166534" };
      case "pending":
        return { backgroundColor: "#fef9c3", color: "#854d0e" };
      case "failed":
        return { backgroundColor: "#fee2e2", color: "#991b1b" };
      default:
        return { backgroundColor: "#f3f4f6", color: "#1f2937" };
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <Typography sx={{ color: "#4b5563" }}>加载中...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>📋 集成事件日志</Typography>
          <Button
            onClick={loadData}
            sx={{ px: 2, py: 1, backgroundColor: "#2563eb", color: "#ffffff", borderRadius: 2, "&:hover": { backgroundColor: "#1d4ed8" } }}
          >
            刷新数据
          </Button>
        </Box>

        <Box sx={{ backgroundColor: "#ffffff", p: 3, borderRadius: 2, boxShadow: 1 }}>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>源系统</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>目标系统</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>事件类型</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>源记录 ID</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>状态</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 16px" }}>{event.source_system}</td>
                    <td style={{ padding: "12px 16px" }}>{event.target_system}</td>
                    <td style={{ padding: "12px 16px" }}>{event.event_type}</td>
                    <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#6b7280" }}>
                      {event.source_record_id
                        ? event.source_record_id.slice(0, 8) + "..."
                        : "-"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "0.875rem", ...getStatusColor(event.status) }}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#6b7280" }}>
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default IntegrationEventsPage;
