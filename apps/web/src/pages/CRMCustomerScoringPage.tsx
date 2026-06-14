import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputLabel,
  LinearProgress,
  Paper,
  Slider,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import type { Customer } from "@/api/crm";
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Target,
  DollarSign,
  Users,
} from "lucide-react";

export interface CustomerScore {
  customerId: string;
  customerName: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  description: string;
}

const CRMCustomerScoringPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerScore[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerScore | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [weights, setWeights] = useState({
    revenue: 30,
    frequency: 25,
    recency: 20,
    growth: 15,
    engagement: 10,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomerScores();
  }, []);

  const calculateScore = (
    customer: Customer,
    opportunities: any[],
    interactions: any[],
  ): CustomerScore => {
    const now = new Date();
    const totalRevenue = opportunities
      .filter(
        (o: any) => o.customer_id === customer.id && o.stage === "closed_won",
      )
      .reduce((sum, o) => sum + (o.value || 0), 0);

    const customerInteractions = interactions.filter(
      (i: any) => i.customer_id === customer.id,
    );
    const interactionFrequency = customerInteractions.length;

    const lastInteractionDate =
      customerInteractions.length > 0
        ? new Date(
            Math.max(
              ...customerInteractions.map((i: any) =>
                new Date(i.created_at).getTime(),
              ),
            ),
          )
        : new Date(0);
    const daysSinceLastInteraction = Math.floor(
      (now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const recencyScore = Math.max(0, 100 - daysSinceLastInteraction);

    const growthScore =
      totalRevenue > 100000
        ? 100
        : totalRevenue > 50000
          ? 75
          : totalRevenue > 10000
            ? 50
            : 25;

    const engagementScore =
      interactionFrequency > 10
        ? 100
        : interactionFrequency > 5
          ? 75
          : interactionFrequency > 2
            ? 50
            : 25;

    const revenueScore =
      totalRevenue > 100000
        ? 100
        : totalRevenue > 50000
          ? 75
          : totalRevenue > 10000
            ? 50
            : totalRevenue > 1000
              ? 25
              : 0;
    const frequencyScore =
      interactionFrequency > 10
        ? 100
        : interactionFrequency > 5
          ? 75
          : interactionFrequency > 2
            ? 50
            : 10;

    const totalScore = Math.round(
      (revenueScore * weights.revenue +
        frequencyScore * weights.frequency +
        recencyScore * weights.recency +
        growthScore * weights.growth +
        engagementScore * weights.engagement) /
        100,
    );

    const grade =
      totalScore >= 80
        ? "A"
        : totalScore >= 60
          ? "B"
          : totalScore >= 40
            ? "C"
            : "D";

    const factors: ScoreFactor[] = [
      {
        name: "收入贡献",
        weight: weights.revenue,
        score: revenueScore,
        maxScore: 100,
        description: "客户带来的收入总额",
      },
      {
        name: "互动频率",
        weight: weights.frequency,
        score: frequencyScore,
        maxScore: 100,
        description: "与客户的互动次数",
      },
      {
        name: "最近互动",
        weight: weights.recency,
        score: Math.round(recencyScore),
        maxScore: 100,
        description: "距离上次互动的天数",
      },
      {
        name: "增长潜力",
        weight: weights.growth,
        score: growthScore,
        maxScore: 100,
        description: "客户业务增长潜力",
      },
      {
        name: "参与度",
        weight: weights.engagement,
        score: engagementScore,
        maxScore: 100,
        description: "客户参与度评分",
      },
    ];

    return {
      customerId: customer.id,
      customerName: customer.name,
      score: totalScore,
      grade,
      factors,
    };
  };

  const loadCustomerScores = async () => {
    try {
      setLoading(true);
      const [customerRes, opportunityRes, interactionRes] = await Promise.all([
        crmApi.customers.list({ page: 1, pageSize: 1000 }),
        crmApi.opportunities.list({ page: 1, pageSize: 1000 }),
        crmApi.interactions.list({ page: 1, pageSize: 1000 }),
      ]);

      const customerList = customerRes.data?.items || [];
      const opportunities: any[] = opportunityRes.data?.items || [];
      const interactions: any[] = interactionRes.data?.items || [];

      const scores = customerList.map((customer) =>
        calculateScore(customer, opportunities, interactions),
      );

      setCustomers(scores.sort((a, b) => b.score - a.score));
    } catch (error) {
      console.error("加载客户评分失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载客户评分数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadge = (grade: string) => {
    const gradeConfig: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "destructive" | "outline";
        color: string;
      }
    > = {
      A: { label: "A", variant: "default", color: "bg-green-500" },
      B: { label: "B", variant: "default", color: "bg-blue-500" },
      C: { label: "C", variant: "outline", color: "bg-amber-500" },
      D: { label: "D", variant: "destructive", color: "bg-red-500" },
    };
    const config = gradeConfig[grade];
    return (
      <Chip size="small" className={`${config.color} text-white font-bold text-lg px-3`} label={config.label} />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreTrend = (score: number) => {
    if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (score >= 60) return <Minus className="w-4 h-4 text-blue-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const gradeDistribution = {
    A: customers.filter((c) => c.grade === "A").length,
    B: customers.filter((c) => c.grade === "B").length,
    C: customers.filter((c) => c.grade === "C").length,
    D: customers.filter((c) => c.grade === "D").length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }} className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            客户价值评分
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            根据客户数据自动计算客户价值评分和等级
          </Typography>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">A级客户</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">
                    {gradeDistribution.A}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">B级客户</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">
                    {gradeDistribution.B}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-600 text-sm font-medium">C级客户</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">
                    {gradeDistribution.C}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-600 text-sm font-medium">D级客户</p>
                  <p className="text-2xl font-bold text-red-700 mt-1">
                    {gradeDistribution.D}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Star className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted rounded-xl p-6 mb-8">
            <h4 className="font-medium mb-4">评分权重设置</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    收入贡献
                  </span>
                  <span className="text-sm font-medium">
                    {weights.revenue}%
                  </span>
                </div>
                <Slider
                  value={weights.revenue}
                  onChange={(_, value) =>
                    setWeights({ ...weights, revenue: value as number })
                  }
                  max={50}
                  step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    互动频率
                  </span>
                  <span className="text-sm font-medium">
                    {weights.frequency}%
                  </span>
                </div>
                <Slider
                  value={weights.frequency}
                  onChange={(_, value) =>
                    setWeights({ ...weights, frequency: value as number })
                  }
                  max={50}
                  step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    最近互动
                  </span>
                  <span className="text-sm font-medium">
                    {weights.recency}%
                  </span>
                </div>
                <Slider
                  value={weights.recency}
                  onChange={(_, value) =>
                    setWeights({ ...weights, recency: value as number })
                  }
                  max={30}
                  step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    增长潜力
                  </span>
                  <span className="text-sm font-medium">{weights.growth}%</span>
                </div>
                <Slider
                  value={weights.growth}
                  onChange={(_, value) =>
                    setWeights({ ...weights, growth: value as number })
                  }
                  max={30}
                  step={5}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    参与度
                  </span>
                  <span className="text-sm font-medium">
                    {weights.engagement}%
                  </span>
                </div>
                <Slider
                  value={weights.engagement}
                  onChange={(_, value) =>
                    setWeights({ ...weights, engagement: value as number })
                  }
                  max={20}
                  step={5}
                />
              </div>
              <div className="flex items-end">
                <Button variant="outlined" onClick={loadCustomerScores}>
                  应用权重并刷新
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {customers.length > 0 ? (
              customers.map((customer) => (
                <div
                  key={customer.customerId}
                  className="bg-background rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowDetailDialog(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold">
                          {customer.customerName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{customer.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          点击查看详细评分
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p
                          className={`text-2xl font-bold ${getScoreColor(customer.score)}`}
                        >
                          {customer.score}
                        </p>
                        <p className="text-xs text-muted-foreground">评分</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getGradeBadge(customer.grade)}
                        {getScoreTrend(customer.score)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>暂无客户评分数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Award style={{ width: 20, height: 20 }} />
          {selectedCustomer?.customerName} - 评分详情
        </DialogTitle>
        <DialogContent sx={{ maxWidth: 550 }}>
          {selectedCustomer && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 4, py: 2 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: "bold", color: `${getScoreColor(selectedCustomer.score)}.main` }}
                  >
                    {selectedCustomer.score}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>综合评分</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  {getGradeBadge(selectedCustomer.grade)}
                  <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>客户等级</Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedCustomer.factors.map((factor, index) => (
                  <Paper key={index} sx={{ p: 2, bgcolor: "grey.100" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{factor.name}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        权重: {factor.weight}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={factor.score}
                          sx={{ height: 8, borderRadius: 1, bgcolor: "grey.300" }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, width: 48, textAlign: "right" }}>
                        {factor.score}/{factor.maxScore}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                      {factor.description}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CRMCustomerScoringPage;
