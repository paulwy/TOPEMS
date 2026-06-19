import React, { useState, useMemo } from "react";
import {
  FileText,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  Search,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";

import {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";

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

const mockLedgerData: LedgerEntry[] = [
  {
    id: "1",
    account_code: "1001",
    account_name: "库存现金",
    category: "资产类",
    opening_balance: 5000,
    debit_amount: 8000,
    credit_amount: 6000,
    closing_balance: 7000,
  },
  {
    id: "2",
    account_code: "1002",
    account_name: "银行存款",
    category: "资产类",
    opening_balance: 500000,
    debit_amount: 300000,
    credit_amount: 200000,
    closing_balance: 600000,
  },
  {
    id: "3",
    account_code: "1122",
    account_name: "应收账款",
    category: "资产类",
    opening_balance: 80000,
    debit_amount: 50000,
    credit_amount: 30000,
    closing_balance: 100000,
  },
  {
    id: "4",
    account_code: "1405",
    account_name: "原材料",
    category: "资产类",
    opening_balance: 200000,
    debit_amount: 100000,
    credit_amount: 80000,
    closing_balance: 220000,
  },
  {
    id: "5",
    account_code: "1601",
    account_name: "固定资产",
    category: "资产类",
    opening_balance: 1000000,
    debit_amount: 0,
    credit_amount: 50000,
    closing_balance: 950000,
  },
  {
    id: "6",
    account_code: "2001",
    account_name: "短期借款",
    category: "负债类",
    opening_balance: 200000,
    debit_amount: 100000,
    credit_amount: 150000,
    closing_balance: 250000,
  },
  {
    id: "7",
    account_code: "2201",
    account_name: "应付票据",
    category: "负债类",
    opening_balance: 50000,
    debit_amount: 20000,
    credit_amount: 30000,
    closing_balance: 60000,
  },
  {
    id: "8",
    account_code: "4001",
    account_name: "实收资本",
    category: "权益类",
    opening_balance: 800000,
    debit_amount: 0,
    credit_amount: 0,
    closing_balance: 800000,
  },
  {
    id: "9",
    account_code: "5001",
    account_name: "主营业务收入",
    category: "损益类",
    opening_balance: 0,
    debit_amount: 0,
    credit_amount: 500000,
    closing_balance: 500000,
  },
  {
    id: "10",
    account_code: "6401",
    account_name: "主营业务成本",
    category: "损益类",
    opening_balance: 0,
    debit_amount: 300000,
    credit_amount: 10000,
    closing_balance: 290000,
  },
];

const FinanceLedgerPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [ledgerData] = useState<LedgerEntry[]>(mockLedgerData);
  const [filterPeriod, setFilterPeriod] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const filteredData = useMemo(() => {
    return ledgerData.filter((entry) => {
      if (filterCategory && entry.category !== filterCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.account_code.toLowerCase().includes(query) &&
          !entry.account_name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerData, filterCategory, searchQuery]);

  const handleViewDetail = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const handleExport = () => {
    addNotification({
      title: "导出成功",
      message: "总账数据已导出",
      type: "success",
    });
  };

  const columns = useMemo<ColumnDef<LedgerEntry>[]>(
    () => [
      {
        accessorKey: "account_code",
        header: "科目编码",
        cell: ({ row }) => (
          <Box sx={{ fontWeight: 600, color: "success.main" }}>
            {row.original.account_code}
          </Box>
        ),
      },
      {
        accessorKey: "account_name",
        header: "科目名称",
        cell: ({ row }) => (
          <Box sx={{ fontWeight: 500 }}>{row.original.account_name}</Box>
        ),
      },
      {
        accessorKey: "opening_balance",
        header: "期初余额",
        cell: ({ row }) => (
          <Box sx={{ fontFamily: "monospace" }}>
            ¥{row.original.opening_balance.toLocaleString()}
          </Box>
        ),
      },
      {
        accessorKey: "debit_amount",
        header: "借方发生额",
        cell: ({ row }) => (
          <Box sx={{ color: "error.main", fontFamily: "monospace" }}>
            ¥{row.original.debit_amount.toLocaleString()}
          </Box>
        ),
      },
      {
        accessorKey: "credit_amount",
        header: "贷方发生额",
        cell: ({ row }) => (
          <Box sx={{ color: "success.main", fontFamily: "monospace" }}>
            ¥{row.original.credit_amount.toLocaleString()}
          </Box>
        ),
      },
      {
        accessorKey: "closing_balance",
        header: "期末余额",
        cell: ({ row }) => (
          <Box
            sx={{
              fontWeight: 700,
              color: "primary.main",
              fontFamily: "monospace",
            }}
          >
            ¥{row.original.closing_balance.toLocaleString()}
          </Box>
        ),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            <Tooltip title="查看明细账">
              <IconButton
                size="small"
                color="success"
                onClick={() => handleViewDetail(row.original)}
              >
                <Eye sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [],
  );

  const advancedFilters = useMemo(
    () => [
      {
        label: "科目类别",
        key: "category",
        type: "select" as const,
        options: [
          { value: "资产类", label: "资产类" },
          { value: "负债类", label: "负债类" },
          { value: "权益类", label: "权益类" },
          { value: "损益类", label: "损益类" },
          { value: "成本类", label: "成本类" },
        ],
        value: filterCategory,
        onChange: setFilterCategory,
      },
    ],
    [filterCategory],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: "sm",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box
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
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 700,
                  }}
                >
                  <FileText
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: "success.main",
                    }}
                  />
                  总账管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理会计科目总账，查看账户余额和发生额
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download sx={{ width: 20, height: 20 }} />}
                onClick={handleExport}
              >
                导出
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Stack
          sx={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={2} sx={{ flex: 1 }}>
            <TextField
              size="small"
              placeholder="搜索科目编码、名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ width: 16, height: 16, color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 280 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>会计期间</InputLabel>
              <Select
                value={filterPeriod}
                label="会计期间"
                onChange={(e) => setFilterPeriod(e.target.value)}
              >
                <MenuItem value="">全部期间</MenuItem>
                <MenuItem value="2024-01">2024年1月</MenuItem>
                <MenuItem value="2024-02">2024年2月</MenuItem>
                <MenuItem value="2024-03">2024年3月</MenuItem>
                <MenuItem value="2024-04">2024年4月</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="搜索科目..."
              searchKey="account_name"
              enableAdvancedFilter={true}
              advancedFilters={advancedFilters}
              exportFileName="finance-ledger"
            />
          </CardContent>
        </Card>
      </Box>

      {/* Detail Modal */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>明细账 - {selectedEntry?.account_name}</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    科目编码
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedEntry.account_code}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    科目名称
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedEntry.account_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    科目类别
                  </Typography>
                  <Chip
                    label={selectedEntry.category}
                    size="small"
                    color="success"
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    期初余额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    ¥{selectedEntry.opening_balance.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    借方发生额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "error.main" }}
                  >
                    ¥{selectedEntry.debit_amount.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    贷方发生额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    ¥{selectedEntry.credit_amount.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    期末余额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    ¥{selectedEntry.closing_balance.toLocaleString()}
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
    </Box>
  );
};

export default FinanceLedgerPage;
