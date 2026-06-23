import { Box, Card, CardContent, CardHeader, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Paper, Typography,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import type { CustomerScore, ScoreFactor } from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { logger } from "@/utils/logger";
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  RefreshCw,
  Calculator,
} from "lucide-react";

const CRMCustomerScoringPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<CustomerScore[]>([]);
  const [selectedScore, setSelectedScore] = useState<CustomerScore | null>(
    null,
  );
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadCustomerScores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomerScores = async () => {
    try {
      setLoading(true);
      const response = await crmApi.customerScoring.list();
      setScores(response.data?.items || []);
    } catch (error) {
      logger.error("加载客户评分失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载客户评分数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBatchCalculate = async () => {
    try {
      const customerResponse = await crmApi.customers.list({
        page: 1,
        pageSize: 100,
      });
      const customerIds = customerResponse.data?.items?.map((c) => c.id) || [];

      if (customerIds.length === 0) {
        addNotification({
          type: "warning",
          title: "提示",
          message: "请先添加客户",
        });
        return;
      }

      setLoading(true);
      await crmApi.customerScoring.calculateBatch(customerIds);
      addNotification({
        type: "success",
        title: "成功",
        message: "已批量计算客户评分",
      });
      loadCustomerScores();
    } catch (error) {
      logger.error("批量计算评分失败:", error);
      addNotification({
        type: "error",
        title: "计算失败",
        message: "批量计算客户评分失败",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGradeBadge = (scoreLevel: string) => {
    const gradeConfig: Record<
      string,
      {
        label: string;
        color: string;
      }
    > = {
      A: { label: "A", color: "success.main" },
      B: { label: "B", color: "primary.main" },
      C: { label: "C", color: "warning.main" },
      D: { label: "D", color: "error.main" },
    };
    const config = gradeConfig[scoreLevel] || {
      label: scoreLevel,
      color: "grey.500",
    };
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

  const getScoreTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return (
          <TrendingUp sx={{ width: 16, height: 16, color: "success.main" }} />
        );
      case "down":
        return (
          <TrendingDown sx={{ width: 16, height: 16, color: "error.main" }} />
        );
      default:
        return <Minus sx={{ width: 16, height: 16, color: "grey.500" }} />;
    }
  };

  const gradeDistribution = {
    A: scores.filter((s) => s.score_level === "A").length,
    B: scores.filter((s) => s.score_level === "B").length,
    C: scores.filter((s) => s.score_level === "C").length,
    D: scores.filter((s) => s.score_level === "D").length,
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
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 4 }}>
            <Button
              variant="contained"
              startIcon={<Calculator />}
              onClick={handleBatchCalculate}
            >
              批量计算评分
            </Button>
          </Box>

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

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {scores.length > 0 ? (
              scores.map((score) => (
                <Box
                  key={score.id}
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
                    setSelectedScore(score);
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
                          {score.customer_name.charAt(0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {score.customer_name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                        >
                          评分日期:{" "}
                          {new Date(score.scoring_date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Box sx={{ textAlign: "center" }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: "bold",
                            color: getScoreColor(score.score),
                          }}
                        >
                          {score.score}
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
                        {getGradeBadge(score.score_level)}
                        {getScoreTrendIcon(score.trend)}
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
                <Typography variant="body2">
                  点击上方按钮批量计算客户评分
                </Typography>
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
          {selectedScore?.customer_name} - 评分详情
        </DialogTitle>
        <DialogContent sx={{ maxWidth: 550 }}>
          {selectedScore && (
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
                      color: getScoreColor(selectedScore.score),
                    }}
                  >
                    {selectedScore.score}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    综合评分
                  </Typography>
                  {selectedScore.last_score !== undefined && (
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          selectedScore.score > selectedScore.last_score
                            ? "success.main"
                            : selectedScore.score < selectedScore.last_score
                              ? "error.main"
                              : "text.secondary",
                        mt: 0.5,
                        display: "block",
                      }}
                    >
                      上次评分: {selectedScore.last_score}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  {getGradeBadge(selectedScore.score_level)}
                  <Typography
                    variant="body2"
                    sx={{ color: "text.secondary", mt: 0.5 }}
                  >
                    客户等级
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {(selectedScore.factors as ScoreFactor[]).map(
                  (factor, index) => (
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
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 2 }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(factor.score / factor.max_score) * 100}
                            sx={{
                              height: 8,
                              borderRadius: 1,
                              bgcolor: "grey.300",
                            }}
                          />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            width: 60,
                            textAlign: "right",
                          }}
                        >
                          {factor.score}/{factor.max_score}
                        </Typography>
                      </Box>
                    </Paper>
                  ),
                )}
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
