import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
} from "lucide-react";
import { Box, Chip } from "@mui/material";
import { ListPageTemplate } from "../components/templates/ListPageTemplate";
import { PageHeader } from "../components/templates/PageHeader";
import { FilterBar, FilterConfig } from "../components/mui/FilterBar";
import ExportButton from "../components/ExportButton";

interface ComparisonRow {
  id: string;
  comparisonItem: string;
  indicatorA: number;
  indicatorB: number;
  difference: number;
  changeRate: number;
}

const mockComparisonData: ComparisonRow[] = [
  { id: "1", comparisonItem: "研发项目数", indicatorA: 120, indicatorB: 145, difference: 25, changeRate: 20.83 },
  { id: "2", comparisonItem: "实验室样品数", indicatorA: 2450, indicatorB: 2800, difference: 350, changeRate: 14.29 },
  { id: "3", comparisonItem: "质量合格率(%)", indicatorA: 97.8, indicatorB: 98.5, difference: 0.7, changeRate: 0.72 },
  { id: "4", comparisonItem: "安全风险数", indicatorA: 125, indicatorB: 98, difference: -27, changeRate: -21.6 },
  { id: "5", comparisonItem: "供应商数量", indicatorA: 280, indicatorB: 310, difference: 30, changeRate: 10.71 },
  { id: "6", comparisonItem: "生产批次", indicatorA: 450, indicatorB: 520, difference: 70, changeRate: 15.56 },
  { id: "7", comparisonItem: "检验完成率(%)", indicatorA: 92.5, indicatorB: 95.8, difference: 3.3, changeRate: 3.57 },
  { id: "8", comparisonItem: "成本支出(万元)", indicatorA: 850, indicatorB: 780, difference: -70, changeRate: -8.24 },
];

const themeColor = "#f59e0b";

const BIComparisonPageRefactored = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComparisonRow[]>([]);
  const [timeRange, setTimeRange] = useState<string>("2024H1");
  const [comparisonDimension, setComparisonDimension] = useState<string>("halfYear");

  useEffect(() => {
    setTimeout(() => {
      setData(mockComparisonData);
      setLoading(false);
    }, 500);
  }, []);

  const filters: FilterConfig[] = [
    {
      id: "timeRange",
      label: "时间范围",
      type: "select",
      value: timeRange,
      options: [
        { label: "2024上半年", value: "2024H1" },
        { label: "2024下半年", value: "2024H2" },
        { label: "2023年", value: "2023" },
      ],
      onChange: (value) => setTimeRange(value),
    },
    {
      id: "dimension",
      label: "对比维度",
      type: "select",
      value: comparisonDimension,
      options: [
        { label: "半年度对比", value: "halfYear" },
        { label: "季度对比", value: "quarterly" },
        { label: "月度对比", value: "monthly" },
        { label: "年度对比", value: "yearly" },
      ],
      onChange: (value) => setComparisonDimension(value),
    },
  ];

  const columns = [
    {
      id: "comparisonItem",
      label: "对比项",
      sortable: true,
    },
    {
      id: "indicatorA",
      label: "指标A",
      sortable: true,
      render: (row: ComparisonRow) => row.indicatorA.toLocaleString(),
    },
    {
      id: "indicatorB",
      label: "指标B",
      sortable: true,
      render: (row: ComparisonRow) => row.indicatorB.toLocaleString(),
    },
    {
      id: "difference",
      label: "差异",
      sortable: true,
      render: (row: ComparisonRow) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {row.difference > 0 ? (
            <TrendingUp size={14} style={{ color: "#ef4444" }} />
          ) : row.difference < 0 ? (
            <TrendingDown size={14} style={{ color: "#10b981" }} />
          ) : (
            <Minus size={14} />
          )}
          <Box component="span" sx={{ color: row.difference > 0 ? "error.main" : row.difference < 0 ? "success.main" : "grey.600" }}>
            {row.difference > 0 ? "+" : ""}
            {row.difference.toLocaleString()}
          </Box>
        </Box>
      ),
    },
    {
      id: "changeRate",
      label: "变化率",
      sortable: true,
      render: (row: ComparisonRow) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {row.changeRate > 0 ? (
            <TrendingUp size={14} style={{ color: "#ef4444" }} />
          ) : row.changeRate < 0 ? (
            <TrendingDown size={14} style={{ color: "#10b981" }} />
          ) : (
            <Minus size={14} />
          )}
          <Box component="span" sx={{ color: row.changeRate > 0 ? "error.main" : row.changeRate < 0 ? "success.main" : "grey.600" }}>
            {row.changeRate > 0 ? "+" : ""}
            {row.changeRate.toFixed(2)}%
          </Box>
        </Box>
      ),
    },
  ];

  const rowActions = [
    { label: "查看详情", icon: <Eye size={16} />, onClick: (row: ComparisonRow) => console.log("View", row) },
  ];

  const exportData = data.map((item) => ({
    对比项: item.comparisonItem,
    指标A: item.indicatorA,
    指标B: item.indicatorB,
    差异: item.difference,
    变化率: `${item.changeRate.toFixed(2)}%`,
  }));

  return (
    <Box sx={{ p: 3, bgcolor: "grey.50", minHeight: "100vh" }}>
      <PageHeader
        title="数据对比分析"
        subtitle="对比不同时间或维度的业务指标"
        backButton={{ href: "/bi/dashboard", onClick: () => navigate(-1) }}
        actions={[
          { label: "返回数据大屏", href: "/bi/dashboard", variant: "outlined" },
        ]}
        onRefresh={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 500);
        }}
      />

      <FilterBar filters={filters} />

      <ListPageTemplate
        title=""
        columns={columns}
        data={data}
        loading={loading}
        searchable
        searchPlaceholder="搜索对比项..."
        filters={filters}
        rowActions={rowActions}
        actions={[
          {
            label: "导出数据",
            icon: <Download size={16} />,
            onClick: () => console.log("Export"),
            variant: "outlined",
          },
        ]}
        emptyMessage="暂无对比数据"
        pagination={{
          page: 0,
          pageSize: 10,
          total: data.length,
          onPageChange: () => {},
          onPageSizeChange: () => {},
        }}
      />
    </Box>
  );
};

export default BIComparisonPageRefactored;
