import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import type { SalesForecast, ForecastFactor } from "@/api/modules/crm/crm";
import { crmApi } from "@/api/modules/crm/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { apiLogger } from "@/utils/logger";
import {
  TrendingUp,
  Target,
  Calendar,
  Calculator,
  BarChart3,
  RefreshCw,
  Plus,
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
  AreaChart,
  Area,
} from "recharts";

const CRMSalesForecastPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [periodType, setPeriodType] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadForecasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType]);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const response = await crmApi.salesForecast.list({
        period_type: periodType,
      });
      setForecasts(response.data?.items || []);
    } catch (error) {
      apiLogger.error("加载销售预测数据失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载销售预测数据",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateForecast = async () => {
    try {
      const now = new Date();
      const period =
        periodType === "monthly"
          ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
          : periodType === "quarterly"
            ? `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`
            : `${now.getFullYear()}`;

      setLoading(true);
      await crmApi.salesForecast.generate({ period_type: periodType, period });
      addNotification({
        type: "success",
        title: "成功",
        message: "销售预测生成成功",
      });
      loadForecasts();
    } catch (error) {
      apiLogger.error("生成销售预测失败:", error);
      addNotification({
        type: "error",
        title: "生成失败",
        message: "销售预测生成失败",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return (
          <TrendingUp sx={{ width: 16, height: 16, color: "success.main" }} />
        );
      case "down":
        return (
          <TrendingUp
            sx={{
              width: 16,
              height: 16,
              color: "error.main",
              transform: "rotate(180deg)",
            }}
          />
        );
      default:
        return <Target sx={{ width: 16, height: 16, color: "grey.500" }} />;
    }
  };

  const chartData = forecasts.map((f) => ({
    period: f.period,
    predicted: f.predicted_amount,
    actual: f.actual_amount || 0,
    confidence: Math.round(f.confidence_level * 100),
  }));

  const summary = {
    totalPredicted: forecasts.reduce((sum, f) => sum + f.predicted_amount, 0),
    totalActual: forecasts.reduce((sum, f) => sum + (f.actual_amount || 0), 0),
    averageConfidence:
      forecasts.length > 0
        ? Math.round(
            (forecasts.reduce((sum, f) => sum + f.confidence_level, 0) /
              forecasts.length) *
              100,
          )
        : 0,
    completedCount: forecasts.filter((f) => f.status === "completed").length,
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
            <TrendingUp sx={{ width: 20, height: 20 }} />
            销售预测
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            基于历史数据预测未来销售趋势
          </Typography>
        </CardHeader>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 4,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                周期类型:
              </span>
              <FormControl size="small" sx={{ width: 140 }}>
                <InputLabel>周期类型</InputLabel>
                <Select
                  value={periodType}
                  label="周期类型"
                  onChange={(e) =>
                    setPeriodType(
                      e.target.value as "monthly" | "quarterly" | "yearly",
                    )
                  }
                >
                  <MenuItem value="monthly">月度</MenuItem>
                  <MenuItem value="quarterly">季度</MenuItem>
                  <MenuItem value="yearly">年度</MenuItem>
                </Select>
              </FormControl>
              <Button
                onClick={loadForecasts}
                startIcon={
                  <RefreshCw sx={{ width: 16, height: 16 }}>刷新</RefreshCw>
                }
              >
                刷新
              </Button>
            </Box>
            <Button
              variant="contained"
              startIcon={<Plus />}
              onClick={handleGenerateForecast}
            >
              生成预测
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
            <Box
              sx={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.875rem",
                    }}
                  >
                    预测总收入
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                    ¥{summary.totalPredicted.toLocaleString()}
                  </Typography>
                </Box>
                <Target
                  sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.5)" }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.875rem",
                    }}
                  >
                    实际总收入
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                    ¥{summary.totalActual.toLocaleString()}
                  </Typography>
                </Box>
                <Calculator
                  sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.5)" }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.875rem",
                    }}
                  >
                    平均置信度
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                    {summary.averageConfidence}%
                  </Typography>
                </Box>
                <BarChart3
                  sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.5)" }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
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
                  <Typography
                    variant="body2"
                    sx={{
                      color: "rgba(255,255,255,0.8)",
                      fontSize: "0.875rem",
                    }}
                  >
                    已完成预测
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                    {summary.completedCount} / {forecasts.length}
                  </Typography>
                </Box>
                <Calendar
                  sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.5)" }}
                />
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                lg: "repeat(2, 1fr)",
              },
              gap: 3,
            }}
          >
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
                  <BarChart3 sx={{ width: 20, height: 20 }} />
                  预测对比
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  预测值与实际值对比
                </Typography>
              </CardHeader>
              <CardContent>
                <Box sx={{ height: 288 }}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: unknown) => [
                          `¥${Number(value).toLocaleString()}`,
                          "",
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="predicted" fill="#3b82f6" name="预测值" />
                      <Bar dataKey="actual" fill="#10b981" name="实际值" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

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
                  <TrendingUp sx={{ width: 20, height: 20 }} />
                  置信度趋势
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  各周期预测置信度变化
                </Typography>
              </CardHeader>
              <CardContent>
                <Box sx={{ height: 288 }}>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={0}
                  >
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: unknown) => [`${value}%`, "置信度"]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="confidence"
                        stroke="#8b5cf6"
                        name="置信度"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                预测列表
              </Typography>
            </CardHeader>
            <CardContent>
              <Box sx={{ overflowX: "auto" }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        周期
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        {" "}
                        预测金额
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        实际金额
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        置信度
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        趋势
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          padding: "12px 16px",
                          fontWeight: 500,
                        }}
                      >
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.length > 0 ? (
                      forecasts.map((forecast) => (
                        <tr
                          key={forecast.id}
                          style={{
                            borderBottom: "1px solid",
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            {forecast.period}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 16px",
                              fontWeight: 500,
                            }}
                          >
                            ¥{forecast.predicted_amount.toLocaleString()}
                          </td>
                          <td
                            style={{ textAlign: "right", padding: "12px 16px" }}
                          >
                            {forecast.actual_amount
                              ? `¥${forecast.actual_amount.toLocaleString()}`
                              : "-"}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              padding: "12px 16px",
                            }}
                          >
                            <Chip
                              size="small"
                              variant="outlined"
                              label={`${Math.round(forecast.confidence_level * 100)}%`}
                              sx={{
                                bgcolor:
                                  forecast.confidence_level >= 0.8
                                    ? "success.light"
                                    : forecast.confidence_level >= 0.6
                                      ? "warning.light"
                                      : "error.light",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              padding: "12px 16px",
                            }}
                          >
                            {getTrendIcon(forecast.trend)}
                          </td>
                          <td
                            style={{
                              textAlign: "center",
                              padding: "12px 16px",
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                forecast.status === "completed"
                                  ? "已完成"
                                  : forecast.status === "generated"
                                    ? "已生成"
                                    : forecast.status
                              }
                              sx={{
                                bgcolor:
                                  forecast.status === "completed"
                                    ? "success.light"
                                    : "info.light",
                              }}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: "32px 16px",
                            textAlign: "center",
                            color: "text.disabled",
                          }}
                        >
                          暂无预测数据，点击上方按钮生成预测
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </Box>

              {forecasts.length > 0 &&
                forecasts[0].factors &&
                forecasts[0].factors.length > 0 && (
                  <Box
                    sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 2 }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 500, mb: 2 }}
                    >
                      预测影响因素
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 2,
                      }}
                    >
                      {(forecasts[0].factors as ForecastFactor[]).map(
                        (factor, index) => (
                          <Chip
                            key={index}
                            label={`${factor.name} (${Math.round(factor.impact * 100)}%)`}
                            variant="outlined"
                          />
                        ),
                      )}
                    </Box>
                  </Box>
                )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CRMSalesForecastPage;
