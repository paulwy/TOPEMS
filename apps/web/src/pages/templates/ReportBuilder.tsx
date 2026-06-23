import React, { useState, useMemo } from "react";
import {
  FileText,
  Calendar,
  Columns,
  FileSpreadsheet,
  File,
  FileJson,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Box, Typography, TextField, Checkbox, FormControlLabel,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import type {
  ReportTypeInfo,
  ReportType,
  ExportFormat,
  CreateReportRequest,
} from "@/api/report";
import { logger } from "@/utils/logger";

interface ReportBuilderProps {
  onClose: () => void;
  reportTypes: ReportTypeInfo[];
  onSuccess: () => void;
}

const REPORT_COLUMNS: Record<ReportType, string[]> = {
  rs_project_progress: [
    "项目名称",
    "负责人",
    "开始时间",
    "结束时间",
    "进度",
    "状态",
  ],
  rs_experiment_record: [
    "实验编号",
    "实验名称",
    "实验类型",
    "负责人",
    "开始时间",
    "结果",
    "状态",
  ],
  lims_inspection_stats: [
    "样本编号",
    "样本名称",
    "检测项目",
    "检测结果",
    "检测时间",
    "检测人",
  ],
  lims_sample_summary: [
    "样本编号",
    "样本类型",
    "接收时间",
    "检测数量",
    "合格数量",
    "合格率",
  ],
  qms_quality_analysis: [
    "问题编号",
    "问题类型",
    "严重程度",
    "发生时间",
    "责任人",
    "状态",
  ],
  qms_defect_stats: [
    "产品名称",
    "缺陷类型",
    "缺陷数量",
    "合格率",
    "检测批次",
    "负责人",
  ],
  ehs_safety_check: [
    "检查项",
    "检查日期",
    "检查人",
    "检查结果",
    "整改要求",
    "完成状态",
  ],
  ehs_risk_assessment: [
    "风险点",
    "风险等级",
    "风险类型",
    "管控措施",
    "责任人",
    "评估日期",
  ],
  srm_supplier_eval: [
    "供应商名称",
    "评估项目",
    "评估分数",
    "评估日期",
    "评估人",
    "等级",
  ],
  srm_purchase_stats: [
    "订单编号",
    "供应商",
    "采购物品",
    "采购数量",
    "订单金额",
    "订单状态",
  ],
  pdm_production_stats: [
    "产品名称",
    "批次号",
    "生产数量",
    "合格数量",
    "生产日期",
    "生产人",
  ],
  pdm_process_summary: [
    "工序名称",
    "工序编号",
    "标准时间",
    "实际时间",
    "效率",
    "负责人",
  ],
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  onClose,
  reportTypes,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reportType: "" as ReportType | "",
    format: "excel" as ExportFormat,
    startDate: "",
    endDate: "",
    selectedColumns: [] as string[],
  });
  const [_filters, _setFilters] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleReportTypeChange = (type: ReportType) => {
    const defaultColumns = REPORT_COLUMNS[type] || [];
    setFormData((prev) => ({
      ...prev,
      reportType: type,
      selectedColumns: defaultColumns,
    }));
    setErrors((prev) => ({ ...prev, reportType: "" }));
  };

  const handleColumnToggle = (column: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(column)
        ? prev.selectedColumns.filter((c) => c !== column)
        : [...prev.selectedColumns, column],
    }));
  };

  const handleSelectAllColumns = () => {
    if (formData.reportType) {
      const allColumns =
        REPORT_COLUMNS[formData.reportType as ReportType] || [];
      setFormData((prev) => ({ ...prev, selectedColumns: allColumns }));
    }
  };

  const handleDeselectAllColumns = () => {
    setFormData((prev) => ({ ...prev, selectedColumns: [] }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "请输入报表标题";
    }

    if (!formData.reportType) {
      newErrors.reportType = "请选择报表类型";
    }

    if (formData.selectedColumns.length === 0) {
      newErrors.selectedColumns = "请至少选择一列";
    }

    if (
      formData.startDate &&
      formData.endDate &&
      formData.startDate > formData.endDate
    ) {
      newErrors.dateRange = "开始日期不能晚于结束日期";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const request: CreateReportRequest = {
        config: {
          report_type: formData.reportType as ReportType,
          format: formData.format,
          title: formData.title,
          description: formData.description,
          columns: formData.selectedColumns,
          date_range:
            formData.startDate && formData.endDate
              ? { start_date: formData.startDate, end_date: formData.endDate }
              : undefined,
          filters: Object.keys(_filters).length > 0 ? _filters : undefined,
        },
      };

      logger.info("生成报表:", request);
      onSuccess();
    } catch (err) {
      logger.error("生成报表失败:", err);
      setErrors({ submit: "生成报表失败，请重试" });
    } finally {
      setSubmitting(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case "excel":
        return <FileSpreadsheet sx={{ width: 20, height: 20 }} />;
      case "pdf":
        return <File sx={{ width: 20, height: 20 }} />;
      case "csv":
        return <FileJson sx={{ width: 20, height: 20 }} />;
      default:
        return <FileText sx={{ width: 20, height: 20 }} />;
    }
  };

  const availableColumns = formData.reportType
    ? REPORT_COLUMNS[formData.reportType as ReportType] || []
    : [];

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <Box
        sx={{
          bgcolor: "background.paper",
          borderRadius: 2,
          width: "100%",
          maxWidth: 896,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            color: "white",
            p: 3,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <FileText sx={{ width: 24, height: 24 }} />
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                报表构建器
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              sx={{
                p: 1,
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                borderRadius: 2,
                minWidth: "auto",
              }}
            >
              <X sx={{ width: 24, height: 24 }} />
            </Button>
          </Box>
          <Typography sx={{ color: "primary.light", fontSize: 14, mt: 1 }}>
            创建自定义报表，灵活配置字段和时间范围
          </Typography>
        </Box>

        {/* Form */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Basic Info */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FileText
                sx={{ width: 20, height: 20, color: "primary.main", mr: 1 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                基本信息
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, mb: 1, color: "grey.700" }}
              >
                报表标题{" "}
                <Typography component="span" sx={{ color: "error.main" }}>
                  *
                </Typography>
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={formData.title}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, title: e.target.value }));
                  setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder="例如：2024年Q1项目进度报表"
                error={!!errors.title}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    "&.Mui-error": { borderColor: "error.main" },
                  },
                }}
              />
              {errors.title && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mt: 0.5,
                    color: "error.main",
                    fontSize: 14,
                  }}
                >
                  <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
                  {errors.title}
                </Box>
              )}
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{ fontWeight: 500, mb: 1, color: "grey.700" }}
              >
                报表描述
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="可选的报表描述信息"
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
              />
            </Box>
          </Box>

          {/* Report Type */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Columns
                sx={{ width: 20, height: 20, color: "secondary.main", mr: 1 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                报表类型{" "}
                <Typography component="span" sx={{ color: "error.main" }}>
                  *
                </Typography>
              </Typography>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(1, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                },
                gap: 2,
              }}
            >
              {reportTypes.map((type) => (
                <Box
                  key={type.type}
                  onClick={() => handleReportTypeChange(type.type)}
                  sx={{
                    p: 2,
                    border: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                    borderColor:
                      formData.reportType === type.type
                        ? "primary.main"
                        : "grey.200",
                    bgcolor:
                      formData.reportType === type.type
                        ? "primary.light"
                        : "transparent",
                    "&:hover": {
                      borderColor:
                        formData.reportType === type.type
                          ? "primary.main"
                          : "primary.light",
                    },
                  }}
                >
                  <Typography sx={{ fontWeight: 500, color: "grey.900" }}>
                    {type.name}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: "grey.500", mt: 0.5 }}
                  >
                    {type.module}
                  </Typography>
                </Box>
              ))}
            </Box>
            {errors.reportType && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: "error.main",
                  fontSize: 14,
                }}
              >
                <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
                {errors.reportType}
              </Box>
            )}
          </Box>

          {/* Date Range */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Calendar
                sx={{ width: 20, height: 20, color: "success.main", mr: 1 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                时间范围
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 2, gap: 2 }}>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, mb: 1, color: "grey.700" }}
                >
                  开始日期
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Box>
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, mb: 1, color: "grey.700" }}
                >
                  结束日期
                </Typography>
                <TextField
                  type="date"
                  fullWidth
                  size="small"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                />
              </Box>
            </Box>
            {errors.dateRange && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: "error.main",
                  fontSize: 14,
                }}
              >
                <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
                {errors.dateRange}
              </Box>
            )}
          </Box>

          {/* Column Selection */}
          {availableColumns.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Columns
                    sx={{ width: 20, height: 20, color: "warning.main", mr: 1 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    选择列{" "}
                    <Typography component="span" sx={{ color: "error.main" }}>
                      *
                    </Typography>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    onClick={handleSelectAllColumns}
                    size="small"
                    sx={{
                      color: "primary.main",
                      "&:hover": { bgcolor: "primary.light" },
                    }}
                  >
                    全选
                  </Button>
                  <Typography sx={{ color: "grey.400", lineHeight: "32px" }}>
                    |
                  </Typography>
                  <Button
                    onClick={handleDeselectAllColumns}
                    size="small"
                    sx={{
                      color: "grey.700",
                      "&:hover": { bgcolor: "grey.100" },
                    }}
                  >
                    取消全选
                  </Button>
                </Box>
              </Box>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(1, 1fr)",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 2,
                }}
              >
                {availableColumns.map((column) => (
                  <Box
                    key={column}
                    onClick={() => handleColumnToggle(column)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      p: 2,
                      border: 1,
                      borderRadius: 2,
                      borderColor: "grey.200",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <Checkbox
                      checked={formData.selectedColumns.includes(column)}
                      size="small"
                      sx={{
                        p: 0,
                        mr: 1,
                        color: "grey.400",
                        "&.Mui-checked": { color: "primary.main" },
                      }}
                    />
                    <Typography variant="body2" sx={{ color: "grey.700" }}>
                      {column}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {errors.selectedColumns && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    color: "error.main",
                    fontSize: 14,
                  }}
                >
                  <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
                  {errors.selectedColumns}
                </Box>
              )}
              <Typography variant="body2" sx={{ color: "grey.500" }}>
                已选择 {formData.selectedColumns.length} 列
              </Typography>
            </Box>
          )}

          {/* Export Format */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FileText
                sx={{ width: 20, height: 20, color: "info.main", mr: 1 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                导出格式
              </Typography>
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: 3, gap: 2 }}>
              {(["excel", "pdf", "csv"] as ExportFormat[]).map((format) => (
                <Box
                  key={format}
                  onClick={() => setFormData((prev) => ({ ...prev, format }))}
                  sx={{
                    p: 2,
                    border: 2,
                    borderRadius: 2,
                    cursor: "pointer",
                    borderColor:
                      formData.format === format ? "primary.main" : "grey.200",
                    bgcolor:
                      formData.format === format
                        ? "primary.light"
                        : "transparent",
                    "&:hover": {
                      borderColor:
                        formData.format === format
                          ? "primary.main"
                          : "primary.light",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        mb: 1,
                        color:
                          formData.format === format
                            ? "primary.main"
                            : "grey.500",
                      }}
                    >
                      {getFormatIcon(format)}
                    </Box>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        color: "grey.900",
                        textTransform: "capitalize",
                      }}
                    >
                      {format}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "grey.500", mt: 0.5 }}
                    >
                      {format === "excel" && ".xlsx 文件"}
                      {format === "pdf" && ".pdf 文件"}
                      {format === "csv" && ".csv 文件"}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            bgcolor: "grey.100",
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "grey.200",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ fontSize: 14, color: "grey.600" }}>
              {formData.selectedColumns.length > 0 && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <CheckCircle
                    sx={{
                      width: 16,
                      height: 16,
                      color: "success.main",
                      mr: 0.5,
                    }}
                  />
                  已配置 {formData.selectedColumns.length} 列
                  {formData.reportType && (
                    <Typography
                      component="span"
                      sx={{ ml: 1, color: "grey.400" }}
                    >
                      (
                      {
                        REPORT_COLUMNS[formData.reportType as ReportType]
                          ?.length
                      }{" "}
                      可选)
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                onClick={onClose}
                disabled={submitting}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: "grey.300",
                  color: "grey.700",
                  "&:hover": { bgcolor: "grey.100" },
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                variant="contained"
                startIcon={
                  submitting ? (
                    <Loader2
                      sx={{
                        width: 16,
                        height: 16,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <FileText sx={{ width: 16, height: 16 }} />
                  )
                }
                sx={{ borderRadius: 2 }}
              >
                {submitting ? "生成中..." : "生成报表"}
              </Button>
            </Box>
          </Box>
          {errors.submit && (
            <Box
              sx={{
                mt: 1,
                color: "error.main",
                fontSize: 14,
                display: "flex",
                alignItems: "center",
              }}
            >
              <AlertCircle sx={{ width: 16, height: 16, mr: 0.5 }} />
              {errors.submit}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ReportBuilder;
