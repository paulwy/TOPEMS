import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
/**
 * 期初余额管理页面
 * 管理会计科目的期初余额设置
 */

import React, { useState, useMemo } from "react";
import {
  Plus,
  Download,
  Upload,
  RefreshCw,
  Calculator,
  FileText,
  AlertCircle,
  CheckCircle,
  DollarSign,
  BookOpen,
  Calendar,
  Search,
} from "lucide-react";
import {
  useOpeningBalances,
  useSetOpeningBalance,
  useCarryForwardOpeningBalance,
} from "@/hooks/useFinance";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type {
  Account,
  AccountOpeningBalance,
  AccountCategory,
} from "@/types/erp-finance";

// 科目类别配置
const CATEGORY_CONFIG: Record<
  AccountCategory,
  { label: string; color: "default" | "primary" | "secondary" | "success" | "error" | "info" | "warning" }
> = {
  asset: { label: "资产类", color: "primary" },
  liability: { label: "负债类", color: "error" },
  equity: { label: "权益类", color: "success" },
  cost: { label: "成本类", color: "warning" },
  expense: { label: "费用类", color: "info" },
  income: { label: "收入类", color: "default" },
};

// 余额方向配置
const BALANCE_DIRECTION_CONFIG = {
  debit: { label: "借方", color: "primary" },
  credit: { label: "贷方", color: "error" },
};

