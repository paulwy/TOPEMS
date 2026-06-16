import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { integrationApi } from "../api/integration";
import type { SyncStats, IntegrationEvent } from "../api/integration";

const IntegrationDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes] = await Promise.all([
        integrationApi.getSyncStats(),
        integrationApi.listEvents(),
      ]);

      if (statsRes.success && statsRes.data !== undefined) setStats(statsRes.data);
      if (eventsRes.success && eventsRes.data !== undefined) setEvents(eventsRes.data);
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
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>📊 集成管理仪表板</Typography>
          <Button
            onClick={loadData}
            sx={{ px: 2, py: 1, backgroundColor: "#2563eb", color: "#ffffff", borderRadius: 2, "&:hover": { backgroundColor: "#1d4ed8" } }}
          >
            刷新数据
          </Button>
        </Box>

        {stats && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3, mb: 3 }}>
            <Box sx={{ backgroundColor: "#ffffff", p: 3, borderRadius: 2, boxShadow: 1 }}>
              <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", mb: 2 }}>
                🔬 LIMS ↔ QMS
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>总数</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#2563eb" }}>{stats.lims_qms_total}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>已同步</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>{stats.lims_qms_synced}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>失败</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#dc2626" }}>{stats.lims_qms_failed}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ backgroundColor: "#ffffff", p: 3, borderRadius: 2, boxShadow: 1 }}>
              <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", mb: 2 }}>
                🏭 MES ↔ ERP
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>总数</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#2563eb" }}>{stats.mes_erp_total}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>已同步</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>{stats.mes_erp_synced}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>失败</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#dc2626" }}>{stats.mes_erp_failed}</Typography>
                </Box>
              </Box>
            </Box>

            <Box sx={{ backgroundColor: "#ffffff", p: 3, borderRadius: 2, boxShadow: 1 }}>
              <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", mb: 2 }}>
                📦 WMS ↔ SCM
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>总数</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#2563eb" }}>{stats.wms_scm_total}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>已同步</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#16a34a" }}>{stats.wms_scm_synced}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ color: "#4b5563" }}>失败</Typography>
                  <Typography sx={{ fontWeight: 700, color: "#dc2626" }}>{stats.wms_scm_failed}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        <Box sx={{ backgroundColor: "#ffffff", p: 3, borderRadius: 2, boxShadow: 1 }}>
          <Typography sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827", mb: 2 }}>
            📋 最近事件
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>源系统</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>目标系统</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>事件类型</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>状态</th>
                  <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 500, color: "#374151" }}>时间</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 10).map((event) => (
                  <tr key={event.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px 16px" }}>{event.source_system}</td>
                    <td style={{ padding: "12px 16px" }}>{event.target_system}</td>
                    <td style={{ padding: "12px 16px" }}>{event.event_type}</td>
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

export default IntegrationDashboardPage;
