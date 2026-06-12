/**
 * 财务报表页面
 * 查看资产负债表、利润表、现金流量表
 */

import React, { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBalanceSheet,
  useIncomeStatement,
  useCashFlowStatement,
  useGenerateBalanceSheet,
  useGenerateIncomeStatement,
  useGenerateCashFlowStatement,
  useExportFinancialReport,
} from "@/hooks/useFinancialReport";

// 报表类型配置
const REPORT_TYPE_CONFIG = {
  balance_sheet: {
    name: "资产负债表",
    icon: Building2,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  income_statement: {
    name: "利润表",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  cash_flow: {
    name: "现金流量表",
    icon: DollarSign,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
};

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
      console.error("Generate report failed:", error);
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
      console.error("Export report failed:", error);
    }
  };

  // 获取报表类型配置
  const typeConfig = REPORT_TYPE_CONFIG[reportType];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">财务报表</h1>
          <p className="text-gray-500 mt-1">
            查看和生成资产负债表、利润表、现金流量表
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => currentQuery.refetch()}
            disabled={currentQuery.isFetching}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${currentQuery.isFetching ? "animate-spin" : ""}`}
            />
            刷新
          </Button>
          <Select
            value={reportType}
            onValueChange={(v) => setReportType(v as any)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance_sheet">资产负债表</SelectItem>
              <SelectItem value="income_statement">利润表</SelectItem>
              <SelectItem value="cash_flow">现金流量表</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">公司</label>
              <Input
                placeholder="输入公司ID"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">会计期间</label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={!companyId}>
              <RefreshCw className="w-4 h-4 mr-2" />
              生成报表
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 报表内容 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg ${typeConfig.bgColor} flex items-center justify-center`}
            >
              <typeConfig.icon className={`w-5 h-5 ${typeConfig.color}`} />
            </div>
            <div>
              <CardTitle>{typeConfig.name}</CardTitle>
              <p className="text-sm text-gray-500">
                {companyId ? `公司: ${companyId}` : "请选择公司"} | 期间:{" "}
                {period}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("xlsx")}
            >
              <Download className="w-4 h-4 mr-2" />
              导出Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("pdf")}
            >
              <Download className="w-4 h-4 mr-2" />
              导出PDF
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {currentQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !currentReport ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">暂无报表数据</p>
              <p className="text-sm text-gray-400 mt-1">
                请输入公司ID和期间后点击"生成报表"
              </p>
            </div>
          ) : (
            <ReportContent reportType={reportType} data={currentReport} />
          )}
        </CardContent>
      </Card>

      {/* 报表对比入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/finance/reports/comparison")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium">报表对比</h3>
              <p className="text-sm text-gray-500">多期间、多公司对比分析</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/finance/reports/trend")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">趋势分析</h3>
              <p className="text-sm text-gray-500">报表项目趋势变化</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate("/finance/reports/consolidated")}
        >
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium">合并报表</h3>
              <p className="text-sm text-gray-500">多公司报表合并</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
    <div className="space-y-6">
      {/* 资产 */}
      <div>
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <ArrowUpRight className="w-5 h-5 text-blue-600" />
          资产
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span>流动资产</span>
            <span className="font-medium">
              {formatCurrency(data?.assets?.current?.total)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b pl-4 text-sm text-gray-600">
            <span>货币资金</span>
            <span>
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "货币资金",
                )?.amount,
              )}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b pl-4 text-sm text-gray-600">
            <span>应收账款</span>
            <span>
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "应收账款",
                )?.amount,
              )}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b pl-4 text-sm text-gray-600">
            <span>存货</span>
            <span>
              {formatCurrency(
                data?.assets?.current?.items?.find(
                  (i: any) => i.account_name === "存货",
                )?.amount,
              )}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b font-medium">
            <span>非流动资产</span>
            <span>{formatCurrency(data?.assets?.non_current?.total)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg bg-gray-50 px-3 rounded">
            <span>资产合计</span>
            <span>{formatCurrency(data?.assets?.total)}</span>
          </div>
        </div>
      </div>

      {/* 负债 */}
      <div>
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <ArrowDownRight className="w-5 h-5 text-red-600" />
          负债
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span>流动负债</span>
            <span className="font-medium">
              {formatCurrency(data?.liabilities?.current?.total)}
            </span>
          </div>
          <div className="flex justify-between py-2 border-b font-medium">
            <span>非流动负债</span>
            <span>{formatCurrency(data?.liabilities?.non_current?.total)}</span>
          </div>
          <div className="flex justify-between py-2 font-bold text-lg bg-gray-50 px-3 rounded">
            <span>负债合计</span>
            <span>{formatCurrency(data?.liabilities?.total)}</span>
          </div>
        </div>
      </div>

      {/* 所有者权益 */}
      <div>
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          所有者权益
        </h3>
        <div className="flex justify-between py-2 font-bold text-lg bg-gray-50 px-3 rounded">
          <span>所有者权益合计</span>
          <span>{formatCurrency(data?.equity?.total)}</span>
        </div>
      </div>

      {/* 平衡检查 */}
      <div
        className={`p-4 rounded-lg ${data?.balance_check ? "bg-green-100" : "bg-red-100"}`}
      >
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {data?.balance_check ? "✓ 资产负债表平衡" : "✗ 资产负债表不平衡"}
          </span>
          <span className="font-mono">
            资产: {formatCurrency(data?.assets?.total)} = 负债+权益:{" "}
            {formatCurrency(data?.total_liabilities_equity)}
          </span>
        </div>
      </div>
    </div>
  );
}