export default function OpeningBalancePage() {
  // 状态
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<
    AccountCategory | ""
  >("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editDebitBalance, setEditDebitBalance] = useState(0);
  const [editCreditBalance, setEditCreditBalance] = useState(0);
  const [showCarryForwardModal, setShowCarryForwardModal] = useState(false);
  const [carryForwardFrom, setCarryForwardFrom] = useState("");
  const [carryForwardTo, setCarryForwardTo] = useState("");

  // 模拟数据
  const [accounts] = useState<Account[]>([]);

  // 查询期初余额
  const {
    data: openingBalancesData,
    isLoading: openingLoading,
    refetch,
  } = useOpeningBalances({ period });

  // 设置期初余额
  const setOpeningBalance = useSetOpeningBalance();

  // 结转期初余额
  const carryForward = useCarryForwardOpeningBalance();

  // 将期初余额数据转换为map便于查找
  const openingBalanceMap = useMemo(() => {
    const map = new Map<string, AccountOpeningBalance>();
    openingBalancesData?.data?.forEach((ob) => {
      map.set(ob.account_id, ob);
    });
    return map;
  }, [openingBalancesData]);

  // 按类别筛选科目
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((account) => {
      if (selectedCategory && account.category !== selectedCategory)
        return false;
      if (
        searchKeyword &&
        !account.name.includes(searchKeyword) &&
        !account.code.includes(searchKeyword)
      )
        return false;
      return true;
    });
  }, [accounts, selectedCategory, searchKeyword]);

  // 计算合计
  const totals = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    openingBalancesData?.data?.forEach((ob) => {
      totalDebit += ob.debit_balance || 0;
      totalCredit += ob.credit_balance || 0;
    });
    return { totalDebit, totalCredit };
  }, [openingBalancesData]);

  // 处理编辑余额
  const handleEditBalance = (account: Account) => {
    const ob = openingBalanceMap.get(account.id);
    setEditingAccountId(account.id);
    setEditDebitBalance(ob?.debit_balance || 0);
    setEditCreditBalance(ob?.credit_balance || 0);
  };

  // 处理保存余额
  const handleSaveBalance = async () => {
    if (!editingAccountId) return;
    await setOpeningBalance.mutateAsync({
      accountId: editingAccountId,
      data: {
        debit_balance: editDebitBalance,
        credit_balance: editCreditBalance,
        period,
      },
    });
    setEditingAccountId(null);
    refetch();
  };

  // 处理取消编辑
  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditDebitBalance(0);
    setEditCreditBalance(0);
  };

  // 处理结转
  const handleCarryForward = async () => {
    if (!carryForwardFrom || !carryForwardTo) return;
    await carryForward.mutateAsync({
      from_period: carryForwardFrom,
      to_period: carryForwardTo,
    });
    setShowCarryForwardModal(false);
    setPeriod(carryForwardTo);
  };

  return (
    <Box sx={{ containerType: "inline-size", mx: "auto", p: 3 }}>
      {/* 页面标题 */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold", display: "flex", alignItems: "center", gap: 1 }}>
            <Calculator className="w-6 h-6 text-blue-600" />
            期初余额管理
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            设置会计科目的期初余额，用于新会计期间初始化
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" onClick={() => setShowCarryForwardModal(true)}>
            <Calendar className="w-4 h-4 mr-2" />
            结转余额
          </Button>
          <Button variant="outlined">
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button variant="outlined">
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
        </Box>
      </Box>

      {/* 筛选条件 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ pt: 3 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
            <TextField
              label="会计期间"
              type="month"
              size="small"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              LabelProps={{ shrink: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>科目类别</InputLabel>
              <Select
                value={selectedCategory}
                label="科目类别"
                onChange={(e) => setSelectedCategory(e.target.value as AccountCategory)}
              >
                <MenuItem value="">全部类别</MenuItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="搜索"
              size="small"
              placeholder="科目编码或名称..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, display: "flex" }}>
                    <Search className="w-4 h-4 text-gray-400" />
                  </Box>
                ),
              }}
            />
            <Button variant="outlined" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 期初余额汇总 */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2, mb: 3 }}>
        <Card sx={{ bgcolor: "primary.main", color: "white" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>借方合计</Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5, fontFamily: "monospace" }}>
                  ¥{totals.totalDebit.toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)" }}>
                <DollarSign className="w-6 h-6" />
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: "error.main", color: "white" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>贷方合计</Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5, fontFamily: "monospace" }}>
                  ¥{totals.totalCredit.toLocaleString("zh-CN", {
                    minimumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)" }}>
                <DollarSign className="w-6 h-6" />
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: totals.totalDebit - totals.totalCredit === 0 ? "success.main" : "warning.main", color: "white" }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>差额</Typography>
                <Typography variant="h5" sx={{ fontWeight: "bold", mt: 0.5, fontFamily: "monospace" }}>
                  ¥{Math.abs(
                    totals.totalDebit - totals.totalCredit,
                  ).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)" }}>
                {totals.totalDebit - totals.totalCredit === 0 ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 余额表格 */}
      <Card>
        <CardHeader>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FileText className="w-5 h-5 text-blue-600" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>科目期初余额</Typography>
          </Box>
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 120 }}>科目编码</TableCell>
                <TableCell>科目名称</TableCell>
                <TableCell sx={{ width: 100 }}>明细</TableCell>
                <TableCell align="right">期初余额（借/贷）</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAccounts.map((account) => {
                const ob = openingBalanceMap.get(account.id);
                return (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <Typography sx={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                          {account.code}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ fontWeight: "medium" }}>{account.name}</Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={CATEGORY_CONFIG[account.category]?.label || account.category}
                          color={CATEGORY_CONFIG[account.category]?.color || "default"}
                        />
                        <Typography
                          variant="body2"
                          sx={{ color: account.balance_direction === "debit" ? "primary.main" : "error.main" }}
                        >
                          {BALANCE_DIRECTION_CONFIG[account.balance_direction]?.label}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {account.has_children ? "明细科目" : "明细"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {account.has_children ? (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      ) : editingAccountId === account.id ? (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 100 }}
                            value={editDebitBalance}
                            onChange={(e) =>
                              setEditDebitBalance(parseFloat(e.target.value) || 0)
                            }
                            placeholder="借方"
                          />
                          <Typography variant="body2" color="text.secondary">/</Typography>
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 100 }}
                            value={editCreditBalance}
                            onChange={(e) =>
                              setEditCreditBalance(parseFloat(e.target.value) || 0)
                            }
                            placeholder="贷方"
                          />
                          <Button size="small" onClick={handleSaveBalance}>
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button size="small" variant="text" onClick={handleCancelEdit}>
                            取消
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, fontFamily: "monospace" }}>
                          <Typography sx={{ color: "primary.main" }}>
                            {ob?.debit_balance?.toLocaleString("zh-CN", {
                              minimumFractionDigits: 2,
                            }) || "0.00"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">/</Typography>
                          <Typography sx={{ color: "error.main" }}>
                            {ob?.credit_balance?.toLocaleString("zh-CN", {
                              minimumFractionDigits: 2,
                            }) || "0.00"}
                          </Typography>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleEditBalance(account)}
                          >
                            <Calculator className="w-4 h-4" />
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 结转余额Modal */}
      <Dialog open={showCarryForwardModal} onClose={() => setShowCarryForwardModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle>结转期初余额</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="从期间"
              type="month"
              size="small"
              value={carryForwardFrom}
              onChange={(e) => setCarryForwardFrom(e.target.value)}
              LabelProps={{ shrink: true }}
            />
            <TextField
              label="到期间"
              type="month"
              size="small"
              value={carryForwardTo}
              onChange={(e) => setCarryForwardTo(e.target.value)}
              LabelProps={{ shrink: true }}
            />
            <Box sx={{ bgcolor: "warning.50", border: 1, borderColor: "warning.main", borderRadius: 1, p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <AlertCircle className="w-5 h-5 text-warning.main mt-0.5" />
                <Box>
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>注意事项</Typography>
                  <ul style={{ margin: "8px 0 0 0", paddingLeft: 16, fontSize: "0.875rem", color: "warning.dark" }}>
                    <li>结转会将源期间的期末余额作为目标期间的期初余额</li>
                    <li>目标期间原有的期初余额将被覆盖</li>
                    <li>请确认后再操作</li>
                  </ul>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setShowCarryForwardModal(false)}>
            取消
          </Button>
          <Button variant="contained" onClick={handleCarryForward}>确认结转</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
