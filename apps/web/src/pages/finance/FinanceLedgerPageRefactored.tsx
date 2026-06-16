/**
 * FinanceLedgerPage 重构版本
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
  FileText,
  Download,
  Eye,
} from "lucide-react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Typography, Stack } from "@mui/material";
import { useAppStore } from "../../store";
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from "../../components/templates";
import { PageHeader } from "../../components/layout";

// ============ 类型定义 ============
interface LedgerEntry {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  opening_balance: number;
  debit_amount: number;
  credit_amount: number;
  closing_balance: number;
}

// ============ Mock 数据 ============
const mockLedgerData: LedgerEntry[] = [
  { id: "1", account_code: "1001", account_name: "库存现金", category: "资产类", opening_balance: 5000, debit_amount: 8000, credit_amount: 6000, closing_balance: 7000 },
  { id: "2", account_code: "1002", account_name: "银行存款", category: "资产类", opening_balance: 500000, debit_amount: 300000, credit_amount: 200000, closing_balance: 600000 },
  { id: "3", account_code: "1122", account_name: "应收账款", category: "资产类", opening_balance: 80000, debit_amount: 50000, credit_amount: 30000, closing_balance: 100000 },
  { id: "4", account_code: "1405", account_name: "原材料", category: "资产类", opening_balance: 200000, debit_amount: 100000, credit_amount: 80000, closing_balance: 220000 },
  { id: "5", account_code: "1601", account_name: "固定资产", category: "资产类", opening_balance: 1000000, debit_amount: 0, credit_amount: 50000, closing_balance: 950000 },
  { id: "6", account_code: "2001", account_name: "短期借款", category: "负债类", opening_balance: 200000, debit_amount: 100000, credit_amount: 150000, closing_balance: 250000 },
  { id: "7", account_code: "2201", account_name: "应付票据", category: "负债类", opening_balance: 50000, debit_amount: 20000, credit_amount: 30000, closing_balance: 60000 },
  { id: "8", account_code: "4001", account_name: "实收资本", category: "权益类", opening_balance: 800000, debit_amount: 0, credit_amount: 0, closing_balance: 800000 },
  { id: "9", account_code: "5001", account_name: "主营业务收入", category: "损益类", opening_balance: 0, debit_amount: 0, credit_amount: 500000, closing_balance: 500000 },
  { id: "10", account_code: "6401", account_name: "主营业务成本", category: "损益类", opening_balance: 0, debit_amount: 300000, credit_amount: 10000, closing_balance: 290000 },
];

// ============ 辅助函数 ============
const formatCurrency = (amount: number) =>
  `¥${amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;

// ============ 列定义 ============
const getLedgerColumns = (
  onView: (entry: LedgerEntry) => void,
): ColumnDef<LedgerEntry>[] => [
  {
    id: "account_code",
    label: "科目编码",
    render: (row) => (
      <Box sx={{ fontWeight: 600, color: "success.main" }}>{row.account_code}</Box>
    ),
  },
  {
    id: "account_name",
    label: "科目名称",
    render: (row) => <Box sx={{ fontWeight: 500 }}>{row.account_name}</Box>,
  },
  {
    id: "opening_balance",
    label: "期初余额",
    render: (row) => (
      <Box sx={{ fontFamily: "monospace" }}>{formatCurrency(row.opening_balance)}</Box>
    ),
  },
  {
    id: "debit_amount",
    label: "借方发生额",
    render: (row) => (
      <Box sx={{ color: "error.main", fontFamily: "monospace" }}>
        {formatCurrency(row.debit_amount)}
      </Box>
    ),
  },
  {
    id: "credit_amount",
    label: "贷方发生额",
    render: (row) => (
      <Box sx={{ color: "success.main", fontFamily: "monospace" }}>
        {formatCurrency(row.credit_amount)}
      </Box>
    ),
  },
  {
    id: "closing_balance",
    label: "期末余额",
    render: (row) => (
      <Box sx={{ fontWeight: 700, color: "primary.main", fontFamily: "monospace" }}>
        {formatCurrency(row.closing_balance)}
      </Box>
    ),
  },
];

// ============ 行操作 ============
const getRowActions = (
  onView: (entry: LedgerEntry) => void,
): RowAction<LedgerEntry>[] => [
  {
    label: "查看明细账",
    icon: <Eye style={{ width: 16, height: 16 }} />,
    onClick: onView,
  },
];

// ============ 筛选配置 ============
const filters: FilterConfig[] = [
  {
    id: "category",
    label: "科目类别",
    type: "select",
    options: [
      { value: "", label: "全部" },
      { value: "资产类", label: "资产类" },
      { value: "负债类", label: "负债类" },
      { value: "权益类", label: "权益类" },
      { value: "损益类", label: "损益类" },
      { value: "成本类", label: "成本类" },
    ],
  },
];

// ============ 组件 ============
const FinanceLedgerPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [ledgerData] = useState<LedgerEntry[]>(mockLedgerData);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  // 过滤后的数据
  const filteredData = useMemo(() => {
    return ledgerData.filter((entry) => {
      const matchesSearch =
        !searchText ||
        entry.account_code.toLowerCase().includes(searchText.toLowerCase()) ||
        entry.account_name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = !filterCategory || entry.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [ledgerData, searchText, filterCategory]);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (filters.category !== undefined) setFilterCategory(filters.category);
    },
    [],
  );

  // 处理查看
  const handleView = useCallback((entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  }, []);

  // 处理导出
  const handleExport = useCallback(() => {
    addNotification({
      type: "success",
      title: "导出成功",
      message: "总账数据已导出",
    });
  }, [addNotification]);

  return (
    <>
      <PageHeader
        title="总账管理"
        subtitle="管理会计科目总账，查看账户余额和发生额"
        backButton={{ onClick: () => navigate(-1) }}
        actions={[
          {
            label: "导出",
            icon: <Download style={{ width: 18, height: 18 }} />,
            onClick: handleExport,
            variant: "outlined",
            color: "success",
          },
        ]}
      />

      <Box sx={{ px: 3, pb: 3 }}>
        <ListPageTemplate
          title="总账列表"
          columns={getLedgerColumns(handleView)}
          data={filteredData}
          rowActions={getRowActions(handleView)}
          filters={filters}
          onFilterChange={handleFilterChange}
          searchable
          searchValue={searchText}
          onSearch={setSearchText}
          searchPlaceholder="搜索科目编码、名称..."
          emptyMessage="暂无总账数据"
        />
      </Box>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center" }}>
          <FileText sx={{ width: 20, height: 20, mr: 1, color: "#22c55e" }} />
          明细账 - {selectedEntry?.account_name}
        </DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">科目编码</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "success.main" }}>
                    {selectedEntry.account_code}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">科目名称</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{selectedEntry.account_name}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">科目类别</Typography>
                  <Chip label={selectedEntry.category} size="small" color="success" />
                </Box>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">期初余额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {formatCurrency(selectedEntry.opening_balance)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">借方发生额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
                    {formatCurrency(selectedEntry.debit_amount)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">贷方发生额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
                    {formatCurrency(selectedEntry.credit_amount)}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">期末余额</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {formatCurrency(selectedEntry.closing_balance)}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FinanceLedgerPageRefactored;
