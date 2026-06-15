import React, { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  Loader2,
  CheckCircle,
  X,
  FileSpreadsheet,
  File,
  Columns,
  Calendar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, TextField, Select, MenuItem, Chip } from "@mui/material";
import type { ReportData, ReportTypeInfo } from "../api/report";
import { reportApi } from "../api/report";
import ReportBuilder from "./ReportBuilder";
import ReportViewer from "./ReportViewer";
import ExportModal from "./ExportModal";

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    report: false,
  });

  // Check if a specific service is up
  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  // Check service status
  const checkServiceStatus = async (
    serviceName: string,
    port: number,
    setStatus: (up: boolean) => void,
  ) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://localhost:${port}/health`, {
        signal: controller.signal,
        method: "GET",
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  // Check all services on mount and periodically
  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus("report", 8053, (up) =>
        setServiceStatuses((prev) => ({ ...prev, report: up })),
      );
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [filterModule, setFilterModule] = useState<string>("all");

  const mockReportTypes: ReportTypeInfo[] = [
    { type: "rs_project_progress", name: "研发项目进度报表", module: "RS" },
    { type: "rs_experiment_record", name: "试验记录报表", module: "RS" },
    { type: "lims_inspection_stats", name: "实验室检验统计", module: "LIMS" },
    { type: "lims_sample_summary", name: "样品汇总报表", module: "LIMS" },
    { type: "qms_quality_analysis", name: "质量分析报表", module: "QMS" },
    { type: "qms_defect_stats", name: "缺陷统计报表", module: "QMS" },
    { type: "ehs_safety_check", name: "安全检查报表", module: "EHS" },
    { type: "ehs_risk_assessment", name: "风险评估报表", module: "EHS" },
    { type: "srm_supplier_eval", name: "供应商评估报表", module: "SRM" },
    { type: "srm_purchase_stats", name: "采购统计报表", module: "SRM" },
    { type: "pdm_production_stats", name: "生产统计报表", module: "PDM" },
    { type: "pdm_process_summary", name: "工艺汇总报表", module: "PDM" },
  ];

  const mockReports: ReportData[] = [
    {
      id: "report-001",
      config: {
        report_type: "rs_project_progress",
        format: "excel",
        title: "研发项目进度报表",
        description: "展示所有研发项目的当前进度",
        columns: ["项目名称", "负责人", "开始日期", "结束日期", "进度", "状态"],
      },
      data: [
        {
          项目名称: "新型催化剂研发",
          负责人: "张工程师",
          开始日期: "2026-01-01",
          结束日期: "2026-12-31",
          进度: "45%",
          状态: "进行中",
        },
        {
          项目名称: "高分子材料改性研究",
          负责人: "李工程师",
          开始日期: "2026-03-01",
          结束日期: "2026-09-30",
          进度: "30%",
          状态: "进行中",
        },
        {
          项目名称: "生物降解塑料开发",
          负责人: "王工程师",
          开始日期: "2026-02-15",
          结束日期: "2026-11-30",
          进度: "65%",
          状态: "进行中",
        },
      ],
      row_count: 3,
      created_at: "2026-05-22T10:00:00Z",
    },
    {
      id: "report-002",
      config: {
        report_type: "lims_inspection_stats",
        format: "pdf",
        title: "实验室检验统计报表",
        description: "实验室检验数据统计分析",
        columns: ["样品名称", "检验日期", "检验项目", "结论"],
      },
      data: [
        {
          样品名称: "原料A-001",
          检验日期: "2026-05-20",
          检验项目: "成分分析",
          结论: "合格",
        },
        {
          样品名称: "原料B-002",
          检验日期: "2026-05-21",
          检验项目: "纯度检测",
          结论: "合格",
        },
      ],
      row_count: 2,
      created_at: "2026-05-22T09:30:00Z",
    },
    {
      id: "report-003",
      config: {
        report_type: "qms_quality_analysis",
        format: "excel",
        title: "质量分析报表",
        description: "产品质量数据分析",
        columns: ["产品编号", "批次", "合格率", "缺陷率"],
      },
      data: [
        {
          产品编号: "P-001",
          批次: "20260501",
          合格率: "98.5%",
          缺陷率: "1.5%",
        },
        {
          产品编号: "P-002",
          批次: "20260502",
          合格率: "99.2%",
          缺陷率: "0.8%",
        },
      ],
      row_count: 2,
      created_at: "2026-05-21T14:00:00Z",
    },
  ];

  const loadReports = () => {
    setReports(mockReports);
    setReportTypes(mockReportTypes);
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个报表吗？")) return;

    try {
      const response = await reportApi.deleteReport(id);
      if (response.success) {
        showNotification("success", "报表删除成功");
        loadReports();
      } else {
        showNotification("error", response.message || "删除失败");
      }
    } catch (err) {
      showNotification("error", "删除报表失败");
      console.error("删除报表失败:", err);
    }
  };

  const handleExport = (report: ReportData) => {
    setSelectedReport(report);
    setShowExportModal(true);
  };

  const handleView = (report: ReportData) => {
    setSelectedReport(report);
    setShowViewer(true);
  };

  const getModuleColor = (module: string) => {
    const colors: Record<string, "warning" | "info" | "success" | "error" | "secondary"> = {
      RS: "warning",
      LIMS: "info",
      QMS: "success",
      EHS: "error",
      SRM: "secondary",
      PDM: "info",
    };
    return colors[module] || "default";
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "excel":
        return <FileSpreadsheet sx={{ width: 16, height: 16 }} />;
      case "pdf":
        return <File sx={{ width: 16, height: 16 }} />;
      case "csv":
        return <FileText sx={{ width: 16, height: 16 }} />;
      default:
        return <FileText sx={{ width: 16, height: 16 }} />;
    }
  };

  const getModuleFromReportType = (reportType: string): string => {
    const type = reportTypes.find((t) => t.type === reportType);
    return type?.module || "RS";
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.config.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.config.report_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModule =
      filterModule === "all" ||
      getModuleFromReportType(r.config.report_type) === filterModule;
    return matchesSearch && matchesModule;
  });

  const uniqueModules = Array.from(new Set(reportTypes.map((t) => t.module)));

  if (loading) {
    return (
      <Box sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}>
        <Box sx={{ textAlign: "center" }}>
          <Loader2 sx={{ width: 48, height: 48, color: "primary.main", animation: "spin 1s linear infinite", mx: "auto", mb: 2 }} />
          <Typography sx={{ color: "grey.700" }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!isServiceUp("report")) {
    return (
      <Box sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      }}>
        <Box sx={{ textAlign: "center", maxWidth: 448, mx: "auto", p: 4, bgcolor: "background.paper", borderRadius: 3, boxShadow: 2 }}>
          <Box sx={{
            width: 64,
            height: 64,
            bgcolor: "primary.light",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 3,
          }}>
            <FileText sx={{ width: 32, height: 32, color: "primary.main" }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: "grey.900" }}>
            报表服务未启动
          </Typography>
          <Typography sx={{ mb: 3, color: "grey.700" }}>
            Report服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
          </Typography>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="contained"
            sx={{ px: 3, py: 1, borderRadius: 2 }}
          >
            返回首页
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      {/* Header */}
      <Box sx={{
        bgcolor: "background.paper",
        boxShadow: 1,
        borderBottom: 1,
        borderColor: "grey.200",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Button
                onClick={() => navigate("/dashboard")}
                sx={{ p: 1, color: "grey.600", "&:hover": { bgcolor: "grey.100" }, borderRadius: 2 }}
              >
                <X sx={{ width: 20, height: 20 }} />
              </Button>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                }}>
                  <FileText sx={{ width: 24, height: 24, color: "white" }} />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "grey.900" }}>报表中心</Typography>
                  <Typography variant="caption" sx={{ color: "grey.500" }}>Report Center</Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Button
                onClick={() => setShowBuilder(true)}
                variant="contained"
                startIcon={<Plus sx={{ width: 16, height: 16 }} />}
                sx={{ borderRadius: 2, textTransform: "none" }}
              >
                生成报表
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Notification */}
      {notification && (
        <Box
          sx={{
            position: "fixed",
            top: 80,
            right: 16,
            zIndex: 50,
            p: 2,
            borderRadius: 2,
            boxShadow: 2,
            bgcolor: notification.type === "success" ? "success.main" : "error.main",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {notification.type === "success" && <CheckCircle sx={{ width: 20, height: 20 }} />}
          <span>{notification.message}</span>
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: 3, py: 4 }}>
        {/* Search and Filter */}
        <Box sx={{ mb: 3, display: "flex", gap: 3 }}>
          <Box sx={{ flex: 1, position: "relative" }}>
            <Search sx={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              width: 20,
              height: 20,
              color: "grey.400"
            }} />
            <TextField
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索报表..."
              sx={{ pl: 5, "& .MuiOutlinedInput-root": { bgcolor: "background.paper", borderRadius: 2 } }}
            />
          </Box>
          <Select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            size="small"
            sx={{ minWidth: 120, bgcolor: "background.paper", borderRadius: 2 }}
          >
            <MenuItem value="all">全部模块</MenuItem>
            {uniqueModules.map((module) => (
              <MenuItem key={module} value={module}>
                {module}
              </MenuItem>
            ))}
          </Select>
        </Box>

        {/* Stats */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: 1, md: 4 }, gap: 3, mb: 4 }}>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 3, boxShadow: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 0.5 }}>报表总数</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "grey.900" }}>
                  {reports.length}
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, bgcolor: "primary.light", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText sx={{ width: 24, height: 24, color: "primary.main" }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 3, boxShadow: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 0.5 }}>RS 模块</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                  {
                    reports.filter(
                      (r) =>
                        getModuleFromReportType(r.config.report_type) === "RS",
                    ).length
                  }
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, bgcolor: "warning.light", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText sx={{ width: 24, height: 24, color: "warning.main" }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 3, boxShadow: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 0.5 }}>LIMS 模块</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "info.main" }}>
                  {
                    reports.filter(
                      (r) =>
                        getModuleFromReportType(r.config.report_type) ===
                        "LIMS",
                    ).length
                  }
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, bgcolor: "info.light", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText sx={{ width: 24, height: 24, color: "info.main" }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 3, p: 3, boxShadow: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography variant="body2" sx={{ color: "grey.600", mb: 0.5 }}>QMS 模块</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                  {
                    reports.filter(
                      (r) =>
                        getModuleFromReportType(r.config.report_type) === "QMS",
                    ).length
                  }
                </Typography>
              </Box>
              <Box sx={{ width: 48, height: 48, bgcolor: "success.light", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText sx={{ width: 24, height: 24, color: "success.main" }} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Report List */}
        <Box sx={{ bgcolor: "background.paper", borderRadius: 3, boxShadow: 1 }}>
          <Box sx={{ p: 3, borderBottom: 1, borderColor: "grey.200" }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>报表列表</Typography>
          </Box>
          <Box sx={{ "& > div:not(:last-child)": { borderBottom: 1, borderColor: "grey.200" } }}>
            {filteredReports.length === 0 ? (
              <Box sx={{ p: 6, textAlign: "center" }}>
                <FileText sx={{ width: 64, height: 64, color: "grey.300", mx: "auto", mb: 2 }} />
                <Typography sx={{ color: "grey.600" }}>暂无报表</Typography>
                <Button
                  onClick={() => setShowBuilder(true)}
                  variant="contained"
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  生成第一个报表
                </Button>
              </Box>
            ) : (
              filteredReports.map((report) => (
                <Box
                  key={report.id}
                  sx={{ p: 3, "&:hover": { bgcolor: "grey.50" } }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: "grey.900" }}>
                          {report.config.title}
                        </Typography>
                        <Chip
                          label={getModuleFromReportType(report.config.report_type)}
                          color={getModuleColor(getModuleFromReportType(report.config.report_type))}
                          size="small"
                          sx={{ borderRadius: "50%" }}
                        />
                        <Chip
                          label={`${report.row_count} 条数据`}
                          size="small"
                          sx={{ bgcolor: "grey.100", color: "grey.700", borderRadius: "50%" }}
                        />
                      </Box>
                      {report.config.description && (
                        <Typography sx={{ color: "grey.600", mb: 2 }}>
                          {report.config.description}
                        </Typography>
                      )}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 3, fontSize: 14, color: "grey.600" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Calendar sx={{ width: 16, height: 16 }} />
                          创建时间:{" "}
                          {new Date(report.created_at).toLocaleDateString(
                            "zh-CN",
                          )}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {getFormatIcon(report.config.format)}
                          <span style={{ marginLeft: 4 }}>
                            {report.config.format.toUpperCase()}
                          </span>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Columns sx={{ width: 16, height: 16 }} />
                          {report.config.columns.length} 列
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Button
                        onClick={() => handleView(report)}
                        size="small"
                        startIcon={<Eye sx={{ width: 16, height: 16 }} />}
                        sx={{ color: "info.main", "&:hover": { bgcolor: "info.light" }, borderRadius: 2 }}
                      >
                        查看
                      </Button>
                      <Button
                        onClick={() => handleExport(report)}
                        size="small"
                        startIcon={<Download sx={{ width: 16, height: 16 }} />}
                        sx={{ color: "success.main", "&:hover": { bgcolor: "success.light" }, borderRadius: 2 }}
                      >
                        导出
                      </Button>
                      <Button
                        onClick={() => handleDelete(report.id)}
                        size="small"
                        sx={{ color: "error.main", "&:hover": { bgcolor: "error.light" }, borderRadius: 2, p: 1, minWidth: "auto" }}
                      >
                        <Trash2 sx={{ width: 20, height: 20 }} />
                      </Button>
                    </Box>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>

      {/* Report Builder Modal */}
      {showBuilder && (
        <ReportBuilder
          onClose={() => setShowBuilder(false)}
          reportTypes={reportTypes}
          onSuccess={() => {
            loadReports();
            setShowBuilder(false);
            showNotification("success", "报表生成成功");
          }}
        />
      )}

      {/* Report Viewer Modal */}
      {showViewer && selectedReport && (
        <ReportViewer
          report={selectedReport}
          onClose={() => {
            setShowViewer(false);
            setSelectedReport(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && selectedReport && (
        <ExportModal
          report={selectedReport}
          onClose={() => {
            setShowExportModal(false);
            setSelectedReport(null);
          }}
        />
      )}
    </Box>
  );
};

export default ReportPage;
