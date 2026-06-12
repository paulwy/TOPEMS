/**
 * 合并报表查看页面
 * 查看多公司合并后的财务报表
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Search,
  Download,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  BarChart3,
  GitMerge,
  Check,
  X,
  Eye,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useConsolidationReports,
  useConsolidationReport,
  useConsolidationReportLines,
  useApproveConsolidationReport,
  usePublishConsolidationReport,
  useConsolidationScopes,
} from "@/hooks/useConsolidation";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import type {
  ConsolidationReport,
  ConsolidationReportLine,
  ConsolidationReportType,
} from "@/types/consolidation";

// 报表类型配置
type ReportTypeConfig = {
  name: string;
  icon: React.ElementType;
  color: string;
};
const REPORT_TYPE_CONFIG: Record<ConsolidationReportType, ReportTypeConfig> = {
  consolidated_balance_sheet: {
    name: "合并资产负债表",
    icon: Building2,
    color: "text-blue-600",
  },
  consolidated_income_statement: {
    name: "合并利润表",
    icon: TrendingUp,
    color: "text-green-600",
  },
  consolidated_cash_flow: {
    name: "合并现金流量表",
    icon: DollarSign,
    color: "text-purple-600",
  },
  consolidated_statement_changes: {
    name: "合并所有者权益变动表",
    icon: BarChart3,
    color: "text-orange-600",
  },
  elimination_work_sheet: {
    name: "抵消工作底稿",
    icon: FileSpreadsheet,
    color: "text-gray-600",
  },
};

// 报表状态配置
const STATUS_CONFIG = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-800" },
  calculating: { label: "计算中", color: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  published: { label: "已发布", color: "bg-purple-100 text-purple-800" },
};

// 审批状态配置
const APPROVAL_STATUS_CONFIG = {
  pending: { label: "待审批", color: "bg-yellow-100 text-yellow-800" },
  approved: { label: "已审批", color: "bg-green-100 text-green-800" },
  rejected: { label: "已驳回", color: "bg-red-100 text-red-800" },
};

export default function ConsolidationReportsPage() {
  const navigate = useNavigate();

  // 状态
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedScope, setSelectedScope] = useState<string>("");
  const [reportType, setReportType] = useState<ConsolidationReportType | "">(
    "",
  );
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedReport, setSelectedReport] =
    useState<ConsolidationReport | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // 查询合并范围列表
  const { data: scopesData } = useConsolidationScopes();

  // 查询合并报表列表
  const {
    data: reportsData,
    isLoading,
    refetch,
  } = useConsolidationReports({
    scope_id: selectedScope || undefined,
    report_type: reportType || undefined,
    period_from: period,
    period_to: period,
  });

  // 查询选中报表详情
  const { data: reportDetail } = useConsolidationReportLines(
    selectedReport?.id || "",
  );

  // 审批报表
  const approveReport = useApproveConsolidationReport();

  // 发布报表
  const publishReport = usePublishConsolidationReport();

  // 处理查看报表详情
  const handleViewReport = (report: ConsolidationReport) => {
    setSelectedReport(report);
    setShowDetail(true);
  };

  // 报表列定义
  const columns: ColumnDef<ConsolidationReport>[] = [
    {
      id: "report_no",
      header: "报表编号",
      accessorKey: "report_no",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-blue-600" />
          <span className="font-mono text-sm">{row.getValue("report_no")}</span>
        </div>
      ),
    },
    {
      id: "report_type",
      header: "报表类型",
      accessorKey: "report_type",
      cell: ({ row }) => {
        const reportType = row.getValue<string>("report_type");
        let IconComponent: React.ElementType = FileText;
        let name = reportType;
        let color = "text-gray-600";

        switch (reportType) {
          case "consolidated_balance_sheet":
            IconComponent = Building2;
            name = "合并资产负债表";
            color = "text-blue-600";
            break;
          case "consolidated_income_statement":
            IconComponent = TrendingUp;
            name = "合并利润表";
            color = "text-green-600";
            break;
          case "consolidated_cash_flow":
            IconComponent = DollarSign;
            name = "合并现金流量表";
            color = "text-purple-600";
            break;
          case "consolidated_statement_changes":
            IconComponent = BarChart3;
            name = "合并所有者权益变动表";
            color = "text-orange-600";
            break;
          case "elimination_work_sheet":
            IconComponent = FileSpreadsheet;
            name = "抵消工作底稿";
            color = "text-gray-600";
            break;
        }

        return (
          <div className={`flex items-center gap-2 font-medium ${color}`}>
            <IconComponent className="w-4 h-4" />
            {name}
          </div>
        );
      },
    },
    {
      id: "scope_name",
      header: "合并范围",
      accessorKey: "scope_name",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("scope_name")}</Badge>
      ),
    },
    {
      id: "period",
      header: "期间",
      accessorKey: "period",
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("period")}</span>
      ),
    },
    {
      id: "company_count",
      header: "公司数",
      accessorKey: "company_count",
      cell: ({ row }) => (
        <span>
          {row.getValue("company_count")}家
          {row.original.eliminated_company_count > 0 && (
            <span className="text-gray-500">
              {" "}
              (抵消{row.original.eliminated_company_count}家)
            </span>
          )}
        </span>
      ),
    },
    {
      id: "total_assets",
      header: "资产总计",
      accessorKey: "total_assets",
      cell: ({ row }) => (
        <span className="font-mono text-right">
          {row.original.total_assets
            ? `¥${row.original.total_assets.toLocaleString("zh-CN")}`
            : "-"}
        </span>
      ),
    },
    {
      id: "net_profit",
      header: "净利润",
      accessorKey: "net_profit",
      cell: ({ row }) => {
        const value =
          row.original.归属于母公司净利润 || row.original.net_profit;
        if (!value) return <span className="text-gray-400">-</span>;
        const isPositive = value >= 0;
        return (
          <div
            className={`flex items-center gap-1 font-mono justify-end ${
              isPositive ? "text-green-600" : "text-red-600"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            ¥{Math.abs(value).toLocaleString("zh-CN")}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "状态",
      accessorKey: "status",
      cell: ({ row }) => {
        const status = row.getValue<string>("status");
        const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
          label: status,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "approval_status",
      header: "审批",
      accessorKey: "approval_status",
      cell: ({ row }) => {
        const approvalStatus = row.getValue<string>("approval_status");
        const config = APPROVAL_STATUS_CONFIG[
          approvalStatus as keyof typeof APPROVAL_STATUS_CONFIG
        ] || {
          label: approvalStatus,
          color: "bg-gray-100 text-gray-800",
        };
        return <Badge className={config.color}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewReport(row.original)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.original.approval_status === "pending" &&
            row.original.status === "completed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => approveReport.mutate(row.original.id)}
              >
                <Check className="w-4 h-4 text-green-600" />
              </Button>
            )}
          {row.original.approval_status === "approved" &&
            row.original.status === "completed" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => publishReport.mutate(row.original.id)}
              >
                <Send className="w-4 h-4 text-blue-600" />
              </Button>
            )}
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitMerge className="w-6 h-6 text-blue-600" />
            合并报表
          </h1>
          <p className="text-gray-500 mt-1">查看多公司合并后的财务报表</p>
        </div>
        <Button
          onClick={() => navigate("/finance/consolidation/reports/generate")}
        >
          <Plus className="w-4 h-4 mr-2" />
          生成合并报表
        </Button>
      </div>

      {/* 搜索筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                合并范围
              </label>
              <Select value={selectedScope} onValueChange={setSelectedScope}>
                <SelectTrigger>
                  <SelectValue placeholder="全部范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部范围</SelectItem>
                  {scopesData?.items?.map((scope) => (
                    <SelectItem key={scope.id} value={scope.id}>
                      {scope.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                报表类型
              </label>
              <Select
                value={reportType}
                onValueChange={(v) =>
                  setReportType(v as ConsolidationReportType)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部类型</SelectItem>
                  {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">
                会计期间
              </label>
              <Input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">搜索</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="报表编号..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                导出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 报表汇总卡片 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            key: "consolidated_balance_sheet",
            name: "合并资产负债表",
            icon: Building2,
            color: "text-blue-600",
          },
          {
            key: "consolidated_income_statement",
            name: "合并利润表",
            icon: TrendingUp,
            color: "text-green-600",
          },
          {
            key: "consolidated_cash_flow",
            name: "合并现金流量表",
            icon: DollarSign,
            color: "text-purple-600",
          },
          {
            key: "consolidated_statement_changes",
            name: "合并所有者权益变动表",
            icon: BarChart3,
            color: "text-orange-600",
          },
        ].map(({ key, name, icon: IconComponent, color }) => {
          const count =
            reportsData?.items?.filter((r) => r.report_type === key).length ||
            0;
          return (
            <Card
              key={key}
              className="cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => setReportType(key as ConsolidationReportType)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{name}</p>
                    <p className="text-2xl font-bold mt-1">{count}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100 ${color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 报表列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            合并报表列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedDataTable
            columns={columns}
            data={reportsData?.items || []}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      {/* 报表详情Modal */}
      {showDetail && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-bold">
                  {REPORT_TYPE_CONFIG[selectedReport.report_type]?.name ||
                    selectedReport.report_type}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {selectedReport.scope_name} | {selectedReport.period}
                </p>
              </div>
              <Button variant="ghost" onClick={() => setShowDetail(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
              {/* 汇总数据 */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {selectedReport.total_assets && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-500">资产总计</p>
                      <p className="text-xl font-bold font-mono">
                        ¥{selectedReport.total_assets.toLocaleString("zh-CN")}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {selectedReport.total_liabilities && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-500">负债合计</p>
                      <p className="text-xl font-bold font-mono">
                        ¥
                        {selectedReport.total_liabilities.toLocaleString(
                          "zh-CN",
                        )}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {selectedReport.total_equity && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-500">所有者权益</p>
                      <p className="text-xl font-bold font-mono">
                        ¥{selectedReport.total_equity.toLocaleString("zh-CN")}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {selectedReport.net_profit && (
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-500">净利润</p>
                      <p
                        className={`text-xl font-bold font-mono ${
                          selectedReport.net_profit >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ¥{selectedReport.net_profit.toLocaleString("zh-CN")}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* 报表行项目 */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">项目</TableHead>
                    <TableHead className="text-right">本期金额</TableHead>
                    <TableHead className="text-right">上期金额</TableHead>
                    <TableHead className="text-right">变动</TableHead>
                    <TableHead className="text-right">变动率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportDetail?.data?.map((line) => {
                    const change =
                      line.current_period - (line.prior_period || 0);
                    const changeRate =
                      line.prior_period && line.prior_period !== 0
                        ? (change / line.prior_period) * 100
                        : 0;
                    return (
                      <TableRow key={line.id}>
                        <TableCell
                          className={
                            line.item_level > 1
                              ? `pl-${line.item_level * 4}`
                              : ""
                          }
                          style={{
                            paddingLeft: `${line.item_level * 16 + 12}px`,
                          }}
                        >
                          {line.item_name}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.current_period.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-gray-500">
                          {line.prior_period?.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || "-"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            change >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {change.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            changeRate >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {changeRate.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowDetail(false)}>
                关闭
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                导出Excel
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                导出PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
