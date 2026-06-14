import React, { useState, useEffect } from "react";
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
} from "@mui/material";
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
  AreaChart,
  Area,
  ComposedChart,
  BarChart as ReBarChart,
} from "recharts";

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
    <div className="space-y-6">
      <MuiCard>
        <CardHeader>
          <Typography variant="h6">CRM 仪表板</Typography>
          <Typography variant="body2" color="text.secondary">客户关系管理数据概览</Typography>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">客户总数</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats.totalCustomers}
                  </p>
                  <p className="text-blue-200 text-sm mt-1">
                    活跃: {stats.activeCustomers} (
                    {Math.round(
                      (stats.activeCustomers / stats.totalCustomers) * 100,
                    )}
                    %)
                  </p>
                </div>
                <Users className="w-10 h-10 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">联系人</p>
                  <p className="text-3xl font-bold mt-1">
                    {stats.totalContacts}
                  </p>
                  <p className="text-purple-200 text-sm mt-1">预计估算</p>
                </div>
                <Target className="w-10 h-10 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">商机总额</p>
                  <p className="text-3xl font-bold mt-1">
                    ¥{stats.totalOpportunityValue.toLocaleString()}
                  </p>
                  <p className="text-amber-200 text-sm mt-1">
                    共 {stats.totalOpportunities} 个商机
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-amber-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm">成交率</p>
                  <p className="text-3xl font-bold mt-1">{stats.winRate}%</p>
                  <p className="text-emerald-200 text-sm mt-1">
                    已成交 ¥{stats.closedWonValue.toLocaleString()}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-emerald-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MuiCard>
                <CardHeader>
                  <Typography variant="h6" className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    销售趋势
                  </Typography>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
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
                  </div>
                </CardContent>
              </MuiCard>
            </div>

            <MuiCard>
              <CardHeader>
                <Typography variant="h6" className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  行业分布
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="h-64">
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
                </div>
                <div className="mt-4 space-y-2">
                  {industryDistribution.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-medium">
                        {item.value} ({item.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </MuiCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MuiCard>
              <CardHeader>
                <Typography variant="h6" className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  销售漏斗
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {funnelData.map((item, index) => (
                    <div key={item.stage} className="relative">
                      <div
                        className="h-12 rounded-lg flex items-center justify-between px-4 text-white transition-all duration-300"
                        style={{
                          backgroundColor: item.color,
                          width: `${100 - index * 12}%`,
                        }}
                      >
                        <span className="font-medium">{item.stage}</span>
                        <div className="flex items-center gap-4">
                          <span>{item.count} 个</span>
                          <span className="font-bold">
                            ¥{item.value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </MuiCard>

            <MuiCard>
              <CardHeader>
                <Typography variant="h6" className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  最近活动
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                      >
                        <Chip label={activity.type} color="secondary" size="small" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {activity.title}
                          </p>
                          {activity.customer && (
                            <p className="text-sm text-muted-foreground">
                              {activity.customer}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {activity.time}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      暂无活动记录
                    </div>
                  )}
                </div>
              </CardContent>
            </MuiCard>
          </div>
        </CardContent>
      </MuiCard>
    </div>
  );
};

export default CRMDashboardPage;
