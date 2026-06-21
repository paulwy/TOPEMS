import React, { useEffect, useState } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { integrationApi } from "@/api/integration";
import type { SyncStats, IntegrationEvent } from "@/api/integration";
import { logger } from "@/utils/logger";
import {
  DashboardTemplate,
  type StatCard,
  type RecentItem,
} from "@/components/templates";

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

      if (statsRes.success && statsRes.data !== undefined)
        setStats(statsRes.data);
      if (eventsRes.success && eventsRes.data !== undefined)
        setEvents(eventsRes.data);
    } catch (error) {
      logger.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 转换统计数据为 StatCard 格式
  const statCards: StatCard[] = stats
    ? [
        {
          id: "lims-qms-total",
          title: "LIMS ↔ QMS 总数",
          value: stats.lims_qms_total,
          color: "primary",
        },
        {
          id: "lims-qms-synced",
          title: "LIMS ↔ QMS 已同步",
          value: stats.lims_qms_synced,
          color: "success",
        },
        {
          id: "lims-qms-failed",
          title: "LIMS ↔ QMS 失败",
          value: stats.lims_qms_failed,
          color: "error",
        },
        {
          id: "mes-erp-total",
          title: "MES ↔ ERP 总数",
          value: stats.mes_erp_total,
          color: "primary",
        },
        {
          id: "mes-erp-synced",
          title: "MES ↔ ERP 已同步",
          value: stats.mes_erp_synced,
          color: "success",
        },
        {
          id: "mes-erp-failed",
          title: "MES ↔ ERP 失败",
          value: stats.mes_erp_failed,
          color: "error",
        },
        {
          id: "wms-scm-total",
          title: "WMS ↔ SCM 总数",
          value: stats.wms_scm_total,
          color: "primary",
        },
        {
          id: "wms-scm-synced",
          title: "WMS ↔ SCM 已同步",
          value: stats.wms_scm_synced,
          color: "success",
        },
        {
          id: "wms-scm-failed",
          title: "WMS ↔ SCM 失败",
          value: stats.wms_scm_failed,
          color: "error",
        },
      ]
    : [];

  // 转换事件数据为 RecentItem 格式
  const recentItems: RecentItem[] = events.slice(0, 10).map((event) => ({
    id: event.id,
    title: `${event.source_system} → ${event.target_system}`,
    description: event.event_type,
    time: new Date(event.created_at).toLocaleString("zh-CN"),
    status:
      event.status === "synced"
        ? "success"
        : event.status === "pending"
          ? "warning"
          : event.status === "failed"
            ? "error"
            : "default",
  }));

  return (
    <DashboardTemplate
      title="集成管理仪表板"
      stats={statCards}
      recentItems={recentItems}
      recentTitle="最近事件"
      loading={loading}
      onRefresh={loadData}
      layout={{
        statsBreakpoints: { xs: 12, sm: 6, md: 4, lg: 3 },
      }}
    />
  );
};

export default IntegrationDashboardPage;
