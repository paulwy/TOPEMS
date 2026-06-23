import React from "react";
import type { ReportData } from "@/api/report";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui/Button";

interface ExportModalProps {
  report: ReportData;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ report, onClose }) => {
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
          p: 3,
          width: "100%",
          maxWidth: 448,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            导出报表
          </Typography>
          <Button
            onClick={onClose}
            sx={{
              minWidth: "auto",
              color: "grey.500",
              "&:hover": { color: "grey.700" },
            }}
          >
            ✕
          </Button>
        </Box>
        <Box sx={{ mb: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {report.config.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.500" }}>
            共 {report.row_count} 行数据
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 500, color: "grey.700", mb: 1 }}
          >
            选择导出格式
          </Typography>
          <select
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "0.875rem",
            }}
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "grey.500",
              color: "white",
              borderRadius: 1,
              "&:hover": { bgcolor: "grey.600" },
            }}
          >
            取消
          </Button>
          <Button
            onClick={onClose}
            sx={{
              px: 2,
              py: 1,
              bgcolor: "primary.main",
              color: "white",
              borderRadius: 1,
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            导出
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ExportModal;
