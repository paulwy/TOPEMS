/**
 * FinanceTaxPage 重构版本
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
  Receipt,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
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
interface TaxEntry {
  id: string;
  tax_type: string;
  declaration_period: string;
  taxable_income: number;
  tax_rate: number;
  tax_amount: number;
  paid_amount: number;
  owed_amount: number;
  status: string;
}

// ============ Mock 数据 ============
const mockTaxData: TaxEntry[] = [
  { id: "1", tax_type: "增值税", declaration_period: "2024-01", taxable_income: 500000, tax_rate: 13, tax_amount: 65000, paid_amount: 65000, owed_amount: 0, status: "已申报" },
  { id: "2", tax_type: "企业所得税", declaration_period: "2024-01", taxable_income: 200000, tax_rate: 25, tax_amount: 50000, paid_amount: 50000, owed_amount: 0, status: "已申报" },
  { id: "3", tax_type: "个人所得税", declaration_period: "2024-01", taxable_income: 80000, tax_rate: 20, tax_amount: 16000, paid_amount: 16000, owed_amount: 0, status: "已申报" },
  { id: "4", tax_type: "增值税", declaration_period: "2024-02", taxable_income: 600000, tax_rate: 13, tax_amount: 78000, paid_amount: 50000, owed_amount: 28000, status: "待缴纳" },
  { id: "5", tax_type: "企业所得税", declaration_period: "2024-02", taxable_income: 180000, tax_rate: 25, tax_amount: 45000, paid_amount: 0, owed_amount: 45000, status: "待申报" },
  { id: "6", tax_type: "个人所得税", declaration_period: "2024-02", taxable_income: 90000, tax_rate: 20, tax_amount: 18000, paid_amount: 18000, owed_amount: 0, status: "已申报" },
  { id: "7", tax_type: "增值税", declaration_period: "2024-03", taxable_income: 450000, tax_rate: 13, tax_amount: 58500, paid_amount: 0, owed_amount: 58500, status: "待申报" },
  { id: "8", tax_type: "企业所得税", declaration_period: "2024-Q1", taxable_income: 580000, tax_rate: 25, tax_amount: 145000, paid_amount: 100000, owed_amount: 45000, status: "待缴纳" },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

const getStatusConfig = (status: string) => {
  const configs: Record<string, { color: "success" | "warning" | "error" | "default"; icon: React.ReactNode }> = {
    "已申报": { color: "success", icon: <CheckCircle size={12} /> },
    "已缴纳": { color: "success", icon: <CheckCircle size={12} /> },
    "待申报": { color: "warning", icon: <Clock size={12} /> },
    "待缴纳": { color: "error", icon: <AlertTriangle size={12} /> },
  };
  return configs[status] || { color: "default", icon: null };
};

// ============ 列定义 ============
const getTaxColumns = (
  onDeclare: (tax: TaxEntry) => void,
  onPay: (tax: TaxEntry) => void,
  onAnalysis: (tax: TaxEntry) => void,
): ColumnDef<TaxEntry>[] => [
  {
    id: "tax_type",
    header: "税种",
    accessor: "tax_type",
    render: (value) => <Chip label={value} size="small" color="primary" />,
  },
  {
    id: "declaration_period",
    header: "申报期间",
    accessor: "declaration_period",
    render: (value) => <Box sx={{ fontWeight: 500 }}>{value}</Box>,
  },
  {
    id: "taxable_income",
    header: "应税收入",
    accessor: "taxable_income",
    render: (value) => (
      <Box sx={{ fontFamily: "monospace", color: "text.secondary" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "tax_rate",
    header: "税率",
    accessor: "tax_rate",
    render: (value) => <Chip label={`${value}%`} size="small" variant="outlined" />,
  },
  {
    id: "tax_amount",
    header: "应纳税额",
    accessor: "tax_amount",
    render: (value) => (
      <Box sx={{ fontWeight: 700, color: "primary.main", fontFamily: "monospace" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "paid_amount",
    header: "已缴税额",
    accessor: "paid_amount",
    render: (value) => (
      <Box sx={{ color: "success.main", fontFamily: "monospace" }}>
        {formatCurrency(value)}
      </Box>
    ),
  },
  {
    id: "owed_amount",
    header: "欠税金额",
    accessor: "owed_amount",
    render: (value) => {
      const owed = value;
      return (
        <Box sx={{ 
          fontWeight: 600, 
          color: owed > 0 ? "error.main" : "success.main", 
          fontFamily: "monospace" 
        }}>
          {formatCurrency(owed)}
        </Box>
      );
    },
  },
  {
    id: "status",
    header: "状态",
    accessor: "status",
    render: (value) => {
      const config = getStatusConfig(value);
      return (
        <Chip 
          label={value} 
          size="small" 
          color={config.color}
          icon={config.icon as React.ReactElement}
        />
      );
    },
  },
];

// ============ 行操作 ============
const getRowActions = (
  onDeclare: (tax: TaxEntry) => void,
  onPay: (tax: TaxEntry) => void,
  onAnalysis: (tax: TaxEntry) => void,
): RowAction<TaxEntry>[] => [
  {
    label: "税务申报",
    icon: <FileText style={{ width: 16, height: 16 }} />,
    onClick: onDeclare,
    color: "success",
  },
  {
    label: "税款缴纳",
    icon: <DollarSign style={{ width: 16, height: 16 }} />,
    onClick: onPay,
    color: "warning",
  },
  {
    label: "税务分析",
    icon: <TrendingUp style={{ width: 16, height: 16 }} />,
    onClick: onAnalysis,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "search",
    label: "搜索",
    type: "text",
    placeholder: "搜索税种、申报期间...",
  },
  {
    id: "tax_type",
    label: "税种",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "增值税", label: "增值税" },
      { value: "企业所得税", label: "企业所得税" },
      { value: "个人所得税", label: "个人所得税" },
      { value: "消费税", label: "消费税" },
    ],
  },
  {
    id: "status",
    label: "申报状态",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "已申报", label: "已申报" },
      { value: "已缴纳", label: "已缴纳" },
      { value: "待申报", label: "待申报" },
      { value: "待缴纳", label: "待缴纳" },
    ],
  },
];

// ============ 组件 ============
const FinanceTaxPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [taxData] = useState<TaxEntry[]>(mockTaxData);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxEntry | null>(null);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return taxData.filter((tax) => {
      const matchesSearch =
        !searchText ||
        tax.tax_type.toLowerCase().includes(searchText.toLowerCase()) ||
        tax.declaration_period.toLowerCase().includes(searchText.toLowerCase());
      const matchesType = !filterType || tax.tax_type === filterType;
      const matchesStatus = !filterStatus || tax.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [taxData, searchText, filterType, filterStatus]);

  // 统计数据
  const stats = useMemo(() => {
    const totalTaxAmount = taxData.reduce((sum, t) => sum + t.tax_amount, 0);
    const totalPaid = taxData.reduce((sum, t) => sum + t.paid_amount, 0);
    const totalOwed = taxData.filter(t => t.status === "待缴纳").reduce((sum, t) => sum + t.owed_amount, 0);
    return { totalTaxAmount, totalPaid, totalOwed };
  }, [taxData]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filterId: string, value: any) => {
      if (filterId === "search") setSearchText(value);
      if (filterId === "tax_type") setFilterType(value);
      if (filterId === "status") setFilterStatus(value);
    },
    [],
  );

  // 处理申报
  const handleDeclare = useCallback((tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowDeclareModal(true);
  }, []);

  // 确认申报
  const confirmDeclare = useCallback(() => {
    if (!selectedTax) return;
    addNotification({ title: "成功", message: "税务申报成功", type: "success" });
    setShowDeclareModal(false);
  }, [selectedTax, addNotification]);

  // 处理缴纳
  const handlePay = useCallback((tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowPayModal(true);
  }, []);

  // 确认缴纳
  const confirmPay = useCallback(() => {
    if (!selectedTax) return;
    addNotification({ title: "成功", message: "税款缴纳成功", type: "success" });
    setShowPayModal(false);
  }, [selectedTax, addNotification]);

  // 处理分析
  const handleAnalysis = useCallback((tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowAnalysisModal(true);
  }, []);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({ title: "导出成功", message: "税务数据已导出", type: "success" });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="税务管理"
        subtitle="管理税务申报、税款缴纳和税务分析"
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
            title="总应纳税额"
            value={formatCurrency(stats.totalTaxAmount)}
            icon={<Receipt sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="blue"
          />
          <MetricCard
            title="已缴税额"
            value={formatCurrency(stats.totalPaid)}
            icon={<CheckCircle sx={{ width: 20, height: 20 }} />}
            trend={null}
            color="green"
          />
          <MetricCard
            title="欠税金额"
            value={formatCurrency(stats.totalOwed)}
            icon={<AlertTriangle sx={{ width: 20, height: 20 }} />}
            trend={null}
            color={stats.totalOwed > 0 ? "red" : "green"}
          />
        </Box>

        <ListPageTemplate
          columns={getTaxColumns(handleDeclare, handlePay, handleAnalysis)}
          data={filteredData}
          rowActions={getRowActions(handleDeclare, handlePay, handleAnalysis)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchPlaceholder="搜索税种、申报期间..."
          emptyMessage="暂无税务数据"
        />
      </Box>

      {/* 申报对话框 */}
      <Dialog open={showDeclareModal} onClose={() => setShowDeclareModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>税务申报</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">税种</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTax.tax_type}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">申报期间</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedTax.declaration_period}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">应税收入</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedTax.taxable_income)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税率</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTax.tax_rate}%</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">申报税额</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {formatCurrency(selectedTax.tax_amount)}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeclareModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmDeclare}>确认申报</Button>
        </DialogActions>
      </Dialog>

      {/* 缴纳对话框 */}
      <Dialog open={showPayModal} onClose={() => setShowPayModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>税款缴纳</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">税种</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTax.tax_type}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">申报期间</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedTax.declaration_period}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">已缴税额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>{formatCurrency(selectedTax.paid_amount)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">欠税金额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>{formatCurrency(selectedTax.owed_amount)}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "warning.light", borderRadius: 1, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">本次缴纳金额</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                  {formatCurrency(selectedTax.owed_amount)}
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPayModal(false)}>取消</Button>
          <Button variant="contained" color="warning" onClick={confirmPay}>确认缴纳</Button>
        </DialogActions>
      </Dialog>

      {/* 分析对话框 */}
      <Dialog open={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>税务分析</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">税种</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{selectedTax.tax_type}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">申报期间</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedTax.declaration_period}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">应税收入</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatCurrency(selectedTax.taxable_income)}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "secondary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">税率</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{selectedTax.tax_rate}%</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">已缴税额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>{formatCurrency(selectedTax.paid_amount)}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">税务分析</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedTax.owed_amount > 0 
                    ? `该纳税人本期应缴纳税额 ${formatCurrency(selectedTax.tax_amount)}，已缴纳 ${formatCurrency(selectedTax.paid_amount)}，尚欠税款 ${formatCurrency(selectedTax.owed_amount)}，需要在规定期限内完成缴纳。`
                    : `该纳税人本期应缴纳税额 ${formatCurrency(selectedTax.tax_amount)}，已全部缴纳完毕，税务合规。`
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

export default FinanceTaxPageRefactored;
