import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  DollarSign,
  Wallet,
  TrendingDown as TrendingDownIcon,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataExport } from "@/components/common";
import { ListPageTemplate, StatCardGroup } from "@/components/mui";

import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";

interface CostEntry {
  id: string;
  cost_center: string;
  cost_item: string;
  budget_amount: number;
  actual_cost: number;
  variance: number;
  execution_rate: number;
}

const mockCostData: CostEntry[] = [
  {
    id: "1",
    cost_center: "生产部",
    cost_item: "原材料成本",
    budget_amount: 500000,
    actual_cost: 480000,
    variance: 20000,
    execution_rate: 96,
  },
  {
    id: "2",
    cost_center: "生产部",
    cost_item: "人工成本",
    budget_amount: 300000,
    actual_cost: 320000,
    variance: -20000,
    execution_rate: 107,
  },
  {
    id: "3",
    cost_center: "研发部",
    cost_item: "研发费用",
    budget_amount: 200000,
    actual_cost: 180000,
    variance: 20000,
    execution_rate: 90,
  },
  {
    id: "4",
    cost_center: "销售部",
    cost_item: "营销费用",
    budget_amount: 150000,
    actual_cost: 165000,
    variance: -15000,
    execution_rate: 110,
  },
  {
    id: "5",
    cost_center: "管理部门",
    cost_item: "办公费用",
    budget_amount: 80000,
    actual_cost: 75000,
    variance: 5000,
    execution_rate: 94,
  },
  {
    id: "6",
    cost_center: "生产部",
    cost_item: "设备折旧",
    budget_amount: 100000,
    actual_cost: 100000,
    variance: 0,
    execution_rate: 100,
  },
  {
    id: "7",
    cost_center: "研发部",
    cost_item: "设备采购",
    budget_amount: 120000,
    actual_cost: 95000,
    variance: 25000,
    execution_rate: 79,
  },
  {
    id: "8",
    cost_center: "销售部",
    cost_item: "差旅费用",
    budget_amount: 60000,
    actual_cost: 72000,
    variance: -12000,
    execution_rate: 120,
  },
];

