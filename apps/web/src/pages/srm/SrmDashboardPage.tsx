import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";
import {
  Users,
  Award,
  ClipboardList,
  DollarSign,
  ScrollText,
  Building2,
} from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { StatsChart } from "@/components/StatsChart";
import { srmApi } from "@/api/srm";
import type { SrmDetailedStatistics } from "@/api/srm";

const SrmDashboardPage: React.FC = () => {
  const [statistics, setStatistics] = useState<SrmDetailedStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await srmApi.getDetailedStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (err) {
      console.error("加载统计数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const mapStatusToChinese = (status: string) => {
    const statusMap: Record<string, string> = {
      active: "启用",
      inactive: "禁用",
      pending: "待处理",
      completed: "已完成",
      delivered: "已交付",
      cancelled: "已取消",
      processing: "处理中",
      draft: "草稿",
      expired: "已过期",
    };
    return statusMap[status] || status;
  };

  if (loading || !statistics) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #faf5ff 0%, #f8fafc 100%)",
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: "#a855f7",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              mx: "auto",
              mb: 2,
            }}
          />
          <Typography sx={{ color: "slate.600" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #faf5ff 0%, #f8fafc 100%)",
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: "background.paper",
          boxShadow: 1,
          borderBottom: 1,
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: 64,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background:
                    "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users sx={{ width: 24, height: 24, color: "white" }} />
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "slate.900",
                    fontSize: "1.25rem",
                  }}
                >
                  供应商关系管理
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: "slate.500", fontSize: "0.75rem" }}
                >
                  Supplier Relationship Management
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        component="main"
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, md: 2, lg: 3, xl: 6 },
            gap: 2,
            mb: 4,
          }}
        >
          <MetricCard
            title="供应商总数"
            value={statistics.basic.total_suppliers}
            icon={<Users sx={{ width: 24, height: 24 }} />}
            gradient={["#6366F1", "#8B5CF6"]}
            subtitle={`${statistics.basic.active_suppliers} 个启用中`}
            trend="neutral"
          />
          <MetricCard
            title="平均评分"
            value={statistics.basic.avg_score.toFixed(1)}
            icon={<Award sx={{ width: 24, height: 24 }} />}
            gradient={["#F59E0B", "#D97706"]}
            subtitle={`${statistics.basic.total_evaluations} 次评估`}
            trend="neutral"
          />
          <MetricCard
            title="采购订单"
            value={statistics.basic.total_orders}
            icon={<ClipboardList sx={{ width: 24, height: 24 }} />}
            gradient={["#10B981", "#059669"]}
            subtitle={`${statistics.basic.pending_orders} 个待处理`}
            trend="neutral"
          />
          <MetricCard
            title="订单总额"
            value={`¥${statistics.basic.total_order_amount.toLocaleString()}`}
            icon={<DollarSign sx={{ width: 24, height: 24 }} />}
            gradient={["#14B8A6", "#0D9488"]}
            subtitle={`${statistics.basic.completed_orders} 个已完成`}
            trend="neutral"
          />
          <MetricCard
            title="合同总数"
            value={statistics.basic.total_contracts}
            icon={<ScrollText sx={{ width: 24, height: 24 }} />}
            gradient={["#EC4899", "#DB2777"]}
            subtitle={`${statistics.basic.active_contracts} 个有效`}
            trend="neutral"
          />
          <MetricCard
            title="供应商分类"
            value={statistics.supplier_by_category.length}
            icon={<Building2 sx={{ width: 24, height: 24 }} />}
            gradient={["#8B5CF6", "#7C3AED"]}
            subtitle="类别数量"
            trend="neutral"
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: 2 },
            gap: 4,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <StatsChart
                title="供应商状态分布"
                type="pie"
                data={statistics.supplier_by_status.map((s) => ({
                  name: mapStatusToChinese(s.status),
                  value: s.count,
                  color: s.status === "active" ? "#10B981" : "#6B7280",
                }))}
                yKey="value"
                xKey="name"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <StatsChart
                title="订单状态分布"
                type="pie"
                data={statistics.order_by_status.map((s) => ({
                  name: mapStatusToChinese(s.status),
                  value: s.count,
                }))}
                yKey="value"
                xKey="name"
              />
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: 1, lg: 2 },
            gap: 4,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <StatsChart
                title="评估分数分布"
                type="bar"
                data={statistics.evaluation_score_distribution.map((s) => ({
                  name: s.range,
                  value: s.count,
                }))}
                yKey="value"
                xKey="name"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <StatsChart
                title="月度订单趋势"
                type="line"
                data={statistics.monthly_order_trend.map((t) => ({
                  name: t.month,
                  value: t.order_count,
                  amount: t.total_amount,
                }))}
                yKey="value"
                xKey="name"
              />
            </CardContent>
          </Card>
        </Box>

        {statistics.contract_by_status.length > 0 && (
          <Card>
            <CardContent>
              <StatsChart
                title="合同状态分布"
                type="pie"
                data={statistics.contract_by_status.map((s) => ({
                  name: mapStatusToChinese(s.status),
                  value: s.count,
                }))}
                yKey="value"
                xKey="name"
              />
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default SrmDashboardPage;