import React, { useState } from "react";
import { Box, Typography, TextField, Checkbox, LinearProgress,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import {
  X,
  FileSpreadsheet,
  File,
  FileText,
  Download,
  CheckCircle,
  Loader2,
  Columns,
} from "lucide-react";
import type { ReportData, ExportFormat } from "@/api/report";
import { logger } from "@/utils/logger";

interface ExportModalProps {
  report: ReportData;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ report, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [customFilename, setCustomFilename] = useState("");
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const formatOptions = [
    {
      value: "excel" as ExportFormat,
      label: "Excel (.xlsx)",
      icon: FileSpreadsheet,
      description: "适合数据分析，支持公式和图表",
      color: "#16a34a",
      bgColor: "#f0fdf4",
      borderColor: "#bbf7d0",
    },
    {
      value: "pdf" as ExportFormat,
      label: "PDF (.pdf)",
      icon: File,
      description: "适合打印和文档分享",
      color: "#dc2626",
      bgColor: "#fef2f2",
      borderColor: "#fecaca",
    },
    {
      value: "csv" as ExportFormat,
      label: "CSV (.csv)",
      icon: FileText,
      description: "适合数据交换和程序读取",
      color: "#2563eb",
      bgColor: "#eff6ff",
      borderColor: "#bfdbfe",
    },
  ];

  const generateFilename = () => {
    if (customFilename) return customFilename;
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const reportName = report.config.title.replace(
      /[^a-zA-Z0-9\u4e00-\u9fa5]/g,
      "_",
    );
    return `${reportName}_${timestamp}`;
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setExportProgress(0);
      setExportError(null);

      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setExportProgress(i);
      }

      const exportData = generateExportData();
      downloadFile(exportData, generateFilename(), format);

      setExportComplete(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setExportError("导出失败，请重试");
      logger.error("导出失败:", err);
    } finally {
      setExporting(false);
    }
  };

  const generateExportData = () => {
    const data = report.data;
    const columns = report.config.columns;

    switch (format) {
      case "csv":
        return generateCSV(data, columns);
      case "excel":
        return generateExcelData(data, columns);
      case "pdf":
        return generatePDFData(data, columns);
      default:
        return generateCSV(data, columns);
    }
  };

  const generateCSV = (data: any[], columns: string[]) => {
    const headers = columns.join(",");
    const rows = data.map((row) =>
      columns
        .map((col) => {
          const value = row[col];
          if (value === undefined || value === null) return "";
          const str = String(value);
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(","),
    );
    return [headers, ...rows].join("\n");
  };

  const generateExcelData = (data: any[], columns: string[]) => {
    return {
      type: "excel",
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? "")),
    };
  };

  const generatePDFData = (data: any[], columns: string[]) => {
    return {
      type: "pdf",
      title: report.config.title,
      headers: columns,
      rows: data.map((row) => columns.map((col) => row[col] ?? "")),
    };
  };

  const downloadFile = (data: any, filename: string, format: ExportFormat) => {
    let content: string | Blob;
    let mimeType: string;

    if (format === "csv") {
      const BOM = "\uFEFF";
      content = BOM + data;
      mimeType = "text/csv;charset=utf-8";
    } else if (format === "excel") {
      const csvContent = generateCSV(report.data, report.config.columns);
      const BOM = "\uFEFF";
      content = BOM + csvContent;
      mimeType = "application/vnd.ms-excel;charset=utf-8";
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${format === "excel" ? "csv" : format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 2,
      }}
    >
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "0.75rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          width: "100%",
          maxWidth: 768,
        }}
      >
        <Box
          sx={{
            padding: 3,
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(90deg, #f0fdf4, #ecfdf5)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: "1.25rem",
                  fontWeight: "semibold",
                  color: "#0f172a",
                }}
              >
                导出报表
              </Typography>
              <Typography
                sx={{ fontSize: "0.875rem", color: "#475569", marginTop: 0.5 }}
              >
                {report.config.title}
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              sx={{
                padding: 1,
                "&:hover": { backgroundColor: "#f1f5f9" },
                borderRadius: "0.5rem",
                color: "#64748b",
              }}
            >
              <X sx={{ width: 20, height: 20 }} />
            </Button>
          </Box>
        </Box>

        <Box
          sx={{ padding: 4, display: "flex", flexDirection: "column", gap: 4 }}
        >
          {!exporting && !exportComplete && !exportError && (
            <>
              <Box>
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: "medium",
                    color: "#334155",
                    marginBottom: 2,
                  }}
                >
                  选择导出格式
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 2,
                  }}
                >
                  {formatOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = format === option.value;
                    return (
                      <Box
                        key={option.value}
                        onClick={() => setFormat(option.value)}
                        sx={{
                          padding: 3,
                          borderRadius: "0.5rem",
                          border: isSelected
                            ? "2px solid #2563eb"
                            : `2px solid ${option.borderColor}`,
                          backgroundColor: isSelected
                            ? "#eff6ff"
                            : option.bgColor,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          "&:hover": { transform: "scale(1.02)" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            marginBottom: 1,
                          }}
                        >
                          <Icon
                            sx={{
                              width: 32,
                              height: 32,
                              color: isSelected ? "#2563eb" : option.color,
                            }}
                          />
                        </Box>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: "medium",
                            color: "#0f172a",
                            textAlign: "center",
                          }}
                        >
                          {option.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.75rem",
                            color: "#64748b",
                            textAlign: "center",
                            marginTop: 0.5,
                          }}
                        >
                          {option.description}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      color: "#334155",
                      marginBottom: 1,
                    }}
                  >
                    自定义文件名（可选）
                  </Typography>
                  <TextField
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    placeholder={generateFilename()}
                    fullWidth
                    size="small"
                    sx={{
                      "& .MuiOutlinedInput-root": { borderRadius: "0.5rem" },
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      marginTop: 0.5,
                    }}
                  >
                    默认文件名包含报表名称和导出日期
                  </Typography>
                </Box>

                {format === "csv" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Checkbox
                      checked={includeHeaders}
                      onChange={(e) => setIncludeHeaders(e.target.checked)}
                      sx={{
                        color: "#2563eb",
                        "&.Mui-checked": { color: "#2563eb" },
                      }}
                    />
                    <Typography sx={{ fontSize: "0.875rem", color: "#334155" }}>
                      包含表头
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "0.5rem",
                  padding: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    marginBottom: 1,
                  }}
                >
                  <Columns sx={{ width: 16, height: 16, color: "#64748b" }} />
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: "medium",
                      color: "#334155",
                    }}
                  >
                    导出预览
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                    • 报表名称：{report.config.title}
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                    • 数据行数：{report.row_count} 条
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                    • 导出列数：{report.config.columns.length} 列
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                    • 导出格式：{format.toUpperCase()}
                  </Typography>
                  <Typography sx={{ fontSize: "0.875rem", color: "#475569" }}>
                    • 文件名：{generateFilename()}.
                    {format === "excel" ? "csv" : format}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {exporting && (
            <Box sx={{ textAlign: "center", paddingY: 6 }}>
              <Loader2
                sx={{
                  width: 64,
                  height: 64,
                  color: "#2563eb",
                  margin: "0 auto 16px",
                  animation: "spin 1s linear infinite",
                }}
              />
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: "medium",
                  color: "#0f172a",
                }}
              >
                正在导出报表...
              </Typography>
              <Box sx={{ width: "100%", marginTop: 2 }}>
                <LinearProgress
                  variant="determinate"
                  value={exportProgress}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#e2e8f0",
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 5,
                      backgroundColor: "#2563eb",
                    },
                  }}
                />
              </Box>
              <Typography
                sx={{ fontSize: "0.875rem", color: "#475569", marginTop: 1 }}
              >
                {exportProgress}%
              </Typography>
            </Box>
          )}

          {exportComplete && (
            <Box sx={{ textAlign: "center", paddingY: 6 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#dcfce7",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle sx={{ width: 32, height: 32, color: "#16a34a" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: "medium",
                  color: "#0f172a",
                }}
              >
                导出成功！
              </Typography>
              <Typography
                sx={{ fontSize: "0.875rem", color: "#475569", marginTop: 1 }}
              >
                文件已开始下载
              </Typography>
            </Box>
          )}

          {exportError && (
            <Box sx={{ textAlign: "center", paddingY: 6 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <X sx={{ width: 32, height: 32, color: "#dc2626" }} />
              </Box>
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: "medium",
                  color: "#7f1d1d",
                }}
              >
                {exportError}
              </Typography>
              <Button
                onClick={() => setExportError(null)}
                sx={{
                  marginTop: 2,
                  paddingX: 2,
                  paddingY: 1,
                  backgroundColor: "#dc2626",
                  color: "white",
                  borderRadius: "0.5rem",
                  "&:hover": { backgroundColor: "#b91c1c" },
                }}
              >
                重试
              </Button>
            </Box>
          )}
        </Box>

        {!exporting && !exportComplete && !exportError && (
          <Box
            sx={{
              padding: 3,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "flex-end",
              gap: 2,
            }}
          >
            <Button
              onClick={onClose}
              sx={{
                paddingX: 2,
                paddingY: 1,
                color: "#334155",
                backgroundColor: "#f1f5f9",
                borderRadius: "0.5rem",
                "&:hover": { backgroundColor: "#e2e8f0" },
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleExport}
              variant="contained"
              startIcon={<Download sx={{ width: 16, height: 16 }} />}
              sx={{
                paddingX: 3,
                paddingY: 1,
                backgroundColor: "#16a34a",
                color: "white",
                borderRadius: "0.5rem",
                "&:hover": { backgroundColor: "#15803d" },
              }}
            >
              导出
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ExportModal;
