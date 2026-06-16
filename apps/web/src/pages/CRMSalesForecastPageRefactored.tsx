/**
 * CRMSalesForecastPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 主题色使用蓝色 (#3b82f6)
 */

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
import { crmApi } from "@/api/crm";
import { useAppStore } from "@/store";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  TrendingUp,
  Target,
  Calendar,
  Calculator,
  BarChart3,
} from "lucide-react";
import {
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
import dayjs from "dayjs";
import { PageHeader } from "@/components/layout";

const RefreshIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const CRMSalesForecastPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [forecastMonths, setForecastMonths] = useState(6);
  const [historicalData, setHistoricalData] = useState<
    { month: string; actual: number; target: number }[]
  >([]);
  const [forecastData, setForecastData] = useState<
    { month: string; forecast: number; upper: number; lower: number }[]
  >([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    averageMonthly: 0,
    growthRate: 0,
    forecastTotal: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadForecastData();
  }, [forecastMonths]);

  const calculateForecast = (
    data: { month: string; actual: number; target: number }[],
  ) => {
    const values = data.map((d) => d.actual);
    const n = values.length;

    if (n < 3) {
      return data.slice(-forecastMonths).map((d) => ({
        month: d.month,
        forecast: d.actual,
        upper: d.actual * 1.1,
        lower: d.actual * 0.9,
      }));
    }

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

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

    const forecast: {
      month: string;
      forecast: number;
      upper: number;
      lower: number;
    }[] = [];
    for (let i = 0; i < forecastMonths; i++) {
      const monthIndex = (currentMonth + 1 + i) % 12;
      const forecastValue = Math.max(0, slope * (n + i) + intercept);
      const variance =
        values.reduce(
          (acc, val, idx) => acc + Math.pow(val - (slope * idx + intercept), 2),
          0,
        ) /
        (n - 2);
      const stdDev = Math.sqrt(variance);

      forecast.push({
        month: months[monthIndex],
        forecast: Math.round(forecastValue),
        upper: Math.round(forecastValue + 1.96 * stdDev),
        lower: Math.max(0, Math.round(forecastValue - 1.96 * stdDev)),
      });
    }

    return forecast;
  };

  const loadForecastData = async () => {
    try {
      setLoading(true);
      const response = await crmApi.opportunities.list({
        page: 1,
        pageSize: 1000,
      });
      const opportunities = response.data?.items || [];

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

      const historical: { month: string; actual: number; target: number }[] =
        [];
      for (let i = 11; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const monthName = months[monthIndex];

        const monthOpportunities = opportunities.filter((o: any) => {
          const createdMonth = new Date(o.created_at).getMonth();
          return createdMonth === monthIndex;
        });

        const actualRevenue = monthOpportunities
          .filter((o) => o.stage === "closed_won")
          .reduce((sum, o) => sum + (o.value || 0), 0);

        const targetRevenue =
          monthOpportunities.reduce((sum, o) => sum + (o.value || 0), 0) * 0.6;

        historical.push({
          month: monthName,
          actual: actualRevenue,
          target: targetRevenue,
        });
      }

      setHistoricalData(historical);

      const forecast = calculateForecast(historical);
      setForecastData(forecast);

      const last6Months = historical.slice(-6);
      const totalRevenue = last6Months.reduce((sum, d) => sum + d.actual, 0);
      const averageMonthly = Math.round(totalRevenue / 6);
      const first3Months = historical.slice(-9, -6);
      const prevTotal = first3Months.reduce((sum, d) => sum + d.actual, 0);
      const growthRate =
        prevTotal > 0
          ? Math.round(((totalRevenue - prevTotal) / prevTotal) * 100)
          : 0;
      const forecastTotal = forecast.reduce((sum, d) => sum + d.forecast, 0);

      setSummary({
        totalRevenue,
        averageMonthly,
        growthRate,
        forecastTotal,
      });
    } catch (error) {
      console.error("加载销售预测数据失败:", error);
      addNotification({
        type: "error",
        title: "加载失败",
        message: "无法加载销售预测数据",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <PageHeader
        title="销售预测"
        subtitle="基于历史数据预测未来销售趋势"
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Card>
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
                  预测周期:
                </span>
                <FormControl size="small" sx={{ width: 128 }}>
                  <InputLabel>周期</InputLabel>
                  <Select
                    value={forecastMonths}
                    label="周期"
                    onChange={(e) => setForecastMonths(Number(e.target.value))}
                  >
                    <MenuItem value={3}>3个月</MenuItem>
                    <MenuItem value={6}>6个月</MenuItem>
                    <MenuItem value={12}>12个月</MenuItem>
                  </Select>
                </FormControl>
                <Button onClick={loadForecastData}>
                  <RefreshIcon style={{ width: 16, height: 16, marginRight: 8 }} />
                  刷新预测
                </Button>
              </Box>
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
                      过去6个月收入
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                      ¥{summary.totalRevenue.toLocaleString()}
                    </Typography>
                  </Box>
                  <Target
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
                      月均收入
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                      ¥{summary.averageMonthly.toLocaleString()}
                    </Typography>
                  </Box>
                  <Calculator
                    sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.5)" }}
                  />
                </Box>
              </Box>

              <Box
                sx={{
                  background:
                    summary.growthRate >= 0
                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
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
                      增长率
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                      {summary.growthRate >= 0 ? "+" : ""}
                      {summary.growthRate}%
                    </Typography>
                  </Box>
                  <TrendingUp
                    sx={{ width: 32, height: 32, color: "rgba(255,255,255,0.8)" }}
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
                      预测总收入
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5 }}>
                      ¥{summary.forecastTotal.toLocaleString()}
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
                gridTemplateColumns: { xs: 1, lg: 2 },
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
                    历史销售趋势
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    过去12个月的实际收入与目标对比
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
                      <BarChart data={historicalData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: unknown) => [
                            `¥${Number(value).toLocaleString()}`,
                            "",
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="actual" fill="#3b82f6" name="实际收入" />
                        <Bar dataKey="target" fill="#8b5cf6" name="目标收入" />
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
                    销售预测
                  </Typography>
                  <Typography variant="body2" sx={{ color: "grey.500" }}>
                    未来{forecastMonths}个月的销售预测(95%置信区间)
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
                      <AreaChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: unknown) => [
                            `¥${Number(value).toLocaleString()}`,
                            "",
                          ]}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="upper"
                          stroke="#f59e0b"
                          fill="rgba(245, 158, 11, 0.1)"
                          name="上限"
                        />
                        <Area
                          type="monotone"
                          dataKey="forecast"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          name="预测值"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          stroke="#10b981"
                          fill="rgba(16, 185, 129, 0.1)"
                          name="下限"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  预测详情
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
                          月份
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: "12px 16px",
                            fontWeight: 500,
                          }}
                        >
                          预测值
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: "12px 16px",
                            fontWeight: 500,
                          }}
                        >
                          置信区间
                        </th>
                        <th
                          style={{
                            textAlign: "center",
                            padding: "12px 16px",
                            fontWeight: 500,
                          }}
                        >
                          概率
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((item, index) => (
                        <tr
                          key={index}
                          style={{
                            borderBottom:
                              index === forecastData.length - 1
                                ? "none"
                                : "1px solid",
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>{item.month}</td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "12px 16px",
                              fontWeight: 500,
                            }}
                          >
                            ¥{item.forecast.toLocaleString()}
                          </td>
                          <td
                            style={{ textAlign: "right", padding: "12px 16px" }}
                          >
                            ¥{item.lower.toLocaleString()} - ¥
                            {item.upper.toLocaleString()}
                          </td>
                          <td
                            style={{ textAlign: "center", padding: "12px 16px" }}
                          >
                            <Chip size="small" variant="outlined" label="95%" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>

                <Box sx={{ mt: 3, p: 2, bgcolor: "grey.100", borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>
                    预测说明
                  </Typography>
                  <Box
                    component="ul"
                    sx={{
                      fontSize: "0.875rem",
                      color: "text.secondary",
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      pl: 2,
                      mb: 0,
                    }}
                  >
                    <li>预测基于线性回归算法，使用过去12个月的数据进行训练</li>
                    <li>置信区间表示有95%的概率实际值会落在该范围内</li>
                    <li>预测结果仅供参考，实际销售可能受多种因素影响</li>
                    <li>建议定期更新数据以提高预测准确性</li>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </Box>
    </>
  );
};

export default CRMSalesForecastPage;