const FinanceCostPage: React.FC = () => {
  const navigate = useNavigate();

  const [costData] = useState<CostEntry[]>(mockCostData);
  const [filterCenter, setFilterCenter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<CostEntry | null>(null);

  const filteredData = useMemo(() => {
    return costData.filter((cost) => {
      if (filterCenter && cost.cost_center !== filterCenter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !cost.cost_center.toLowerCase().includes(query) &&
          !cost.cost_item.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [costData, filterCenter, searchQuery]);

  const totalBudget = useMemo(
    () => costData.reduce((sum, c) => sum + c.budget_amount, 0),
    [costData],
  );
  const totalActual = useMemo(
    () => costData.reduce((sum, c) => sum + c.actual_cost, 0),
    [costData],
  );
  const totalVariance = totalBudget - totalActual;

  // 统计卡片数据
  const statCards = useMemo(() => {
    return [
      {
        title: "总预算",
        value: `¥${totalBudget.toLocaleString()}`,
        icon: <Wallet size={24} />,
        color: "primary" as const,
      },
      {
        title: "实际总成本",
        value: `¥${totalActual.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: "secondary" as const,
      },
      {
        title: "总差异",
        value: `${totalVariance >= 0 ? "¥" : "-¥"}${Math.abs(totalVariance).toLocaleString()}`,
        icon: <TrendingDownIcon size={24} />,
        color: totalVariance >= 0 ? ("success" as const) : ("error" as const),
      },
    ];
  }, [totalBudget, totalActual, totalVariance]);

  const handleAnalysis = (cost: CostEntry) => {
    setSelectedCost(cost);
    setShowAnalysisModal(true);
  };

  const handleExport = () => {
    console.log("导出成本数据");
  };

  const handleSearch = () => {
    // 搜索逻辑已在 filteredData 中实现
  };

  const handleReset = () => {
    setSearchQuery("");
    setFilterCenter("");
  };

  const columns = useMemo(
    () => [
      {
        id: "cost_center",
        label: "成本中心",
        render: (row: CostEntry) => (
          <Chip label={row.cost_center} size="small" color="primary" />
        ),
      },
      {
        id: "cost_item",
        label: "成本项目",
        render: (row: CostEntry) => (
          <MuiBox sx={{ fontWeight: 500 }}>{row.cost_item}</MuiBox>
        ),
      },
      {
        id: "budget_amount",
        label: "预算金额",
        render: (row: CostEntry) => (
          <MuiBox sx={{ fontFamily: "monospace", color: "text.secondary" }}>
            ¥{row.budget_amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: "actual_cost",
        label: "实际成本",
        render: (row: CostEntry) => (
          <MuiBox sx={{ fontFamily: "monospace", fontWeight: 600 }}>
            ¥{row.actual_cost.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: "variance",
        label: "差异",
        render: (row: CostEntry) => {
          const variance = row.variance;
          const isPositive = variance >= 0;
          return (
            <MuiBox
              sx={{
                display: "flex",
                alignItems: "center",
                color: isPositive ? "success.main" : "error.main",
                fontFamily: "monospace",
                fontWeight: 600,
              }}
            >
              {isPositive ? (
                <TrendingDown size={14} />
              ) : (
                <TrendingUp size={14} />
              )}
              ¥{Math.abs(variance).toLocaleString()}
            </MuiBox>
          );
        },
      },
      {
        id: "execution_rate",
        label: "执行率",
        render: (row: CostEntry) => {
          const rate = row.execution_rate;
          const color =
            rate <= 100 ? "success" : rate <= 110 ? "warning" : "error";
          return (
            <Chip
              label={`${rate}%`}
              size="small"
              color={color}
              icon={rate > 100 ? <AlertCircle size={12} /> : undefined}
            />
          );
        },
      },
    ],
    [],
  );

  const rowActions = useMemo(
    () => [
      {
        label: "成本分析",
        icon: <BarChart3 size={16} />,
        color: "success" as const,
        onClick: (row: CostEntry) => handleAnalysis(row),
      },
    ],
    [],
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: "cost_center",
        label: "成本中心",
        type: "select" as const,
        options: [
          { value: "生产部", label: "生产部" },
          { value: "研发部", label: "研发部" },
          { value: "销售部", label: "销售部" },
          { value: "管理部门", label: "管理部门" },
        ],
        value: filterCenter,
        onChange: setFilterCenter,
      },
    ],
    [filterCenter],
  );

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: "cost_center", title: "成本中心" },
      { key: "cost_item", title: "成本项目" },
      { key: "budget_amount", title: "预算金额" },
      { key: "actual_cost", title: "实际成本" },
      { key: "variance", title: "差异" },
      { key: "execution_rate", title: "执行率" },
    ],
    [],
  );

  return (
    <MuiBox sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <MuiBox
        sx={{
          bgcolor: "background.paper",
          boxShadow: "sm",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: "auto",
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Stack direction="row" sx={{ alignItems: "center" }} spacing={2}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft size={20} />
              </IconButton>
              <MuiBox>
                <Typography
                  variant="h5"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component="span"
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: "success.main",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <TrendingUp size={28} />
                  </MuiBox>
                  成本管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理成本中心预算和实际成本，分析成本差异
                </Typography>
              </MuiBox>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download size={20} />}
                onClick={handleExport}
              >
                导出报表
              </Button>
              <DataExport
                data={costData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName="成本数据"
                buttonText="数据导出"
              />
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        {/* 统计卡片 */}
        <StatCardGroup stats={statCards} columns={3} />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          searchable
          searchPlaceholder="搜索成本中心、项目..."
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={advancedFilters}
          filtersValue={{
            cost_center: filterCenter,
          }}
          onFilterChange={(filters) => {
            if (filters.cost_center !== undefined)
              setFilterCenter(filters.cost_center as string);
          }}
          actions={[
            { label: "搜索", variant: "outlined", onClick: handleSearch },
            { label: "重置", variant: "outlined", onClick: handleReset },
          ]}
          rowActions={rowActions}
        />
      </MuiBox>

      {/* Analysis Modal */}
      <Dialog
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>成本分析 - {selectedCost?.cost_item}</DialogTitle>
        <DialogContent>
          {selectedCost && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    成本中心
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedCost.cost_center}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    成本项目
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedCost.cost_item}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox
                  sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    预算金额
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ¥{selectedCost.budget_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{ p: 2, bgcolor: "secondary.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    实际成本
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ¥{selectedCost.actual_cost.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox
                  sx={{
                    p: 2,
                    bgcolor:
                      selectedCost.variance >= 0
                        ? "success.light"
                        : "error.light",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    差异
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color:
                        selectedCost.variance >= 0
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    {selectedCost.variance >= 0 ? "节省" : "超支"} ¥
                    {Math.abs(selectedCost.variance).toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{
                    p: 2,
                    bgcolor:
                      selectedCost.execution_rate <= 100
                        ? "success.light"
                        : "error.light",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    执行率
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedCost.execution_rate}%
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  分析结论
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedCost.variance >= 0
                    ? `成本控制在预算范围内，节省了 ¥${Math.abs(selectedCost.variance).toLocaleString()}。执行率为 ${selectedCost.execution_rate}%。`
                    : `成本超出预算 ¥${Math.abs(selectedCost.variance).toLocaleString()}，超支 ${selectedCost.execution_rate - 100}%。需要加强成本管控。`}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysisModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinanceCostPage;
