import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Download,
  Search,
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../../store";
import { DataExport } from "@/components/common";
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
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";

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

const mockTaxData: TaxEntry[] = [
  {
    id: "1",
    tax_type: "增值税",
    declaration_period: "2024-01",
    taxable_income: 500000,
    tax_rate: 13,
    tax_amount: 65000,
    paid_amount: 65000,
    owed_amount: 0,
    status: "已申报",
  },
  {
    id: "2",
    tax_type: "企业所得税",
    declaration_period: "2024-01",
    taxable_income: 200000,
    tax_rate: 25,
    tax_amount: 50000,
    paid_amount: 50000,
    owed_amount: 0,
    status: "已申报",
  },
  {
    id: "3",
    tax_type: "个人所得税",
    declaration_period: "2024-01",
    taxable_income: 80000,
    tax_rate: 20,
    tax_amount: 16000,
    paid_amount: 16000,
    owed_amount: 0,
    status: "已申报",
  },
  {
    id: "4",
    tax_type: "增值税",
    declaration_period: "2024-02",
    taxable_income: 600000,
    tax_rate: 13,
    tax_amount: 78000,
    paid_amount: 50000,
    owed_amount: 28000,
    status: "待缴纳",
  },
  {
    id: "5",
    tax_type: "企业所得税",
    declaration_period: "2024-02",
    taxable_income: 180000,
    tax_rate: 25,
    tax_amount: 45000,
    paid_amount: 0,
    owed_amount: 45000,
    status: "待申报",
  },
  {
    id: "6",
    tax_type: "个人所得税",
    declaration_period: "2024-02",
    taxable_income: 90000,
    tax_rate: 20,
    tax_amount: 18000,
    paid_amount: 18000,
    owed_amount: 0,
    status: "已申报",
  },
  {
    id: "7",
    tax_type: "增值税",
    declaration_period: "2024-03",
    taxable_income: 450000,
    tax_rate: 13,
    tax_amount: 58500,
    paid_amount: 0,
    owed_amount: 58500,
    status: "待申报",
  },
  {
    id: "8",
    tax_type: "企业所得税",
    declaration_period: "2024-Q1",
    taxable_income: 580000,
    tax_rate: 25,
    tax_amount: 145000,
    paid_amount: 100000,
    owed_amount: 45000,
    status: "待缴纳",
  },
];

const FinanceTaxPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [taxData] = useState<TaxEntry[]>(mockTaxData);
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedTax, setSelectedTax] = useState<TaxEntry | null>(null);

  const filteredData = useMemo(() => {
    return taxData.filter((tax) => {
      if (filterType && tax.tax_type !== filterType) return false;
      if (filterStatus && tax.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !tax.tax_type.toLowerCase().includes(query) &&
          !tax.declaration_period.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [taxData, filterType, filterStatus, searchQuery]);

  const totalOwed = useMemo(
    () =>
      taxData
        .filter((t) => t.status === "待缴纳")
        .reduce((sum, t) => sum + t.owed_amount, 0),
    [taxData],
  );
  const totalPaid = useMemo(
    () => taxData.reduce((sum, t) => sum + t.paid_amount, 0),
    [taxData],
  );

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: "success" | "warning" | "error" | "default";
        icon: React.ReactNode;
      }
    > = {
      已申报: { color: "success", icon: <CheckCircle size={12} /> },
      已缴纳: { color: "success", icon: <CheckCircle size={12} /> },
      待申报: { color: "warning", icon: <Clock size={12} /> },
      待缴纳: { color: "error", icon: <AlertTriangle size={12} /> },
    };
    return configs[status] || { color: "default", icon: null };
  };

  const handleDeclare = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowDeclareModal(true);
  };

  const confirmDeclare = () => {
    if (!selectedTax) return;
    addNotification({
      title: "成功",
      message: "税务申报成功",
      type: "success",
    });
    setShowDeclareModal(false);
  };

  const handlePay = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowPayModal(true);
  };

  const confirmPay = () => {
    if (!selectedTax) return;
    addNotification({
      title: "成功",
      message: "税款缴纳成功",
      type: "success",
    });
    setShowPayModal(false);
  };

  const handleAnalysis = (tax: TaxEntry) => {
    setSelectedTax(tax);
    setShowAnalysisModal(true);
  };

  const handleExport = () => {
    addNotification({
      title: "导出成功",
      message: "税务数据已导出",
      type: "success",
    });
  };

  const columns = useMemo<ColumnDef<TaxEntry>[]>(
    () => [
      {
        accessorKey: "tax_type",
        header: "税种",
        cell: ({ row }) => (
          <Chip label={row.original.tax_type} size="small" color="primary" />
        ),
      },
      {
        accessorKey: "declaration_period",
        header: "申报期间",
        cell: ({ row }) => (
          <MuiBox sx={{ fontWeight: 500 }}>
            {row.original.declaration_period}
          </MuiBox>
        ),
      },
      {
        accessorKey: "taxable_income",
        header: "应税收入",
        cell: ({ row }) => (
          <MuiBox sx={{ fontFamily: "monospace", color: "text.secondary" }}>
            ¥{row.original.taxable_income.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        accessorKey: "tax_rate",
        header: "税率",
        cell: ({ row }) => (
          <Chip
            label={`${row.original.tax_rate}%`}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        accessorKey: "tax_amount",
        header: "应纳税额",
        cell: ({ row }) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: "primary.main",
              fontFamily: "monospace",
            }}
          >
            ¥{row.original.tax_amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        accessorKey: "paid_amount",
        header: "已缴税额",
        cell: ({ row }) => (
          <MuiBox sx={{ color: "success.main", fontFamily: "monospace" }}>
            ¥{row.original.paid_amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        accessorKey: "owed_amount",
        header: "欠税金额",
        cell: ({ row }) => {
          const owed = row.original.owed_amount;
          return (
            <MuiBox
              sx={{
                fontWeight: 600,
                color: owed > 0 ? "error.main" : "success.main",
                fontFamily: "monospace",
              }}
            >
              ¥{owed.toLocaleString()}
            </MuiBox>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const config = getStatusConfig(row.original.status);
          return (
            <Chip
              label={row.original.status}
              size="small"
              color={config.color}
              icon={config.icon as React.ReactElement}
            />
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <Stack direction="row" spacing={1}>
            {row.original.status === "待申报" && (
              <Tooltip title="税务申报">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleDeclare(row.original)}
                >
                  <FileText sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            {row.original.status === "待缴纳" && (
              <Tooltip title="税款缴纳">
                <IconButton
                  size="small"
                  color="warning"
                  onClick={() => handlePay(row.original)}
                >
                  <DollarSign sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="税务分析">
              <IconButton
                size="small"
                onClick={() => handleAnalysis(row.original)}
              >
                <TrendingUp sx={{ width: 16, height: 16 }} />
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
        label: "税种",
        key: "tax_type",
        type: "select" as const,
        options: [
          { value: "增值税", label: "增值税" },
          { value: "企业所得税", label: "企业所得税" },
          { value: "个人所得税", label: "个人所得税" },
          { value: "消费税", label: "消费税" },
        ],
        value: filterType,
        onChange: setFilterType,
      },
      {
        label: "申报状态",
        key: "status",
        type: "select" as const,
        options: [
          { value: "已申报", label: "已申报" },
          { value: "已缴纳", label: "已缴纳" },
          { value: "待申报", label: "待申报" },
          { value: "待缴纳", label: "待缴纳" },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterType, filterStatus],
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
                <ChevronLeft sx={{ width: 20, height: 20 }} />
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
                    <Receipt size={28} />
                  </MuiBox>
                  税务管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理税务申报、税款缴纳和税务分析
                </Typography>
              </MuiBox>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<Download sx={{ width: 20, height: 20 }} />}
                onClick={handleExport}
              >
                导出报表
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox
        sx={{ maxWidth: 1280, mx: "auto", px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        {/* Summary Cards */}
        <MuiBox
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                总应纳税额
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "primary.main" }}
              >
                ¥
                {taxData
                  .reduce((sum, t) => sum + t.tax_amount, 0)
                  .toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                已缴税额
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, color: "success.main" }}
              >
                ¥{totalPaid.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card
            sx={{ bgcolor: totalOwed > 0 ? "error.light" : "success.light" }}
          >
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                欠税金额
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: totalOwed > 0 ? "error.main" : "success.main",
                }}
              >
                ¥{totalOwed.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </MuiBox>

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
              placeholder="搜索税种、申报期间..."
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
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <EnhancedDataTable
              columns={columns}
              data={filteredData}
              searchPlaceholder="搜索税务..."
              searchKey="tax_type"
              enableAdvancedFilter={true}
              advancedFilters={advancedFilters}
              exportFileName="finance-tax"
            />
          </CardContent>
        </Card>
      </MuiBox>

      {/* Declare Modal */}
      <Dialog
        open={showDeclareModal}
        onClose={() => setShowDeclareModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>税务申报</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    税种
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    申报期间
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedTax.declaration_period}
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
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    应税收入
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ¥{selectedTax.taxable_income.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    税率
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedTax.tax_rate}%
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: "primary.light",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  申报税额
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "primary.main" }}
                >
                  ¥{selectedTax.tax_amount.toLocaleString()}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeclareModal(false)}>取消</Button>
          <Button variant="contained" color="success" onClick={confirmDeclare}>
            确认申报
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay Modal */}
      <Dialog
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>税款缴纳</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    税种
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    申报期间
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedTax.declaration_period}
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
                <MuiBox sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    已缴税额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    ¥{selectedTax.paid_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    欠税金额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "error.main" }}
                  >
                    ¥{selectedTax.owed_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: "warning.light",
                  borderRadius: 1,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  本次缴纳金额
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: "warning.main" }}
                >
                  ¥{selectedTax.owed_amount.toLocaleString()}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPayModal(false)}>取消</Button>
          <Button variant="contained" color="warning" onClick={confirmPay}>
            确认缴纳
          </Button>
        </DialogActions>
      </Dialog>

      {/* Analysis Modal */}
      <Dialog
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>税务分析</DialogTitle>
        <DialogContent>
          {selectedTax && (
            <Stack spacing={3} sx={{ pt: 2 }}>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    税种
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {selectedTax.tax_type}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography variant="body2" color="text.secondary">
                    申报期间
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedTax.declaration_period}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                <MuiBox
                  sx={{ p: 2, bgcolor: "primary.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    应税收入
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    ¥{selectedTax.taxable_income.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{ p: 2, bgcolor: "secondary.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    税率
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedTax.tax_rate}%
                  </Typography>
                </MuiBox>
                <MuiBox
                  sx={{ p: 2, bgcolor: "success.light", borderRadius: 1 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    已缴税额
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    ¥{selectedTax.paid_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  税务分析
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {selectedTax.owed_amount > 0
                    ? `该纳税人本期应缴纳税额 ¥${selectedTax.tax_amount.toLocaleString()}，已缴纳 ¥${selectedTax.paid_amount.toLocaleString()}，尚欠税款 ¥${selectedTax.owed_amount.toLocaleString()}，需要在规定期限内完成缴纳。`
                    : `该纳税人本期应缴纳税额 ¥${selectedTax.tax_amount.toLocaleString()}，已全部缴纳完毕，税务合规。`}
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

export default FinanceTaxPage;
