import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
/**
 * 财务报表页面
 * 查看资产负债表、利润表、现金流量表
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Briefcase,
  PiggyBank,
} from "lucide-react";
import { StatCardGroup } from "@/components/mui";
import {
  useBalanceSheet,
  useIncomeStatement,
  useCashFlowStatement,
  useGenerateBalanceSheet,
  useGenerateIncomeStatement,
  useGenerateCashFlowStatement,
  useExportFinancialReport,
} from "@/hooks/useFinancialReport";
import { apiLogger } from "@/utils/logger";

// 报表类型配置
const REPORT_TYPE_CONFIG = {
  balance_sheet: {
    name: "资产负债表",
    icon: Building2,
    color: "blue.main",
    bgColor: "blue.100",
  },
  income_statement: {
    name: "利润表",
    icon: TrendingUp,
    color: "green.main",
    bgColor: "green.100",
  },
  cash_flow: {
    name: "现金流量表",
    icon: DollarSign,
    color: "purple.main",
    bgColor: "purple.100",
  },
};

type ColorType =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

export default function FinancialReportsPage() {
  const navigate = useNavigate();

  // 状态
  const [companyId, setCompanyId] = useState("");
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState<
    "balance_sheet" | "income_statement" | "cash_flow"
  >("balance_sheet");
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // 查询报表数据
  const balanceSheet = useBalanceSheet({ company_id: companyId, period });
  const incomeStatement = useIncomeStatement({ company_id: companyId, period });
  const cashFlowStatement = useCashFlowStatement({
    company_id: companyId,
    period,
  });

  // mutations
  const generateBalanceSheet = useGenerateBalanceSheet();
  const generateIncomeStatement = useGenerateIncomeStatement();
  const generateCashFlowStatement = useGenerateCashFlowStatement();
  const exportReport = useExportFinancialReport();

  // 当前报表数据
  const currentReport =
    reportType === "balance_sheet"
      ? balanceSheet.data?.data
      : reportType === "income_statement"
        ? incomeStatement.data?.data
        : cashFlowStatement.data?.data;

  const currentQuery =
    reportType === "balance_sheet"
      ? balanceSheet
      : reportType === "income_statement"
        ? incomeStatement
        : cashFlowStatement;

  // 统计卡片数据
  const statCards = useMemo(() => {
    if (!currentReport) return [];

    const getColor = (condition: boolean): ColorType =>
      condition ? "success" : "error";

    if (reportType === "balance_sheet") {
      return [
        {
          title: "总资产",
          value: formatCurrency(currentReport?.assets?.total),
          icon: <Wallet size={24} />,
          color: "primary" as ColorType,
        },
        {
          title: "总负债",
          value: formatCurrency(currentReport?.liabilities?.total),
          icon: <Briefcase size={24} />,
          color: "warning" as ColorType,
        },
        {
          title: "所有者权益",
          value: formatCurrency(currentReport?.equity?.total),
          icon: <PiggyBank size={24} />,
          color: "success" as ColorType,
        },
        {
          title: "流动资产",
          value: formatCurrency(currentReport?.assets?.current?.total),
          icon: <DollarSign size={24} />,
          color: "info" as ColorType,
        },
      ];
    } else if (reportType === "income_statement") {
      return [
        {
          title: "营业收入",
          value: formatCurrency(currentReport?.revenue?.total),
          icon: <TrendingUp size={24} />,
          color: "success" as ColorType,
        },
        {
          title: "营业成本",
          value: formatCurrency(currentReport?.cost_of_sales?.total),
          icon: <TrendingDown size={24} />,
          color: "error" as ColorType,
        },
        {
          title: "毛利润",
          value: formatCurrency(currentReport?.gross_profit),
          icon: <Wallet size={24} />,
          color: "primary" as ColorType,
        },
        {
          title: "净利润",
          value: formatCurrency(currentReport?.net_profit),
          icon: <PiggyBank size={24} />,
          color: getColor(currentReport?.net_profit >= 0),
        },
      ];
    } else {
      return [
        {
          title: "经营活动净流量",
          value: formatCurrency(currentReport?.operating?.net_flow),
          icon: <TrendingUp size={24} />,
          color: getColor(currentReport?.operating?.net_flow >= 0),
        },
        {
          title: "投资活动净流量",
          value: formatCurrency(currentReport?.investing?.net_flow),
          icon: <Briefcase size={24} />,
          color: getColor(currentReport?.investing?.net_flow >= 0),
        },
        {
          title: "筹资活动净流量",
          value: formatCurrency(currentReport?.financing?.net_flow),
          icon: <DollarSign size={24} />,
          color: getColor(currentReport?.financing?.net_flow >= 0),
        },
        {
          title: "现金净增加额",
          value: formatCurrency(currentReport?.cash_equivalent_change),
          icon: <Wallet size={24} />,
          color: getColor(currentReport?.cash_equivalent_change >= 0),
        },
      ];
    }
  }, [currentReport, reportType]);

  // 处理生成报表
  const handleGenerate = async () => {
    const generateFn =
      reportType === "balance_sheet"
        ? generateBalanceSheet
        : reportType === "income_statement"
          ? generateIncomeStatement
          : generateCashFlowStatement;

    try {
      await generateFn.mutateAsync({
        company_id: companyId,
        period,
      });
      setShowGenerateModal(false);
    } catch (error) {
      apiLogger.error("Generate report failed:", error);
    }
  };

  // 处理导出
  const handleExport = async (format: "pdf" | "xlsx") => {
    try {
      await exportReport.mutateAsync({
        report_type: reportType,
        company_id: companyId,
        period,
        format,
      });
    } catch (error) {
      apiLogger.error("Export report failed:", error);
    }
  };

  // 获取报表类型配置
  const typeConfig = REPORT_TYPE_CONFIG[reportType];

  return (
    <Box sx={{ mx: "auto", py: 3, px: 2 }}>
      {/* 页面标题 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: "bold" }}>
            财务报表
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            查看和生成资产负债表、利润表、现金流量表
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => currentQuery.refetch()}
            disabled={currentQuery.isFetching}
          >
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            刷新
          </Button>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
            >
              <MenuItem value="balance_sheet">资产负债表</MenuItem>
              <MenuItem value="income_statement">利润表</MenuItem>
              <MenuItem value="cash_flow">现金流量表</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* 统计卡片 */}
      {currentReport && (
        <Box sx={{ mb: 3 }}>
          <StatCardGroup stats={statCards} columns={4} />
        </Box>
      )}

      {/* 筛选条件 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                公司
              </Typography>
              <TextField
                placeholder="输入公司ID"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                size="small"
                fullWidth
              />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                会计期间
              </Typography>
              <TextField
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={!companyId}
            >
              <RefreshCw size={16} style={{ marginRight: 8 }} />
              生成报表
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 报表内容 */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: typeConfig.bgColor,
              }}
            >
              <typeConfig.icon size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {typeConfig.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {companyId ? `公司: ${companyId}` : "请选择公司"} | 期间:{" "}
                {period}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleExport("xlsx")}
            >
              <Download size={16} style={{ marginRight: 8 }} />
              导出Excel
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleExport("pdf")}
            >
              <Download size={16} style={{ marginRight: 8 }} />
              导出PDF
            </Button>
          </Box>
        </CardHeader>

        <CardContent>
          {currentQuery.isLoading ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <RefreshCw size={32} />
            </Box>
          ) : !currentReport ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 6,
              }}
            >
              <FileText size={48} />
              <Typography color="text.secondary" sx={{ mt: 2 }}>
                暂无报表数据
              </Typography>
              <Typography
                variant="body2"
                color="text.disabled"
                sx={{ mt: 0.5 }}
              >
                请输入公司ID和期间后点击"生成报表"
              </Typography>
            </Box>
          ) : (
            <ReportContent reportType={reportType} data={currentReport} />
          )}
        </CardContent>
      </Card>

      {/* 报表对比入口 */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 3,
        }}
      >
        <Card
          sx={{
            cursor: "pointer",
            "&:hover": { boxShadow: 6 },
            transition: "box-shadow 0.2s",
          }}
          onClick={() => navigate("/finance/reports/comparison")}
        >
          <CardContent
            sx={{ display: "flex", alignItems: "center", gap: 2, py: 3 }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "blue.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BarChart3 size={24} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                报表对比
              </Typography>
              <Typography variant="body2" color="text.secondary">
                多期间、多公司对比分析
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            cursor: "pointer",
            "&:hover": { boxShadow: 6 },
            transition: "box-shadow 0.2s",
          }}
          onClick={() => navigate("/finance/reports/trend")}
        >
          <CardContent
            sx={{ display: "flex", alignItems: "center", gap: 2, py: 3 }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "green.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TrendingUp size={24} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                趋势分析
              </Typography>
              <Typography variant="body2" color="text.secondary">
                报表项目趋势变化
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            cursor: "pointer",
            "&:hover": { boxShadow: 6 },
            transition: "box-shadow 0.2s",
          }}
          onClick={() => navigate("/finance/reports/consolidated")}
        >
          <CardContent
            sx={{ display: "flex", alignItems: "center", gap: 2, py: 3 }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "purple.100",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={24} />
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                合并报表
              </Typography>
              <Typography variant="body2" color="text.secondary">
                多公司报表合并
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

// 报表内容组件
function ReportContent({
  reportType,
  data,
}: {
  reportType: string;
  data: any;
}) {
  if (reportType === "balance_sheet") {
    return <BalanceSheetContent data={data} />;
  } else if (reportType === "income_statement") {
    return <IncomeStatementContent data={data} />;
  } else {
    return <CashFlowContent data={data} />;
  }
}

// 资产负债表内容
function BalanceSheetContent({ data }: { data: any }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* 资产 */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ArrowUpRight size={20} color="#2563eb" />
          资产
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography component="span">流动资产</Typography>
            <Typography component="span" sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.assets?.current?.total)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              pl: 2,
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              货币资金
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "货币资金",
                )?.amount,
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              pl: 2,
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              应收账款
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "应收账款",
                )?.amount,
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
              pl: 2,
            }}
          >
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              存货
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{ color: "grey.600" }}
            >
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "存货",
                )?.amount,
              )}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography component="span" sx={{ fontWeight: 500 }}>
              非流动资产
            </Typography>
            <Typography component="span" sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.assets?.non_current?.total)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              fontWeight: 700,
              fontSize: "1.125rem",
              bgcolor: "grey.50",
              px: 2,
              borderRadius: 1,
            }}
          >
            <Typography component="span" sx={{ fontWeight: 700 }}>
              资产合计
            </Typography>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              {formatCurrency(data?.assets?.total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 负债 */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <ArrowDownRight size={20} color="#dc2626" />
          负债
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography component="span">流动负债</Typography>
            <Typography component="span" sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.liabilities?.current?.total)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography component="span" sx={{ fontWeight: 500 }}>
              非流动负债
            </Typography>
            <Typography component="span" sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.liabilities?.non_current?.total)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1,
              fontWeight: 700,
              fontSize: "1.125rem",
              bgcolor: "grey.50",
              px: 2,
              borderRadius: 1,
            }}
          >
            <Typography component="span" sx={{ fontWeight: 700 }}>
              负债合计
            </Typography>
            <Typography component="span" sx={{ fontWeight: 700 }}>
              {formatCurrency(data?.liabilities?.total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 所有者权益 */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DollarSign size={20} color="#16a34a" />
          所有者权益
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            fontWeight: 700,
            fontSize: "1.125rem",
            bgcolor: "grey.50",
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component="span" sx={{ fontWeight: 700 }}>
            所有者权益合计
          </Typography>
          <Typography component="span" sx={{ fontWeight: 700 }}>
            {formatCurrency(data?.equity?.total)}
          </Typography>
        </Box>
      </Box>

      {/* 平衡检查 */}
      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: data?.balance_check ? "success.light" : "error.light",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography component="span" sx={{ fontWeight: 500 }}>
            {data?.balance_check ? "✓ 资产负债表平衡" : "✗ 资产负债表不平衡"}
          </Typography>
          <Typography component="span" sx={{ fontFamily: "monospace" }}>
            资产: {formatCurrency(data?.assets?.total)} = 负债+权益:{" "}
            {formatCurrency(data?.total_liabilities_equity)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// 利润表内容
function IncomeStatementContent({ data }: { data: any }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span" sx={{ fontWeight: 500 }}>
            营业收入
          </Typography>
          <Typography component="span" sx={{ fontWeight: 500 }}>
            {formatCurrency(data?.revenue?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            主营业务收入
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(data?.revenue?.main_revenue?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            其他业务收入
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(data?.revenue?.other_revenue?.total)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span" sx={{ fontWeight: 500 }}>
            营业成本
          </Typography>
          <Typography
            component="span"
            sx={{ fontWeight: 500, color: "error.main" }}
          >
            -{formatCurrency(data?.cost_of_sales?.total)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1.5,
          fontWeight: 700,
          fontSize: "1.125rem",
          bgcolor: "blue.50",
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component="span" sx={{ fontWeight: 700 }}>
          毛利润
        </Typography>
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            color: data?.gross_profit >= 0 ? "success.main" : "error.main",
          }}
        >
          {formatCurrency(data?.gross_profit)} ({data?.gross_margin?.toFixed(2)}
          %)
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span" sx={{ fontWeight: 500 }}>
            期间费用
          </Typography>
          <Typography
            component="span"
            sx={{ fontWeight: 500, color: "error.main" }}
          >
            -{formatCurrency(data?.operating_expenses?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            销售费用
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(data?.operating_expenses?.selling_expense?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            管理费用
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(
              data?.operating_expenses?.administrative_expense?.total,
            )}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            研发费用
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(data?.operating_expenses?.rd_expense?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
            pl: 2,
          }}
        >
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            财务费用
          </Typography>
          <Typography
            component="span"
            variant="body2"
            sx={{ color: "grey.600" }}
          >
            {formatCurrency(data?.operating_expenses?.financial_expense?.total)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1.5,
          fontWeight: 700,
          fontSize: "1.125rem",
          bgcolor: "green.50",
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component="span" sx={{ fontWeight: 700 }}>
          净利润
        </Typography>
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            color: data?.net_profit >= 0 ? "success.main" : "error.main",
          }}
        >
          {formatCurrency(data?.net_profit)} ({data?.net_margin?.toFixed(2)}%)
        </Typography>
      </Box>
    </Box>
  );
}

// 现金流量表内容
function CashFlowContent({ data }: { data: any }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <TrendingUp size={20} color="#16a34a" />
          经营活动现金流量
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流入</Typography>
          <Typography component="span" sx={{ color: "success.main" }}>
            {formatCurrency(data?.operating?.inflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流出</Typography>
          <Typography component="span" sx={{ color: "error.main" }}>
            -{formatCurrency(data?.operating?.outflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            fontWeight: 700,
            bgcolor: "green.50",
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component="span" sx={{ fontWeight: 700 }}>
            经营活动净流量
          </Typography>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              color:
                data?.operating?.net_flow >= 0 ? "success.main" : "error.main",
            }}
          >
            {formatCurrency(data?.operating?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <TrendingDown size={20} color="#2563eb" />
          投资活动现金流量
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流入</Typography>
          <Typography component="span" sx={{ color: "success.main" }}>
            {formatCurrency(data?.investing?.inflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流出</Typography>
          <Typography component="span" sx={{ color: "error.main" }}>
            -{formatCurrency(data?.investing?.outflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            fontWeight: 700,
            bgcolor: "blue.50",
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component="span" sx={{ fontWeight: 700 }}>
            投资活动净流量
          </Typography>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              color:
                data?.investing?.net_flow >= 0 ? "success.main" : "error.main",
            }}
          >
            {formatCurrency(data?.investing?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            fontSize: "1.125rem",
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <DollarSign size={20} color="#9333ea" />
          筹资活动现金流量
        </Typography>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流入</Typography>
          <Typography component="span" sx={{ color: "success.main" }}>
            {formatCurrency(data?.financing?.inflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography component="span">流出</Typography>
          <Typography component="span" sx={{ color: "error.main" }}>
            -{formatCurrency(data?.financing?.outflows?.total)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            py: 1,
            fontWeight: 700,
            bgcolor: "purple.50",
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component="span" sx={{ fontWeight: 700 }}>
            筹资活动净流量
          </Typography>
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              color:
                data?.financing?.net_flow >= 0 ? "success.main" : "error.main",
            }}
          >
            {formatCurrency(data?.financing?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1.5,
          fontWeight: 700,
          fontSize: "1.125rem",
          bgcolor: "grey.100",
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component="span" sx={{ fontWeight: 700 }}>
          现金及现金等价物净增加额
        </Typography>
        <Typography
          component="span"
          sx={{
            fontWeight: 700,
            color:
              data?.cash_equivalent_change >= 0 ? "success.main" : "error.main",
          }}
        >
          {formatCurrency(data?.cash_equivalent_change)}
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1,
          color: "grey.600",
        }}
      >
        <Typography component="span" sx={{ color: "grey.600" }}>
          期初现金
        </Typography>
        <Typography component="span" sx={{ color: "grey.600" }}>
          {formatCurrency(data?.beginning_cash)}
        </Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1,
          color: "grey.600",
        }}
      >
        <Typography component="span" sx={{ color: "grey.600" }}>
          期末现金
        </Typography>
        <Typography
          component="span"
          sx={{ color: "grey.600", fontWeight: 500 }}
        >
          {formatCurrency(data?.ending_cash)}
        </Typography>
      </Box>
    </Box>
  );
}

// 格式化金额
function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return "-";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(amount);
}
