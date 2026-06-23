import React, { useState } from "react";
import { Box, Typography, TextField, IconButton, Paper,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { X, Download } from "lucide-react";

export interface ExportOptionsProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string, columns: string[]) => void;
  availableColumns: Array<{ key: string; label: string }>;
  title?: string;
}

export const ExportOptions: React.FC<ExportOptionsProps> = ({
  isOpen,
  onClose,
  onExport,
  availableColumns,
  title = "导出选项",
}) => {
  const [format, setFormat] = useState("csv");
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    availableColumns.map((col) => col.key),
  );
  const [selectAll, setSelectAll] = useState(true);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(availableColumns.map((col) => col.key));
    }
    setSelectAll(!selectAll);
  };

  const handleToggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      setSelectedColumns(selectedColumns.filter((k) => k !== key));
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const handleExport = () => {
    onExport(format, selectedColumns);
    onClose();
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
        p: 4,
      }}
    >
      <Paper
        sx={{
          backgroundColor: "white",
          borderRadius: 3,
          boxShadow: 20,
          width: "100%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: 6,
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            sx={{ fontSize: "1.125rem", fontWeight: 600, color: "#0f172a" }}
          >
            {title}
          </Typography>
          <IconButton
            onClick={onClose}
            sx={{
              color: "#94a3b8",
              "&:hover": { color: "#475569" },
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            p: 6,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            maxHeight: "calc(90vh - 180px)",
            overflowY: "auto",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#334155",
                mb: 2,
              }}
            >
              导出格式
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === "csv"}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ marginRight: 8 }}
                />
                <Typography sx={{ fontSize: "0.875rem", color: "#334155" }}>
                  CSV (逗号分隔)
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <input
                  type="radio"
                  name="format"
                  value="xlsx"
                  checked={format === "xlsx"}
                  onChange={(e) => setFormat(e.target.value)}
                  style={{ marginRight: 8 }}
                />
                <Typography sx={{ fontSize: "0.875rem", color: "#334155" }}>
                  Excel (.xlsx)
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#334155" }}
              >
                选择导出列
              </Typography>
              <Button
                onClick={handleSelectAll}
                sx={{
                  fontSize: "0.875rem",
                  color: "#2563eb",
                  "&:hover": { color: "#1d4ed8" },
                }}
              >
                {selectAll ? "取消全选" : "全选"}
              </Button>
            </Box>
            <Box
              sx={{
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                p: 4,
                maxHeight: 240,
                overflowY: "auto",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {availableColumns.map((column) => (
                  <Box
                    key={column.key}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      borderRadius: 2,
                      p: 2,
                      "&:hover": { backgroundColor: "#f8fafc" },
                    }}
                    onClick={() => handleToggleColumn(column.key)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.key)}
                      onChange={() => handleToggleColumn(column.key)}
                      style={{ marginRight: 12 }}
                    />
                    <Typography sx={{ fontSize: "0.875rem", color: "#334155" }}>
                      {column.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              backgroundColor: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 2,
              p: 4,
            }}
          >
            <Typography sx={{ fontSize: "0.875rem", color: "#1e40af" }}>
              已选择 {selectedColumns.length} 列，共 {availableColumns.length}{" "}
              列
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            p: 6,
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
            gap: 3,
          }}
        >
          <Button
            onClick={onClose}
            sx={{
              px: 4,
              py: 2,
              color: "#334155",
              backgroundColor: "#f1f5f9",
              borderRadius: 2,
              "&:hover": { backgroundColor: "#e2e8f0" },
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedColumns.length === 0}
            sx={{
              px: 4,
              py: 2,
              backgroundColor: "#2563eb",
              color: "white",
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              "&:hover": { backgroundColor: "#1d4ed8" },
              "&:disabled": {
                opacity: 0.5,
                cursor: "not-allowed",
              },
            }}
          >
            <Download style={{ width: 16, height: 16, marginRight: 8 }} />
            导出
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ExportOptions;
