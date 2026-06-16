import React, { useState, useEffect } from "react";
import {
  BarChart3,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Bell,
  CheckCircle,
  Archive,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { NotificationStats } from "../api/notification";
import {
  getMyNotificationStats,
  notificationServiceApi,
} from "../api/notification";
import { MetricCard } from "../components/MetricCard";
import { StatsChart } from "../components/StatsChart";
import { NotificationContainer } from "../components/NotificationContainer";
import { useNotification } from "../hooks/useNotification";

const NotificationStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceStatus, setServiceStatus] = useState<{
    status: string;
    uptime: string;
    dependencies: Array<{ name: string; status: string }>;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, healthRes] = await Promise.all([
        getMyNotificationStats(),
        notificationServiceApi.health(),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        const deps = healthRes.data.dependencies;
        const dependencies =
          typeof deps === "object" && !Array.isArray(deps)
            ? [
                { name: "database", status: deps.database },
                { name: "redis", status: deps.redis },
              ]
            : deps || [];
        setServiceStatus({
          status: healthRes.data.status,
          uptime: healthRes.data.uptime,
          dependencies,
        });
      }
    } catch (err) {
      console.error("Error loading stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const getTypeStats = () => {
    if (!stats) return [];
    const byType = stats.notifications_by_type;
    return [
      { name: "系统通知", value: byType?.system || 0, color: "#3B82F6" },
      { name: "审批通知", value: byType?.workflow || 0, color: "#8B5CF6" },
      { name: "提醒通知", value: byType?.reminder || 0, color: "#F59E0B" },
      { name: "告警通知", value: byType?.alert || 0, color: "#EF4444" },
      { name: "消息通知", value: byType?.message || 0, color: "#10B981" },
    ];
  };

  const getDailyStats = () => {
    if (!stats) return [];
    const byDay = stats.notifications_by_day;
    if (!byDay || typeof byDay !== "object") return [];

    return Object.entries(byDay)
      .map(([date, count]) => ({
        date,
        count: typeof count === "number" ? count : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <Loader2 sx={{ width: 48, height: 48, color: "#2563eb", margin: "0 auto", animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: 8, color: "#6b7280" }}>加载中...</p>
      </div>
    </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <div style={{ backgroundColor: "#ffffff", boxShadow: "sm", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                onClick={() => navigate("/notifications")}
                style={{ padding: 8, borderRadius: 8, transition: "all 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <ChevronLeft sx={{ width: 20, height: 20, color: "#4b5563" }} />
              </button>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", display: "flex", alignItems: "center" }}>
                  <BarChart3 sx={{ width: 28, height: 28, marginRight: 12, color: "#2563eb" }} />
                  通知统计
                </h1>
                <p style={{ marginTop: 4, fontSize: "0.875rem", color: "#6b7280" }}>
                  查看通知数据的统计分析
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={loadData}
                style={{ display: "flex", alignItems: "center", padding: "8px 16px", color: "#374151", backgroundColor: "#f3f4f6", borderRadius: 8, transition: "all 0.2s" }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#e5e7eb"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
              >
                <RefreshCw sx={{ width: 20, height: 20, marginRight: 8 }} />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
        {/* Service Status */}
        {serviceStatus && (
          <div style={{ backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "sm", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    marginRight: 12,
                    backgroundColor: serviceStatus.status === "healthy" ? "#22c55e" : "#ef4444"
                  }}
                />
                <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "#111827" }}>
                  通知服务状态：
                  {serviceStatus.status === "healthy" ? "健康" : "异常"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: "0.875rem", color: "#6b7280" }}>
                <span>运行时长：{serviceStatus.uptime}</span>
                {serviceStatus.dependencies.map((dep, idx) => (
                  <span key={idx}>
                    {dep.name}：{dep.status === "healthy" ? "正常" : "异常"}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Summary Metrics */}
        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            <MetricCard
              title="总通知数"
              value={stats.total_notifications}
              icon={<Bell sx={{ width: 24, height: 24 }} />}
              color="blue"
            />
            <MetricCard
              title="未读通知"
              value={stats.unread_notifications}
              icon={<Bell sx={{ width: 24, height: 24 }} />}
              color="red"
            />
            <MetricCard
              title="已读通知"
              value={stats.read_notifications}
              icon={<CheckCircle sx={{ width: 24, height: 24 }} />}
              color="green"
            />
            <MetricCard
              title="归档通知"
              value={stats.archived_notifications}
              icon={<Archive sx={{ width: 24, height: 24 }} />}
              color="orange"
            />
          </div>
        )}

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* Notification by Type */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "sm", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <TrendingUp sx={{ width: 20, height: 20, color: "#2563eb", marginRight: 8 }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}>
                通知类型分布
              </h3>
            </div>
            <div style={{ height: 256 }}>
              <StatsChart
                type="bar"
                title="通知类型分布"
                data={getTypeStats()}
                xKey="name"
                yKey="value"
                colors={getTypeStats().map((d) => d.color)}
              />
            </div>
          </div>

          {/* Daily Trend */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "sm", padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
              <Calendar sx={{ width: 20, height: 20, color: "#2563eb", marginRight: 8 }} />
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#111827" }}>近7天趋势</h3>
            </div>
            <div style={{ height: 256 }}>
              <StatsChart
                type="line"
                title="近7天趋势"
                data={getDailyStats()}
                xKey="date"
                yKey="count"
                colors={["#3B82F6"]}
              />
            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: 8, boxShadow: "sm", padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 16 }}>详细数据</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: "100%", borderCollapse: "collapse" }}>
              <thead style={{ backgroundColor: "#f9fafb" }}>
                <tr>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    指标
                  </th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    数量
                  </th>
                  <th style={{ padding: "12px 24px", textAlign: "left", fontSize: 12, fontWeight: 500, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    占比
                  </th>
                </tr>
              </thead>
              <tbody style={{ backgroundColor: "#ffffff" }}>
                <tr>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#111827" }}>
                    系统通知
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats?.notifications_by_type?.system || 0}
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats && stats.total_notifications > 0
                      ? (
                          ((stats.notifications_by_type?.system || 0) /
                            stats.total_notifications) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#111827" }}>
                    审批通知
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats?.notifications_by_type?.workflow || 0}
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats && stats.total_notifications > 0
                      ? (
                          ((stats.notifications_by_type?.workflow || 0) /
                            stats.total_notifications) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#111827" }}>
                    提醒通知
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats?.notifications_by_type?.reminder || 0}
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats && stats.total_notifications > 0
                      ? (
                          ((stats.notifications_by_type?.reminder || 0) /
                            stats.total_notifications) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#111827" }}>
                    告警通知
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats?.notifications_by_type?.alert || 0}
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats && stats.total_notifications > 0
                      ? (
                          ((stats.notifications_by_type?.alert || 0) /
                            stats.total_notifications) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#111827" }}>
                    消息通知
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats?.notifications_by_type?.message || 0}
                  </td>
                  <td style={{ padding: "16px 24px", whiteSpace: "nowrap", fontSize: 14, color: "#374151" }}>
                    {stats && stats.total_notifications > 0
                      ? (
                          ((stats.notifications_by_type?.message || 0) /
                            stats.total_notifications) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280", textAlign: "right" }}>
            数据更新时间：
            {stats?.generated_at
              ? new Date(stats.generated_at).toLocaleString("zh-CN")
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationStatsPage;