// 利润表内容
function IncomeStatementContent({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">营业收入</span>
          <span className="font-medium">
            {formatCurrency(data?.revenue?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>主营业务收入</span>
          <span>{formatCurrency(data?.revenue?.main_revenue?.total)}</span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>其他业务收入</span>
          <span>{formatCurrency(data?.revenue?.other_revenue?.total)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">营业成本</span>
          <span className="font-medium text-red-600">
            -{formatCurrency(data?.cost_of_sales?.total)}
          </span>
        </div>
      </div>

      <div className="flex justify-between py-3 font-bold text-lg bg-blue-50 px-3 rounded">
        <span>毛利润</span>
        <span
          className={
            data?.gross_profit >= 0 ? "text-green-600" : "text-red-600"
          }
        >
          {formatCurrency(data?.gross_profit)} ({data?.gross_margin?.toFixed(2)}
          %)
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between py-2 border-b">
          <span className="font-medium">期间费用</span>
          <span className="font-medium text-red-600">
            -{formatCurrency(data?.operating_expenses?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>销售费用</span>
          <span>
            {formatCurrency(data?.operating_expenses?.selling_expense?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>管理费用</span>
          <span>
            {formatCurrency(
              data?.operating_expenses?.administrative_expense?.total,
            )}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>研发费用</span>
          <span>
            {formatCurrency(data?.operating_expenses?.rd_expense?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b text-sm text-gray-600 pl-4">
          <span>财务费用</span>
          <span>
            {formatCurrency(data?.operating_expenses?.financial_expense?.total)}
          </span>
        </div>
      </div>

      <div className="flex justify-between py-3 font-bold text-lg bg-green-50 px-3 rounded">
        <span>净利润</span>
        <span
          className={data?.net_profit >= 0 ? "text-green-600" : "text-red-600"}
        >
          {formatCurrency(data?.net_profit)} ({data?.net_margin?.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
}

// 现金流量表内容
function CashFlowContent({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          经营活动现金流量
        </h3>
        <div className="flex justify-between py-2 border-b">
          <span>流入</span>
          <span className="text-green-600">
            {formatCurrency(data?.operating?.inflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span>流出</span>
          <span className="text-red-600">
            -{formatCurrency(data?.operating?.outflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 font-bold bg-green-50 px-3 rounded">
          <span>经营活动净流量</span>
          <span
            className={
              data?.operating?.net_flow >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            {formatCurrency(data?.operating?.net_flow)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-blue-600" />
          投资活动现金流量
        </h3>
        <div className="flex justify-between py-2 border-b">
          <span>流入</span>
          <span className="text-green-600">
            {formatCurrency(data?.investing?.inflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span>流出</span>
          <span className="text-red-600">
            -{formatCurrency(data?.investing?.outflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 font-bold bg-blue-50 px-3 rounded">
          <span>投资活动净流量</span>
          <span
            className={
              data?.investing?.net_flow >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            {formatCurrency(data?.investing?.net_flow)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-purple-600" />
          筹资活动现金流量
        </h3>
        <div className="flex justify-between py-2 border-b">
          <span>流入</span>
          <span className="text-green-600">
            {formatCurrency(data?.financing?.inflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b">
          <span>流出</span>
          <span className="text-red-600">
            -{formatCurrency(data?.financing?.outflows?.total)}
          </span>
        </div>
        <div className="flex justify-between py-2 font-bold bg-purple-50 px-3 rounded">
          <span>筹资活动净流量</span>
          <span
            className={
              data?.financing?.net_flow >= 0 ? "text-green-600" : "text-red-600"
            }
          >
            {formatCurrency(data?.financing?.net_flow)}
          </span>
        </div>
      </div>

      <div className="flex justify-between py-3 font-bold text-lg bg-gray-100 px-3 rounded">
        <span>现金及现金等价物净增加额</span>
        <span
          className={
            data?.cash_equivalent_change >= 0
              ? "text-green-600"
              : "text-red-600"
          }
        >
          {formatCurrency(data?.cash_equivalent_change)}
        </span>
      </div>

      <div className="flex justify-between py-2 text-gray-600">
        <span>期初现金</span>
        <span>{formatCurrency(data?.beginning_cash)}</span>
      </div>
      <div className="flex justify-between py-2 text-gray-600">
        <span>期末现金</span>
        <span className="font-medium">{formatCurrency(data?.ending_cash)}</span>
      </div>
    </div>
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
