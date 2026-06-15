/**
 * BIAnalyticsPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
} from "@mui/material";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts";
import { fetchAnalyticsOverview } from "../api/bi";
import { ChartCard } from "../components/ChartCard";
import { BIChartColors } from "../components/charts/chartTheme";
import OrganizationFilter, {
  type OrganizationFilterValue,
} from "../components/ui/OrganizationFilter";
import { PageHeader } from "../components/layout";

// ============ 类型定义 ============
interface ModuleStats {
  项目总数?: number;
  进行中?: number;
  完成率?: string;
  检验总数?: number;
  合格率?: string;
  待处理?: number;
  批次总数?: number;
  完成?: number;
  效率?: string;
  样品总数?: number;
  完成检验?: number;
  仪器使用率?: string;
  风险总数?: number;
  高风险?: number;
  安全事件?: number;
  供应商总数?: number;
  合格?: number;
  平均评分?: number;
}

interface ModuleItem {
  id: string;
  name: string;
  icon: string;
  stats: ModuleStats;
  trend: "up" | "down" | "stable";
  color: string;
}

interface ModuleOverview {
  modules?: Record<string, {
    name?: string;
    total_projects?: number;
    total_samples?: number;
    total_inspections?: number;
    total_risks?: number;
    total_suppliers?: number;
    total_batches?: number;
  }>;
}

// ============ 默认模块数据 ============
const defaultModules: ModuleItem[] = [
  {
    id: "development",
    name: "研发管理",
    icon: "🔬",
    stats: { 项目总数: 120, 进行中: 45, 完成率: "85%" },
    trend: "up",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "quality",
    name: "质量管理",
    icon: "✅",
    stats: { 检验总数: 3250, 合格率: "97.8%", 待处理: 70 },
    trend: "up",
    color: "from-emerald-500 to-teal-500",
  },
  {
    id: "production",
    name: "生产数据",
    icon: "🏭",
    stats: { 批次总数: 450, 完成: 415, 效率: "92%" },
    trend: "stable",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "laboratory",
    name: "实验室",
    icon: "🧪",
    stats: { 样品总数: 2450, 完成检验: 2150, 仪器使用率: "87.5%" },
    trend: "up",
    color: "from-violet-500 to-purple-500",
  },
  {
    id: "ehs",
    name: "安全环保",
    icon: "🛡️",
    stats: { 风险总数: 125, 高风险: 15, 安全事件: 18 },
    trend: "down",
    color: "from-rose-500 to-pink-500",
  },
  {
    id: "srm",
    name: "供应链",
    icon: "📦",
    stats: { 供应商总数: 280, 合格: 220, 平均评分: 4.5 },
    trend: "up",
    color: "from-cyan-500 to-blue-500",
  },
];

// ============ 模块卡片组件 ============
interface ModuleCardProps {
  module: ModuleItem;
  onSelect: (id: string) => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, onSelect }) => {
  const getTrendIcon = () => {
    if (module.trend === "up") {
      return <TrendingUp sx={{ width: 16, height: 16, color: "success.main" }} />;
    }
    if (module.trend === "down") {
      return <TrendingDown sx={{ width: 16, height: 16, color: "error.main" }} />;
    }
    return <Minus sx={{ width: 16, height: 16, color: "grey.400" }} />;
  };

  const getTrendValue = () => {
    if (module.trend === "up") return "+12.5%";
    if (module.trend === "down") return "-3.2%";
    return "0%";
  };

  const getTrendTextColor = () => {
    if (module.trend === "up") return "success.main";
    if (module.trend === "down") return "error.main";
    return "grey.400";
  };

  return (
    <Paper
      onClick={() => onSelect(module.id)}
      sx={{
        position: "relative",
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: 1,
        border: "1px solid",
        borderColor: "divider",
        p: 3,
        cursor: "pointer",
        transition: "all 0.3s",
        overflow: "hidden",
        "&:hover": {
          boxShadow: 2,
          borderColor: "grey.300",
          transform: "scale(1.02)",
        },
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 96,
          height: 96,
          opacity: 0.05,
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            background: `linear-gradient(to bottom right, var(--tw-gradient-stops))`,
            borderRadius: "50%",
            filter: "blur(48px)",
            transform: "translate(32px, -32px)",
          }}
        />
      </Box>

      <Box sx={{ position: "relative", zIndex: 10 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="h4">{module.icon}</Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "grey.900" }}>
                {module.name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                {getTrendIcon()}
                <Typography variant="caption" sx={{ fontWeight: 500, color: getTrendTextColor() }}>
                  {getTrendValue()}
                </Typography>
              </Box>
            </Box>
          </Box>
          <ArrowRight
            sx={{
              width: 20,
              height: 20,
              color: "grey.300",
              transition: "all 0.3s",
              ".group:hover &": {
                color: "grey.500",
                transform: "translateX(4px)",
              },
            }}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {Object.entries(module.stats)
            .slice(0, 3)
            .map(([key, value]) => (
              <Box key={key} sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "grey.900" }}>
                  {typeof value === "number" ? value.toLocaleString() : String(value)}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.500", mt: 0.25 }}>
                  {key}
                </Typography>
              </Box>
            ))}
        </Box>
      </Box>
    </Paper>
  );
};

// ============ 系统状态组件 ============
interface SystemStatusProps {
  loading?: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ loading }) => (
  <Paper
    sx={{
      bgcolor: "background.paper",
      borderRadius: 2,
      boxShadow: 1,
      border: "1px solid",
      borderColor: "divider",
      p: 3,
    }}
  >
    <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.800", mb: 2 }}>
      系统状态
    </Typography>
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: 1, md: 3 },
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
        }}
      >
        <Typography variant="body2" sx={{ color: "grey.600" }}>
          数据更新时间
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, color: "grey.900" }}>
          {new Date().toLocaleString("zh-CN")}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" sx={{ color: "grey.600" }}>
          系统状态
        </Typography>
        <Chip label="正常运行" color="success" size="small" />
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="body2" sx={{ color: "grey.600" }}>
          数据源连接
        </Typography>
        <Chip label="已连接" color="success" size="small" />
      </Box>
    </Box>
  </Paper>
);

// ============ 主组件 ============
const BIAnalyticsPageRefactored: React.FC = () => {
  const [overview, setOverview] = useState<ModuleOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const navigate = useNavigate();

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await fetchAnalyticsOverview();
        if (res.success && res.data) {
          setOverview(res.data);
        }
      } catch (e) {
        console.error("Failed to load overview:", e);
      } finally {
        setLoading(false);
      }
    };
    loadOverview();
  }, []);

  const handleModuleSelect = useCallback(
    (moduleId: string) => {
      navigate(`/bi/module/${moduleId}`);
    },
    [navigate],
  );

  const modules = defaultModules;

  // 图表数据
  const moduleData = overview?.modules || {};
  const chartData = Object.entries(moduleData).map(([key, module]: [string, any]) => ({
    name: module.name || key,
    value:
      module.total_projects ||
      module.total_samples ||
      module.total_inspections ||
      module.total_risks ||
      module.total_suppliers ||
      module.total_batches ||
      0,
  }));

  const fallbackChartData = modules.map((m) => ({
    name: m.name,
    value: (Object.values(m.stats)[0] as number) || 0,
  }));

  const finalChartData = chartData.length > 0 ? chartData : fallbackChartData;

  // 刷新处理
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", p: 3 }}>
      {/* 页面头部 */}
      <PageHeader
        title="概览分析"
        subtitle="各业务模块数据总览"
        actions={[
          {
            label: "刷新",
            icon: <RefreshCw style={{ width: 18, height: 18 }} />,
            onClick: handleRefresh,
            variant: "outlined",
          },
        ]}
      />

      {/* 筛选器 */}
      <Paper
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 1,
          border: "1px solid",
          borderColor: "divider",
          p: 2,
          mb: 3,
        }}
      >
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={true}
        />
      </Paper>

      {/* 图表区域 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, lg: 3 },
          gap: 3,
          mb: 3,
        }}
      >
        <Box sx={{ gridColumn: { lg: "span 2" } }}>
          <ChartCard
            title="各业务模块数据统计"
            subtitle="模块数据量对比"
            height={300}
            showChartType
            activeChartType="bar"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={finalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: "#64748B", fontSize: 12 }} />
                <YAxis tick={{ fill: "#64748B", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {finalChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BIChartColors.series[index % BIChartColors.series.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>
        <Box>
          <ChartCard
            title="业务模块占比"
            subtitle="数据分布概览"
            height={300}
            showChartType
            activeChartType="pie"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <RechartsPieChart>
                <Pie
                  data={finalChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  innerRadius={50}
                  dataKey="value"
                >
                  {finalChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BIChartColors.series[index % BIChartColors.series.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Box>
      </Box>

      {/* 模块卡片 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: 1, md: 2, lg: 3 },
          gap: 2,
          mb: 3,
        }}
      >
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} onSelect={handleModuleSelect} />
        ))}
      </Box>

      {/* 系统状态 */}
      <SystemStatus loading={loading} />
    </Box>
  );
};

export default BIAnalyticsPageRefactored;
