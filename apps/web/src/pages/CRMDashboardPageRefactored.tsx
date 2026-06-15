/**
 * CRMDashboardPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 主题色使用蓝色 (#3b82f6)
 */

import React, { useState, useEffect } from "react";
import { Card as MuiCard, CardContent, CardHeader, Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  ComposedChart,
} from "recharts";
import { PageHeader } from "@/components/layout";

const CRMDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalOpportunities: 0,
    totalOpportunityValue: 0,
    closedWonValue: 0,
    totalContacts: 0,
    totalInteractions: 0,
    winRate: 0,
  });
  const [salesTrend, setSalesTrend] = useState<
    { month: string; revenue: number; opportunities: number }[]
  >([]);
  const [funnelData, setFunnelData] = useState<
    { stage: string; count: number; value: number; color: string }[]
  >([]);
  const [industryDistribution, setIndustryDistribution] = useState<
    { name: string; value: number; percentage: number }[]
  >([]);
  const [recentActivities, setRecentActivities] = useState<
    { type: string; title: string; time: string; customer?: string }[]
  >([]);

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const [customerRes, opportunityRes, interactionRes] = await Promise.all([
        crmApi.customers.list({ page: 1, pageSize: 1000 }),
        crmApi.opportunities.list({ page: 1, pageSize: 1000 }),
        crmApi.interactions.list({ page: 1, pageSize: 20 }),
      ]);

      const customers = customerRes.data?.items || [];
      const opportunities = opportunityRes.data?.items || [];
      const interactions = interactionRes.data?.items || [];

      const totalCustomers = customers.length;
      const activeCustomers = customers.filter(
        (c) => c.status === "active",
      ).length;
      const totalOpportunities = opportunities.length;
      const totalOpportunityValue = opportunities.reduce(
        (sum, o) => sum + (o.value || 0),
        0,
      );
      const closedWon = opportunities.filter((o) => o.stage === "closed_won");
      const closedWonValue = closedWon.reduce(
        (sum, o) => sum + (o.value || 0),
        0,
      );
      const winRate =
        totalOpportunities > 0
          ? Math.round((closedWon.length / totalOpportunities) * 100)
          : 0;

      setStats({
        totalCustomers,
        activeCustomers,
        totalOpportunities,
        totalOpportunityValue,
        closedWonValue,
        totalContacts: Math.floor(totalCustomers * 2.5),
        totalInteractions: interactions.length,
        winRate,
      });

      const months = [
        "1月",
        "2月",
        "3月",
        "4月",
        "5月",
        "6月",
        "7月",
        "8月",
        "9月",
        "10月",
        "11月",
        "12月",
      ];
      const currentMonth = new Date().getMonth();
      const trendData: {
        month: string;
        revenue: number;
        opportunities: number;
      }[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthName = months[monthIndex];
        const monthOpportunities = opportunities.filter((o) => {
          const createdMonth = new Date(o.created_at).getMonth();
          return createdMonth === monthIndex;
        });
        trendData.push({
          month: monthName,
          revenue: monthOpportunities.reduce(
            (sum, o) => sum + (o.value || 0),
            0,
          ),
          opportunities: monthOpportunities.length,
        });
      }
      setSalesTrend(trendData);

      const stageOrder = [
        "prospecting",
        "qualification",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ];
      const stageLabels: Record<string, string> = {
        prospecting: "线索",
        qualification: "资格认证",
        proposal: "方案提交",
        negotiation: "谈判中",
        closed_won: "已成交",
        closed_lost: "已失败",
      };
      const stageColors = [
        "#3b82f6",
        "#8b5cf6",
        "#f59e0b",
        "#f97316",
        "#10b981",
        "#ef4444",
      ];

      const funnel = stageOrder.map((stage, index) => {
        const stageOpportunities = opportunities.filter(
          (o) => o.stage === stage,
        );
        return {
          stage: stageLabels[stage],
          count: stageOpportunities.length,
          value: stageOpportunities.reduce((sum, o) => sum + (o.value || 0), 0),
          color: stageColors[index],
        };
      });
      setFunnelData(funnel);

      const industryMap = new Map<string, number>();
      customers.forEach((c) => {
        const industry = c.industry || "未分类";
        industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
      });
      const sortedIndustries = Array.from(industryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const total = sortedIndustries.reduce((sum, [, count]) => sum + count, 0);
      setIndustryDistribution(
        sortedIndustries.map(([name, value]) => ({
          name,
          value,
          percentage: Math.round((value / total) * 100),
        })),
      );

      setRecentActivities(
        interactions.slice(0, 5).map((i) => ({
          type:
            i.type === "call"
              ? "电话"
              : i.type === "email"
                ? "邮件"
                : i.type === "meeting"
                  ? "会议"
                  : "备注",
          title: i.subject || "无主题",
          time: new Date(i.created_at).toLocaleDateString("zh-CN"),
          customer: customers.find((c) => c.id === i.customer_id)?.name,
        })),
      );
    } catch (error) {
      console.error("加载仪表板数据失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载仪表板数据",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

  return (
    <>
      <PageHeader
        title="CRM 仪表板"
        subtitle="客户关系管理数据概览"
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <MuiCard>
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 2, md: 4 },
                gap: 2,
                mb: 4,
              }}
            >
              <Box
                sx={{
                  background:
                    "linear-gradient(to bottom right, #3b82f6, #2563eb)",
                  borderRadius: 2,
                  p: 2,
                  color: "white",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#dbeafe", fontSize: "0.875rem" }}>
                      客户总数
                    </Typography>
                    <Typography
                      sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.totalCustomers}
                    </Typography>
                    <Typography
                      sx={{ color: "#bfdbfe", fontSize: "0.875rem", mt: 0.5 }}
                    >
                      活跃: {stats.activeCustomers} (
                      {Math.round(
                        (stats.activeCustomers / stats.totalCustomers) * 100,
                      )}
                      %)
                    </Typography>
                  </Box>
                  <Users sx={{ width: 40, height: 40, color: "#bfdbfe" }} />
                </Box>
              </Box>

              <Box
                sx={{
                  background:
                    "linear-gradient(to bottom right, #8b5cf6, #7c3aed)",
                  borderRadius: 2,
                  p: 2,
                  color: "white",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#e9d5ff", fontSize: "0.875rem" }}>
                      联系人
                    </Typography>
                    <Typography
                      sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.totalContacts}
                    </Typography>
                    <Typography
                      sx={{ color: "#c4b5fd", fontSize: "0.875rem", mt: 0.5 }}
                    >
                      预计估算
                    </Typography>
                  </Box>
                  <Target sx={{ width: 40, height: 40, color: "#c4b5fd" }} />
                </Box>
              </Box>

              <Box
                sx={{
                  background:
                    "linear-gradient(to bottom right, #f59e0b, #d97706)",
                  borderRadius: 2,
                  p: 2,
                  color: "white",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#fef3c7", fontSize: "0.875rem" }}>
                      商机总额
                    </Typography>
                    <Typography
                      sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 0.5 }}
                    >
                      ¥{stats.totalOpportunityValue.toLocaleString()}
                    </Typography>
                    <Typography
                      sx={{ color: "#fcd34d", fontSize: "0.875rem", mt: 0.5 }}
                    >
                      共 {stats.totalOpportunities} 个商机
                    </Typography>
                  </Box>
                  <DollarSign sx={{ width: 40, height: 40, color: "#fcd34d" }} />
                </Box>
              </Box>

              <Box
                sx={{
                  background:
                    "linear-gradient(to bottom right, #10b981, #059669)",
                  borderRadius: 2,
                  p: 2,
                  color: "white",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography sx={{ color: "#d1fae5", fontSize: "0.875rem" }}>
                      成交率
                    </Typography>
                    <Typography
                      sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 0.5 }}
                    >
                      {stats.winRate}%
                    </Typography>
                    <Typography
                      sx={{ color: "#a7f3d0", fontSize: "0.875rem", mt: 0.5 }}
                    >
                      已成交 ¥{stats.closedWonValue.toLocaleString()}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ width: 40, height: 40, color: "#a7f3d0" }} />
                </Box>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, lg: 3 },
                gap: 3,
              }}
            >
              <Box sx={{ gridColumn: { lg: "span 2" } }}>
                <MuiCard>
                  <CardHeader>
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <BarChart3 sx={{ width: 20, height: 20 }} />
                      销售趋势
                    </Typography>
                  </CardHeader>
                  <CardContent>
                    <Box sx={{ height: 320 }}>
                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                        minWidth={0}
                        minHeight={0}
                      >
                        <ComposedChart data={salesTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis yAxisId="left" orientation="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Bar
                            yAxisId="left"
                            dataKey="opportunities"
                            fill="#3b82f6"
                            name="商机数量"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="revenue"
                            stroke="#10b981"
                            name="金额(元)"
                            strokeWidth={2}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </MuiCard>
              </Box>

              <MuiCard>
                <CardHeader>
                  <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <PieChart sx={{ width: 20, height: 20 }} />
                    行业分布
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box sx={{ height: 256 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={industryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {industryDistribution.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: unknown) => [
                            `${String(value)} 个客户`,
                            String(name),
                          ]}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </Box>
                  <Box
                    sx={{
                      mt: 2,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    {industryDistribution.map((item, index) => (
                      <Box
                        key={item.name}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "0.875rem",
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span>{item.name}</span>
                        </Box>
                        <Typography sx={{ fontWeight: 500 }}>
                          {item.value} ({item.percentage}%)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, lg: 2 },
                gap: 3,
              }}
            >
              <MuiCard>
                <CardHeader>
                  <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Activity sx={{ width: 20, height: 20 }} />
                    销售漏斗
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {funnelData.map((item, index) => (
                      <Box key={item.stage} sx={{ position: "relative" }}>
                        <Box
                          sx={{
                            height: 48,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            px: 2,
                            color: "white",
                            transition: "all 300ms",
                            backgroundColor: item.color,
                            width: `${100 - index * 12}%`,
                          }}
                        >
                          <Typography sx={{ fontWeight: 500 }}>
                            {item.stage}
                          </Typography>
                          <Box
                            sx={{ display: "flex", alignItems: "center", gap: 2 }}
                          >
                            <Typography>{item.count} 个</Typography>
                            <Typography sx={{ fontWeight: 700 }}>
                              ¥{item.value.toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </MuiCard>

              <MuiCard>
                <CardHeader>
                  <Typography
                    variant="h6"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Calendar sx={{ width: 20, height: 20 }} />
                    最近活动
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}
                  >
                    {recentActivities.length > 0 ? (
                      recentActivities.map((activity, index) => (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            p: 1.5,
                            backgroundColor: "grey.100",
                            borderRadius: 1,
                          }}
                        >
                          <Chip
                            label={activity.type}
                            color="secondary"
                            size="small"
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 500,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {activity.title}
                            </Typography>
                            {activity.customer && (
                              <Typography
                                sx={{
                                  fontSize: "0.875rem",
                                  color: "text.secondary",
                                }}
                              >
                                {activity.customer}
                              </Typography>
                            )}
                          </Box>
                          <Typography
                            sx={{ fontSize: "0.875rem", color: "text.secondary" }}
                          >
                            {activity.time}
                          </Typography>
                        </Box>
                      ))
                    ) : (
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 4,
                          color: "text.secondary",
                        }}
                      >
                        暂无活动记录
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>
          </CardContent>
        </MuiCard>
      </Box>
    </>
  );
};

export default CRMDashboardPage;
