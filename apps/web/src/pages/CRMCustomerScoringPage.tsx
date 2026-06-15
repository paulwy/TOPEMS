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
      <Chip
        size="small"
        sx={{
          bgcolor: config.color,
          color: "white",
          fontWeight: "bold",
          fontSize: "1.125rem",
          px: 1.5,
        }}
        label={config.label}
      />
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "success.main";
    if (score >= 60) return "primary.main";
    if (score >= 40) return "warning.main";
    return "error.main";
  };

  const getScoreTrend = (score: number) => {
    if (score >= 80)
      return (
        <TrendingUp sx={{ width: 16, height: 16, color: "success.main" }} />
      );
    if (score >= 60)
      return <Minus sx={{ width: 16, height: 16, color: "primary.main" }} />;
    return <TrendingDown sx={{ width: 16, height: 16, color: "error.main" }} />;
  };

  const gradeDistribution = {
    A: customers.filter((c) => c.grade === "A").length,
    B: customers.filter((c) => c.grade === "B").length,
    C: customers.filter((c) => c.grade === "C").length,
    D: customers.filter((c) => c.grade === "D").length,
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardHeader>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Award sx={{ width: 20, height: 20 }} />
            客户价值评分
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            根据客户数据自动计算客户价值评分和等级
          </Typography>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Box sx={{ bgcolor: "success.light", borderRadius: 2, p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "success.dark",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    A级客户
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "success.main", mt: 0.5 }}
                  >
                    {gradeDistribution.A}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "success.main",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star sx={{ width: 24, height: 24, color: "white" }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "primary.light", borderRadius: 2, p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "primary.dark",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    B级客户
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "primary.main", mt: 0.5 }}
                  >
                    {gradeDistribution.B}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "primary.main",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star sx={{ width: 24, height: 24, color: "white" }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "warning.light", borderRadius: 2, p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "warning.dark",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    C级客户
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "warning.main", mt: 0.5 }}
                  >
                    {gradeDistribution.C}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "warning.main",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star sx={{ width: 24, height: 24, color: "white" }} />
                </Box>
              </Box>
            </Box>

            <Box sx={{ bgcolor: "error.light", borderRadius: 2, p: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "error.dark",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                    }}
                  >
                    D级客户
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: "bold", color: "error.main", mt: 0.5 }}
                  >
                    {gradeDistribution.D}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: "error.main",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star sx={{ width: 24, height: 24, color: "white" }} />
                </Box>
              </Box>
            </Box>
          </Box>

          <Box sx={{ bgcolor: "grey.100", borderRadius: 2, p: 3, mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 2 }}>
              评分权重设置
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: 1, md: 2, lg: 3 },
                gap: 2,
              }}
            >
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <DollarSign sx={{ width: 16, height: 16 }} />
                    <Typography variant="body2">收入贡献</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {weights.revenue}%
                  </Typography>
                </Box>
                <Slider
                  value={weights.revenue}
                  onChange={(_, value) =>
                    setWeights({ ...weights, revenue: value as number })
                  }
                  max={50}
                  step={5}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Users sx={{ width: 16, height: 16 }} />
                    <Typography variant="body2">互动频率</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {weights.frequency}%
                  </Typography>
                </Box>
                <Slider
                  value={weights.frequency}
                  onChange={(_, value) =>
                    setWeights({ ...weights, frequency: value as number })
                  }
                  max={50}
                  step={5}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Target sx={{ width: 16, height: 16 }} />
                    <Typography variant="body2">最近互动</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {weights.recency}%
                  </Typography>
                </Box>
                <Slider
                  value={weights.recency}
                  onChange={(_, value) =>
                    setWeights({ ...weights, recency: value as number })
                  }
                  max={30}
                  step={5}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <TrendingUp sx={{ width: 16, height: 16 }} />
                    <Typography variant="body2">增长潜力</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {weights.growth}%
                  </Typography>
                </Box>
                <Slider
                  value={weights.growth}
                  onChange={(_, value) =>
                    setWeights({ ...weights, growth: value as number })
                  }
                  max={30}
                  step={5}
                />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Award sx={{ width: 16, height: 16 }} />
                    <Typography variant="body2">参与度</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {weights.engagement}%
                  </Typography>
                </Box>
                <Slider
                  value={weights.engagement}
                  onChange={(_, value) =>
                    setWeights({ ...weights, engagement: value as number })
                  }
                  max={20}
                  step={5}
                />
              </Box>
              <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                <Button variant="outlined" onClick={loadCustomerScores}>
                  应用权重并刷新
                </Button>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <Box
                  key={customer.customerId}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                    p: 2,
                    "&:hover": { boxShadow: 3 },
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowDetailDialog(true);
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: "grey.100",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                          {customer.customerName.charAt(0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {customer.customerName}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          点击查看详细评分
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: "bold",
                            color: getScoreColor(customer.score),
                          }}
                        >
                          {customer.score}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          评分
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {getGradeBadge(customer.grade)}
                        {getScoreTrend(customer.score)}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              ))
            ) : (
              <Box sx={{ textAlign: "center", py: 6, color: "text.secondary" }}>
                <Award
                  sx={{
                    width: 64,
                    height: 64,
                    mx: "auto",
                    mb: 2,
                    opacity: 0.3,
                  }}
                />
                <Typography>暂无客户评分数据</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Award sx={{ width: 20, height: 20 }} />
          {selectedCustomer?.customerName} - 评分详情
        </DialogTitle>
        <DialogContent sx={{ maxWidth: 550 }}>
          {selectedCustomer && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 4,
                  py: 2,
                }}
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: "bold",
                      color: getScoreColor(selectedCustomer.score),
                    }}
                  >
                    {selectedCustomer.score}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    综合评分
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  {getGradeBadge(selectedCustomer.grade)}
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    客户等级
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {selectedCustomer.factors.map((factor, index) => (
                  <Paper key={index} sx={{ p: 2, bgcolor: "grey.100" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                      }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {factor.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "text.secondary" }}
                      >
                        权重: {factor.weight}%
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={factor.score}
                          sx={{
                            height: 8,
                            borderRadius: 1,
                            bgcolor: "grey.300",
                          }}
                        />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, width: 48, textAlign: "right" }}
                      >
                        {factor.score}/{factor.maxScore}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        mt: 0.5,
                        display: "block",
                      }}
                    >
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
    </Box>
  );
};

export default CRMCustomerScoringPage;
