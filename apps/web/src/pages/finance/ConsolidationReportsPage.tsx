import { Grid } from "@/components/Grid";
/**
 * 合并报表查看页面
 * 查看多公司合并后的财务报表
 */

import React, { useState, useMemo } from "react";
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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import {
  useConsolidationReports,
  useConsolidationReport,
  useConsolidationReportLines,
  useApproveConsolidationReport,
  usePublishConsolidationReport,
  useConsolidationScopes,
} from "@/hooks/useConsolidation";
import { EnhancedDataTable } from "@/components/EnhancedDataTable";
import { StatCardGroup } from "@/components/mui";
import type {
  ConsolidationReport,
  ConsolidationReportLine,
  ConsolidationReportType,
} from "@/types/consolidation";

// 报表类型配置
type ReportTypeConfig = {
  name: string;
  icon: React.ElementType;
  color: "primary" | "success" | "warning" | "error" | "secondary" | "info";
};
const REPORT_TYPE_CONFIG: Record<ConsolidationReportType, ReportTypeConfig> = {
  consolidated_balance_sheet: {
    name: "合并资产负债表",
    icon: Building2,
    color: "primary",
  },
  consolidated_income_statement: {
    name: "合并利润表",
    icon: TrendingUp,
    color: "success",
  },
  consolidated_cash_flow: {
    name: "合并现金流量表",
    icon: DollarSign,
    color: "secondary",
  },
  consolidated_statement_changes: {
    name: "合并所有者权益变动表",
    icon: BarChart3,
    color: "warning",
  },
  elimination_work_sheet: {
    name: "抵消工作底稿",
    icon: FileSpreadsheet,
    color: "info",
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GitMerge style={{ width: 16, height: 16, color: "#2563eb" }} />
          <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
            {row.getValue("report_no")}
          </Typography>
        </Box>
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
        let color = "#4b5563";

        switch (reportType) {
          case "consolidated_balance_sheet":
            IconComponent = Building2;
            name = "合并资产负债表";
            color = "#2563eb";
            break;
          case "consolidated_income_statement":
            IconComponent = TrendingUp;
            name = "合并利润表";
            color = "#16a34a";
            break;
          case "consolidated_cash_flow":
            IconComponent = DollarSign;
            name = "合并现金流量表";
            color = "#9333ea";
            break;
          case "consolidated_statement_changes":
            IconComponent = BarChart3;
            name = "合并所有者权益变动表";
            color = "#ea580c";
            break;
          case "elimination_work_sheet":
            IconComponent = FileSpreadsheet;
            name = "抵消工作底稿";
            color = "#4b5563";
            break;
        }

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              fontWeight: 500,
              color,
            }}
          >
            <IconComponent style={{ width: 16, height: 16 }} />
            {name}
          </Box>
        );
      },
    },
    {
      id: "scope_name",
      header: "合并范围",
      accessorKey: "scope_name",
      cell: ({ row }) => (
        <Chip
          size="small"
          variant="outlined"
          label={row.getValue("scope_name")}
        />
      ),
    },
    {
      id: "period",
      header: "期间",
      accessorKey: "period",
      cell: ({ row }) => (
        <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
          {row.getValue("period")}
        </Typography>
      ),
    },
    {
      id: "company_count",
      header: "公司数",
      accessorKey: "company_count",
      cell: ({ row }) => (
        <Typography variant="body2">
          {row.getValue("company_count")}家
          {row.original.eliminated_company_count > 0 && (
            <Typography component="span" color="text.secondary">
              {" "}
              (抵消{row.original.eliminated_company_count}家)
            </Typography>
          )}
        </Typography>
      ),
    },
    {
      id: "total_assets",
      header: "资产总计",
      accessorKey: "total_assets",
      cell: ({ row }) => (
        <Typography
          variant="body2"
          sx={{ fontFamily: "monospace", textAlign: "right" }}
        >
          {row.original.total_assets
            ? `¥${row.original.total_assets.toLocaleString("zh-CN")}`
            : "-"}
        </Typography>
      ),
    },
    {
      id: "net_profit",
      header: "净利润",
      accessorKey: "net_profit",
      cell: ({ row }) => {
        const value =
          row.original.归属于母公司净利润 || row.original.net_profit;
        if (!value) return <Typography color="text.disabled">-</Typography>;
        const isPositive = value >= 0;
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              fontFamily: "monospace",
              justifyContent: "flex-end",
              color: isPositive ? "success.main" : "error.main",
            }}
          >
            {isPositive ? (
              <TrendingUp style={{ width: 16, height: 16 }} />
            ) : (
              <TrendingDown style={{ width: 16, height: 16 }} />
            )}
            ¥{Math.abs(value).toLocaleString("zh-CN")}
          </Box>
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
        return (
          <Chip
            size="small"
            label={config.label}
            sx={{
              bgcolor: config.color
                .split(" ")[0]
                .replace("bg-", "")
                .replace("-100", ".lighter"),
              color: config.color
                .split(" ")[1]
                .replace("text-", "")
                .replace("-800", ".main"),
            }}
          />
        );
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
        return (
          <Chip
            size="small"
            label={config.label}
            sx={{
              bgcolor: config.color
                .split(" ")[0]
                .replace("bg-", "")
                .replace("-100", ".lighter"),
              color: config.color
                .split(" ")[1]
                .replace("text-", "")
                .replace("-800", ".main"),
            }}
          />
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => handleViewReport(row.original)}
          >
            <Eye style={{ width: 16, height: 16 }} />
          </IconButton>
          {row.original.approval_status === "pending" &&
            row.original.status === "completed" && (
              <IconButton
                size="small"
                onClick={() => approveReport.mutate(row.original.id)}
              >
                <Check style={{ width: 16, height: 16, color: "#16a34a" }} />
              </IconButton>
            )}
          {row.original.approval_status === "approved" &&
            row.original.status === "completed" && (
              <IconButton
                size="small"
                onClick={() => publishReport.mutate(row.original.id)}
              >
                <Send style={{ width: 16, height: 16, color: "#2563eb" }} />
              </IconButton>
            )}
          <IconButton size="small">
            <Download style={{ width: 16, height: 16 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  // 报表汇总统计数据
  const reportStats = [
    {
      title: "合并资产负债表",
      value:
        reportsData?.items?.filter(
          (r) => r.report_type === "consolidated_balance_sheet",
        ).length || 0,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: "primary" as const,
      onClick: () =>
        setReportType("consolidated_balance_sheet" as ConsolidationReportType),
    },
    {
      title: "合并利润表",
      value:
        reportsData?.items?.filter(
          (r) => r.report_type === "consolidated_income_statement",
        ).length || 0,
      icon: <TrendingUp style={{ width: 24, height: 24 }} />,
      color: "success" as const,
      onClick: () =>
        setReportType(
          "consolidated_income_statement" as ConsolidationReportType,
        ),
    },
    {
      title: "合并现金流量表",
      value:
        reportsData?.items?.filter(
          (r) => r.report_type === "consolidated_cash_flow",
        ).length || 0,
      icon: <DollarSign style={{ width: 24, height: 24 }} />,
      color: "secondary" as const,
      onClick: () =>
        setReportType("consolidated_cash_flow" as ConsolidationReportType),
    },
    {
      title: "合并所有者权益变动表",
      value:
        reportsData?.items?.filter(
          (r) => r.report_type === "consolidated_statement_changes",
        ).length || 0,
      icon: <BarChart3 style={{ width: 24, height: 24 }} />,
      color: "warning" as const,
      onClick: () =>
        setReportType(
          "consolidated_statement_changes" as ConsolidationReportType,
        ),
    },
  ];

  return (
    <Box
      sx={{
        containerType: "inline-size",
        mx: "auto",
        p: 3,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* 页面标题 */}
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <GitMerge style={{ width: 24, height: 24, color: "#2563eb" }} />
            合并报表
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            查看多公司合并后的财务报表
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => navigate("/finance/consolidation/reports/generate")}
        >
          <Plus style={{ width: 16, height: 16, marginRight: 8 }} />
          生成合并报表
        </Button>
      </Stack>

      {/* 搜索筛选栏 */}
      <Card>
        <CardContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                合并范围
              </Typography>
              <FormControl size="small" fullWidth>
                <Select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  displayEmpty
                >
                  <MenuItem value="">全部范围</MenuItem>
                  {scopesData?.items?.map((scope) => (
                    <MenuItem key={scope.id} value={scope.id}>
                      {scope.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                报表类型
              </Typography>
              <FormControl size="small" fullWidth>
                <Select
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value as ConsolidationReportType)
                  }
                  displayEmpty
                >
                  <MenuItem value="">全部类型</MenuItem>
                  {Object.entries(REPORT_TYPE_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      {config.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                会计期间
              </Typography>
              <TextField
                size="small"
                type="month"
                fullWidth
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1, display: "block" }}
              >
                搜索
              </Typography>
              <Box sx={{ position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 16,
                    height: 16,
                    color: "#9ca3af",
                  }}
                />
                <TextField
                  size="small"
                  placeholder="报表编号..."
                  fullWidth
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  sx={{ "& .MuiOutlinedInput-root": { pl: 4 } }}
                />
              </Box>
            </Grid>
            <Grid
              size={{ xs: 12, md: 2.4 }}
              sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}
            >
              <Button variant="outlined" onClick={() => refetch()}>
                <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
                刷新
              </Button>
              <Button variant="outlined">
                <Download style={{ width: 16, height: 16, marginRight: 8 }} />
                导出
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 报表汇总卡片 */}
      <StatCardGroup stats={reportStats} loading={isLoading} />

      {/* 报表列表 */}
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FileSpreadsheet
                style={{ width: 20, height: 20, color: "#2563eb" }}
              />
              <Typography variant="subtitle1">合并报表列表</Typography>
            </Box>
          }
        />
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
        <Dialog
          open={showDetail}
          onClose={() => setShowDetail(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="h6">
                  {REPORT_TYPE_CONFIG[selectedReport.report_type]?.name ||
                    selectedReport.report_type}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedReport.scope_name} | {selectedReport.period}
                </Typography>
              </Box>
              <IconButton onClick={() => setShowDetail(false)}>
                <X style={{ width: 20, height: 20 }} />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {/* 汇总数据 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {selectedReport.total_assets && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        资产总计
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                      >
                        ¥{selectedReport.total_assets.toLocaleString("zh-CN")}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {selectedReport.total_liabilities && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        负债合计
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                      >
                        ¥
                        {selectedReport.total_liabilities.toLocaleString(
                          "zh-CN",
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {selectedReport.total_equity && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        所有者权益
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{ fontFamily: "monospace", fontWeight: "bold" }}
                      >
                        ¥{selectedReport.total_equity.toLocaleString("zh-CN")}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
              {selectedReport.net_profit && (
                <Grid size={{ xs: 12, md: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        净利润
                      </Typography>
                      <Typography
                        variant="h6"
                        sx={{
                          fontFamily: "monospace",
                          fontWeight: "bold",
                          color:
                            selectedReport.net_profit >= 0
                              ? "success.main"
                              : "error.main",
                        }}
                      >
                        ¥{selectedReport.net_profit.toLocaleString("zh-CN")}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>

            {/* 报表行项目 */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 200 }}>项目</TableCell>
                    <TableCell align="right">本期金额</TableCell>
                    <TableCell align="right">上期金额</TableCell>
                    <TableCell align="right">变动</TableCell>
                    <TableCell align="right">变动率</TableCell>
                  </TableRow>
                </TableHead>
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
                          sx={{
                            pl: `${line.item_level * 16 + 12}px`,
                          }}
                        >
                          {line.item_name}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {line.current_period.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: "monospace",
                            color: "text.secondary",
                          }}
                        >
                          {line.prior_period?.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }) || "-"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: "monospace",
                            color: change >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {change.toLocaleString("zh-CN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontFamily: "monospace",
                            color:
                              changeRate >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {changeRate.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button variant="outlined" onClick={() => setShowDetail(false)}>
              关闭
            </Button>
            <Button variant="outlined">
              <Download style={{ width: 16, height: 16, marginRight: 8 }} />
              导出Excel
            </Button>
            <Button variant="contained">
              <Download style={{ width: 16, height: 16, marginRight: 8 }} />
              导出PDF
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
