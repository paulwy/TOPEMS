/**
 * FinanceCostPage 重构版本
 *
 * 重构要点：
 * 1. 使用 ListPageTemplate 替代手写的 Card + Table 布局
 * 2. 使用 ColumnDef 定义表格列
 * 3. 使用 FilterBar 定义筛选器
 * 4. 使用 PageHeader 统一页面头部
 * 5. 保持业务逻辑不变
 */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Download,
  TrendingDown,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Typography,
  Stack,
} from "@mui/material";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";
import { MetricCard } from "../../components/MetricCard";

// ============ 类型定义 ============
interface CostEntry {
  id: string;
  cost_center: string;
  cost_item: string;
  budget_amount: number;
  actual_cost: number;
  variance: number;
  execution_rate: number;
}

// ============ Mock 数据 ============
const mockCostData: CostEntry[] = [
  { id: "1", cost_center: "生产部", cost_item: "原材料成本", budget_amount: 500000, actual_cost: 480000, variance: 20000, execution_rate: 96 },
  { id: "2", cost_center: "生产部", cost_item: "人工成本", budget_amount: 300000, actual_cost: 320000, variance: -20000, execution_rate: 107 },
  { id: "3", cost_center: "研发部", cost_item: "研发费用", budget_amount: 200000, actual_cost: 180000, variance: 20000, execution_rate: 90 },
  { id: "4", cost_center: "销售部", cost_item: "营销费用", budget_amount: 150000, actual_cost: 165000, variance: -15000, execution_rate: 110 },
  { id: "5", cost_center: "管理部门", cost_item: "办公费用", budget_amount: 80000, actual_cost: 75000, variance: 5000, execution_rate: 94 },
  { id: "6", cost_center: "生产部", cost_item: "设备折旧", budget_amount: 100000, actual_cost: 100000, variance: 0, execution_rate: 100 },
  { id: "7", cost_center: "研发部", cost_item: "设备采购", budget_amount: 120000, actual_cost: 95000, variance: 25000, execution_rate: 79 },
  { id: "8", cost_center: "销售部", cost_item: "差旅费用", budget_amount: 60000, actual_cost: 72000, variance: -12000, execution_rate: 120 },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

// ============ 列定义 ============
const getCostColumns = (
  onAnalysis: (cost: CostEntry) => void,
): ColumnDef<CostEntry>[] => [
  {
    id: "cost_center",
    header: "成本中心",
    accessor: "cost_center",
    render: (value) => <Chip label={value} size="small" color="primary" />,
  },
  {
    id: "cost_item",
    header: "成本项目",
    accessor: "cost_item",
    render: (value) => <Box sx={{ fontWeight: 500 }}>{value}</Box>,
  },
  {
    id: "budget_amount",
    header: "预算金额",
    accessor: "budget_amount",
    render: (value) => (
      <Box sx={{ fontFamily: "monospace", color: "text.secondary" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "actual_cost",
    header: "实际成本",
    accessor: "actual_cost",
    render: (value) => (
      <Box sx={{ fontFamily: "monospace", fontWeight: 600 }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "variance",
    header: "差异",
    accessor: "variance",
    render: (value) => {
      const isPositive = value >= 0;
      return (
        <Box sx={{ 
          display: "flex", 
          alignItems: "center",
          color: isPositive ? "success.main" : "error.main",
          fontFamily: "monospace",
          fontWeight: 600 
        }}>
          {isPositive ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
          {formatCurrency(Math.abs(value))}
        </Box>
      );
    },
  },
  {
    id: "execution_rate",
    header: "执行率",
    accessor: "execution_rate",
    render: (value) => {
      const color = value <= 100 ? "success" : value <= 110 ? "warning" : "error";
      return (
        <Chip 
          label={`${value}%`} 
          size="small" 
          color={color}
          icon={value > 100 ? <AlertCircle size={12} /> : undefined}
        />
      );
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onAnalysis: (cost: CostEntry) => void,
): RowAction<CostEntry>[] => [
  {
    label: "成本分析",
    icon: <BarChart3 style={{ width: 16, height: 16 }} />,
    onClick: onAnalysis,
    color: "success",
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索成本中心、项目...",
  },
  {
    id: "cost_center",
    label: "成本中心",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "生产部", label: "生产部" },
      { value: "研发部", label: "研发部" },
      { value: "销售部", label: "销售部" },
      { value: "管理部门", label: "管理部门" },
    ],
  },
];

// ============ 组件 ============
const FinanceCostPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [costData] = useState<CostEntry[]>(mockCostData);
  const [filterCenter, setFilterCenter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<CostEntry | null>(null);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return costData.filter((cost) => {
      const matchesSearch =
        !searchText ||
        cost.cost_center.toLowerCase().includes(searchText.toLowerCase()) ||
        cost.cost_item.toLowerCase().includes(searchText.toLowerCase());
      const matchesCenter = !filterCenter || cost.cost_center === filterCenter;
      return matchesSearch && matchesCenter;
    });
  }, [costData, searchText, filterCenter]);

  // 统计数据
  const stats = useMemo(() => {
    const totalBudget = costData.reduce((sum, c) => sum + c.budget_amount, 0);
    const totalActual = costData.reduce((sum, c) => sum + c.actual_cost, 0);
    const totalVariance = totalBudget - totalActual;
    return { totalBudget, totalActual, totalVariance };
  }, [costData]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "cost_center") setFilterCenter(value);
    },
    [],
  );

  // 处理成本分析
  const handleAnalysis = useCallback((cost: CostEntry) => {
    setSelectedCost(cost);
    setShowAnalysisModal(true);
  }, []);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "成本数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="成本管理"
        subtitle="管理成本中心预算和实际成本，分析成本差异"
        showBack
        onBack={() => navigate(-1)}
        actions={
          <Button
            variant="outlined"
            startIcon={<Download style={{ width: 18, height: 18 }} />}
            onClick={handleExport}
            sx={{ borderColor: "#22c55e", color: "#22c55e" }}
          >
            导出报表
          </Button>
        }
      />

      <Box sx={{ px: 3, pb: 3 }}>
        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricCard
            title="总预算"
            value={formatCurrency(stats.totalBudget)}
            icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="blue"
          />
          <MetricCard
            title="实际总成本"
            value={formatCurrency(stats.totalActual)}
            icon={<TrendingUp sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="purple"
          />
          <MetricCard
            title="总差异"
            value={stats.totalVariance >= 0 ? formatCurrency(stats.totalVariance) : `-${formatCurrency(Math.abs(stats.totalVariance))}`}
            icon={<TrendingDown sx={{ width: 20, height: 20 }} />}
            trend={null}
            color={stats.totalVariance >= 0 ? "green" : "red"}
          />
        </Box>

        <ListPageTemplate
          columns={getCostColumns(handleAnalysis)}
          data={filteredData}
          rowActions={getRowActions(handleAnalysis)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchPlaceholder="搜索成本中心、项目..."
          emptyMessage="暂无成本数据"
        />
      </Box>

      {/* 分析对话框 */}
      <Dialog open={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>成本分析 - {selectedCost?.cost_item}</DialogTitle>
        <DialogContent>
          {selectedCost && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">成本中心</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedCost.cost_center}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">成本项目</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedCost.cost_item}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">预算金额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedCost.budget_amount)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "secondary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">实际成本</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedCost.actual_cost)}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: selectedCost.variance >= 0 ? "success.light" : "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">差异</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: selectedCost.variance >= 0 ? "success.main" : "error.main" }}>
                    {selectedCost.variance >= 0 ? "节省" : "超支"} {formatCurrency(Math.abs(selectedCost.variance))}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: selectedCost.execution_rate <= 100 ? "success.light" : "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">执行率</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedCost.execution_rate}%</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">分析结论</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedCost.variance >= 0 
                    ? `成本控制在预算范围内，节省了 ${formatCurrency(Math.abs(selectedCost.variance))}。执行率为 ${selectedCost.execution_rate}%。`
                    : `成本超出预算 ${formatCurrency(Math.abs(selectedCost.variance))}，超支 ${(selectedCost.execution_rate - 100)}%。需要加强成本管控。`
                  }
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysisModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceCostPageRefactored;
