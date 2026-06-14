import { Button, Card, CardContent, CardHeader, Chip, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
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
import dayjs from "dayjs";

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Typography variant="h6" sx={{ fontWeight: 600 }} className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            销售预测
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>基于历史数据预测未来销售趋势</Typography>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>预测周期:</span>
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
                <RefreshIcon className="w-4 h-4 mr-2" />
                刷新预测
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">过去6个月收入</p>
                  <p className="text-2xl font-bold mt-1">
                    ¥{summary.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <Target className="w-8 h-8 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">月均收入</p>
                  <p className="text-2xl font-bold mt-1">
                    ¥{summary.averageMonthly.toLocaleString()}
                  </p>
                </div>
                <Calculator className="w-8 h-8 text-purple-200" />
              </div>
            </div>

            <div
              className={`rounded-xl p-4 text-white ${summary.growthRate >= 0 ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-red-500 to-red-600"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">增长率</p>
                  <p className="text-2xl font-bold mt-1">
                    {summary.growthRate >= 0 ? "+" : ""}
                    {summary.growthRate}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-white/80" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">预测总收入</p>
                  <p className="text-2xl font-bold mt-1">
                    ¥{summary.forecastTotal.toLocaleString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-amber-200" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }} className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  历史销售趋势
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  过去12个月的实际收入与目标对比
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="h-72">
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Typography variant="h6" sx={{ fontWeight: 600 }} className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  销售预测
                </Typography>
                <Typography variant="body2" sx={{ color: "grey.500" }}>
                  未来{forecastMonths}个月的销售预测(95%置信区间)
                </Typography>
              </CardHeader>
              <CardContent>
                <div className="h-72">
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
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>预测详情</Typography>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">月份</th>
                      <th className="text-right py-3 px-4 font-medium">
                        预测值
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        置信区间
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        概率
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastData.map((item, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="py-3 px-4">{item.month}</td>
                        <td className="text-right py-3 px-4 font-medium">
                          ¥{item.forecast.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4">
                          ¥{item.lower.toLocaleString()} - ¥
                          {item.upper.toLocaleString()}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Chip  size="small" variant="outlined" label="95%" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">预测说明</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 预测基于线性回归算法，使用过去12个月的数据进行训练</li>
                  <li>• 置信区间表示有95%的概率实际值会落在该范围内</li>
                  <li>• 预测结果仅供参考，实际销售可能受多种因素影响</li>
                  <li>• 建议定期更新数据以提高预测准确性</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

export default CRMSalesForecastPage;
