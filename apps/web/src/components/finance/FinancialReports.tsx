/**
 * 财务报表组件
 * 包含资产负债表、利润表、现金流量表的展示组件
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/api/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
} from "@/types/erp-finance";

// ============================================
// 一、通用组件
// ============================================

interface ReportTableProps {
  items: {
    label: string;
    amount: number;
    isTotal?: boolean;
    isBold?: boolean;
    indent?: number;
  }[];
  totalLabel?: string;
  totalAmount?: number;
}

function ReportTable({ items, totalLabel, totalAmount }: ReportTableProps) {
  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <div
          key={index}
          className={`flex justify-between items-center py-1 ${
            item.isBold ? "font-semibold" : ""
          } ${item.isTotal ? "border-t pt-1 mt-1" : ""}`}
          style={{ paddingLeft: `${(item.indent || 0) * 16}px` }}
        >
          <span className={item.isTotal ? "font-semibold" : ""}>
            {item.label}
          </span>
          <span className={`font-mono ${item.isTotal ? "font-semibold" : ""}`}>
            {item.amount.toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      ))}
      {totalLabel && totalAmount !== undefined && (
        <div className="flex justify-between items-center py-2 border-t-2 border-black font-semibold">
          <span>{totalLabel}</span>
          <span className="font-mono">
            {totalAmount.toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// 二、资产负债表
// ============================================

interface BalanceSheetViewerProps {
  data?: BalanceSheet;
  loading?: boolean;
}

export function BalanceSheetViewer({ data, loading }: BalanceSheetViewerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>暂无资产负债表数据</p>
      </div>
    );
  }

  // 转换为图表数据
  const chartData = [
    { name: "流动资产", value: data.assets.current.total },
    { name: "非流动资产", value: data.assets.non_current.total },
    { name: "流动负债", value: data.liabilities.current.total },
    { name: "非流动负债", value: data.liabilities.non_current.total },
    { name: "实收资本", value: data.equity.paid_in.total },
    { name: "储备", value: data.equity.reserves.total },
    { name: "未分配利润", value: data.equity.retained_earnings.total },
  ];

  const COLORS = [
    "#10b981",
    "#059669",
    "#f59e0b",
    "#d97706",
    "#3b82f6",
    "#2563eb",
    "#6366f1",
  ];

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ¥{data.assets.total.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">资产总计</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ¥{data.liabilities.total.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">负债合计</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              ¥{data.equity.total.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">所有者权益合计</p>
            <Badge
              variant={data.balance_check ? "default" : "destructive"}
              className="mt-2"
            >
              {data.balance_check ? "平衡" : "不平衡"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">资产构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData.slice(0, 2)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {chartData.slice(0, 2).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    String((value as number).toLocaleString())
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">负债与权益构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  { name: "流动负债", value: data.liabilities.current.total },
                  {
                    name: "非流动负债",
                    value: data.liabilities.non_current.total,
                  },
                  { name: "所有者权益", value: data.equity.total },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) =>
                    String((value as number).toLocaleString())
                  }
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 详细表格 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 资产 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">资产</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">流动资产</h4>
                <ReportTable
                  items={data.assets.current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel="流动资产合计"
                  totalAmount={data.assets.current.total}
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">非流动资产</h4>
                <ReportTable
                  items={data.assets.non_current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel="非流动资产合计"
                  totalAmount={data.assets.non_current.total}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 负债和所有者权益 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">负债及所有者权益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">流动负债</h4>
                <ReportTable
                  items={data.liabilities.current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel="流动负债合计"
                  totalAmount={data.liabilities.current.total}
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">非流动负债</h4>
                <ReportTable
                  items={data.liabilities.non_current.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  }))}
                  totalLabel="非流动负债合计"
                  totalAmount={data.liabilities.non_current.total}
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">所有者权益</h4>
                <ReportTable
                  items={[
                    ...data.equity.paid_in.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                    ...data.equity.reserves.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                    ...data.equity.retained_earnings.items.map((item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    })),
                  ]}
                  totalLabel="所有者权益合计"
                  totalAmount={data.equity.total}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================
// 三、利润表
// ============================================

interface IncomeStatementViewerProps {
  data?: IncomeStatement;
  loading?: boolean;
  onExport?: () => void;
}

export function IncomeStatementViewer({
  data,
  loading,
}: IncomeStatementViewerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>暂无利润表数据</p>
      </div>
    );
  }

  // 图表数据
  const trendData = [
    { name: "营业收入", value: data.revenue.total },
    { name: "营业成本", value: data.cost_of_sales.total },
    { name: "毛利润", value: data.gross_profit },
    { name: "营业利润", value: data.operating_profit },
    { name: "净利润", value: data.net_profit },
  ];

  const costBreakdown = [
    { name: "销售费用", value: data.operating_expenses.selling_expense.total },
    {
      name: "管理费用",
      value: data.operating_expenses.administrative_expense.total,
    },
    { name: "研发费用", value: data.operating_expenses.rd_expense.total },
    {
      name: "财务费用",
      value: data.operating_expenses.financial_expense.total,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 关键指标 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              ¥{data.revenue.total.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">营业收入</p>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-green-600">
                毛利率 {(data.gross_margin * 100).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              ¥{data.operating_profit.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">营业利润</p>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-green-600">
                利润率 {(data.operating_margin * 100).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              ¥{data.total_profit.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">利润总额</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              ¥{data.net_profit.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">净利润</p>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-green-600">
                净利率 {(data.net_margin * 100).toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">利润构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) =>
                    String((value as number).toLocaleString())
                  }
                />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">费用构成</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {costBreakdown.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#f59e0b", "#d97706", "#3b82f6", "#6366f1"][index]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    String((value as number).toLocaleString())
                  }
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 详细表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">利润明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">一、营业收入</h4>
              <ReportTable
                items={[
                  ...data.revenue.main_revenue.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.revenue.other_revenue.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                ]}
                totalLabel="营业收入合计"
                totalAmount={data.revenue.total}
              />
            </div>

            <div>
              <h4 className="font-medium mb-2">二、营业成本</h4>
              <ReportTable
                items={[
                  ...data.cost_of_sales.main_cost.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                ]}
                totalLabel="营业成本合计"
                totalAmount={data.cost_of_sales.total}
              />
            </div>

            <div className="flex justify-between py-2 border-t-2">
              <span className="font-semibold">三、毛利润</span>
              <span className="font-semibold font-mono">
                {data.gross_profit.toLocaleString()} (
                {(data.gross_margin * 100).toFixed(2)}%)
              </span>
            </div>

            <div>
              <h4 className="font-medium mb-2">四、期间费用</h4>
              <ReportTable
                items={[
                  ...data.operating_expenses.selling_expense.items.map(
                    (item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    }),
                  ),
                  ...data.operating_expenses.administrative_expense.items.map(
                    (item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    }),
                  ),
                  ...data.operating_expenses.rd_expense.items.map((item) => ({
                    label: item.account_name,
                    amount: item.amount,
                    indent: 1,
                  })),
                  ...data.operating_expenses.financial_expense.items.map(
                    (item) => ({
                      label: item.account_name,
                      amount: item.amount,
                      indent: 1,
                    }),
                  ),
                ]}
                totalLabel="期间费用合计"
                totalAmount={data.operating_expenses.total}
              />
            </div>

            <div className="flex justify-between py-2 border-t-2">
              <span className="font-semibold">五、营业利润</span>
              <span className="font-semibold font-mono">
                {data.operating_profit.toLocaleString()} (
                {(data.operating_margin * 100).toFixed(2)}%)
              </span>
            </div>

            <div className="flex justify-between py-2 border-t">
              <span className="font-semibold">六、净利润</span>
              <span className="font-semibold font-mono text-green-600">
                {data.net_profit.toLocaleString()} (
                {(data.net_margin * 100).toFixed(2)}%)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 四、现金流量表
// ============================================

interface CashFlowStatementViewerProps {
  data?: CashFlowStatement;
  loading?: boolean;
  onExport?: () => void;
}

export function CashFlowStatementViewer({
  data,
  loading,
}: CashFlowStatementViewerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>暂无现金流量表数据</p>
      </div>
    );
  }

  // 图表数据
  const flowData = [
    { name: "经营活动", value: data.operating.net_flow },
    { name: "投资活动", value: data.investing.net_flow },
    { name: "筹资活动", value: data.financing.net_flow },
    { name: "净现金流", value: data.net_cash_flow },
  ];

  return (
    <div className="space-y-6">
      {/* 关键指标 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              ¥{data.operating.net_flow.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">经营活动现金流</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              ¥{data.investing.net_flow.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">投资活动现金流</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              ¥{data.financing.net_flow.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">筹资活动现金流</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div
              className={`text-2xl font-bold ${data.net_cash_flow >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              ¥{data.net_cash_flow.toLocaleString()}
            </div>
            <p className="text-sm text-muted-foreground">净现金流</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">现金流量构成</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={flowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  String((value as number).toLocaleString())
                }
              />
              <Bar dataKey="value">
                {flowData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value >= 0 ? "#10b981" : "#ef4444"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 详细表格 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 经营活动 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">经营活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流入</h4>
                {data.operating.inflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-green-600">
                      +{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流出</h4>
                {data.operating.outflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-red-600">
                      -{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t font-semibold">
                <span>净额</span>
                <span
                  className={`font-mono ${data.operating.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {data.operating.net_flow.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 投资活动 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">投资活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流入</h4>
                {data.investing.inflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-green-600">
                      +{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流出</h4>
                {data.investing.outflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-red-600">
                      -{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t font-semibold">
                <span>净额</span>
                <span
                  className={`font-mono ${data.investing.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {data.investing.net_flow.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 筹资活动 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">筹资活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流入</h4>
                {data.financing.inflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-green-600">
                      +{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm text-muted-foreground mb-1">现金流出</h4>
                {data.financing.outflows.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description}</span>
                    <span className="font-mono text-red-600">
                      -{item.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 border-t font-semibold">
                <span>净额</span>
                <span
                  className={`font-mono ${data.financing.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {data.financing.net_flow.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 现金变动汇总 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">现金变动汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {data.beginning_cash.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">期初现金</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {data.net_cash_flow.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">净现金流</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {data.ending_cash.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">期末现金</p>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${data.cash_equivalent_change >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {data.cash_equivalent_change >= 0 ? "+" : ""}
                {data.cash_equivalent_change.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground">现金净增加额</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// 五、综合财务报表查看器
// ============================================

interface FinancialReportsViewerProps {
  companyId: string;
  period: string;
}

export function FinancialReportsViewer({
  companyId,
  period,
}: FinancialReportsViewerProps) {
  const [activeReport, setActiveReport] = useState<
    "balance" | "income" | "cash"
  >("balance");

  const { data: balanceSheet, isLoading: balanceLoading } = useQuery({
    queryKey: ["balance-sheet", companyId, period],
    queryFn: () => reportApi.getBalanceSheet({ company_id: companyId, period }),
    enabled: activeReport === "balance",
  });

  const { data: incomeStatement, isLoading: incomeLoading } = useQuery({
    queryKey: ["income-statement", companyId, period],
    queryFn: () =>
      reportApi.getIncomeStatement({ company_id: companyId, period }),
    enabled: activeReport === "income",
  });

  const { data: cashFlow, isLoading: cashLoading } = useQuery({
    queryKey: ["cash-flow", companyId, period],
    queryFn: () =>
      reportApi.getCashFlowStatement({ company_id: companyId, period }),
    enabled: activeReport === "cash",
  });

  const handleExport = () => {
    // TODO: 实现导出功能
    console.log("Export report");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs
          value={activeReport}
          onValueChange={(v) => setActiveReport(v as any)}
        >
          <TabsList>
            <TabsTrigger value="balance">资产负债表</TabsTrigger>
            <TabsTrigger value="income">利润表</TabsTrigger>
            <TabsTrigger value="cash">现金流量表</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          导出
        </Button>
      </div>

      <TabsContent value="balance" className="mt-0">
        <BalanceSheetViewer
          data={balanceSheet?.data}
          loading={balanceLoading}
        />
      </TabsContent>

      <TabsContent value="income" className="mt-0">
        <IncomeStatementViewer
          data={incomeStatement?.data}
          loading={incomeLoading}
          onExport={handleExport}
        />
      </TabsContent>

      <TabsContent value="cash" className="mt-0">
        <CashFlowStatementViewer data={cashFlow?.data} loading={cashLoading} />
      </TabsContent>
    </div>
  );
}
