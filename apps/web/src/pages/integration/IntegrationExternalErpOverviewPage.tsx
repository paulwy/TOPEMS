import React from "react";
import { Box, Typography } from "@mui/material";

const IntegrationExternalErpOverviewPage: React.FC = () => {
  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", p: 3 }}>
      <Box sx={{ maxWidth: 1280, mx: "auto" }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: "#111827", mb: 3 }}
        >
          🔗 外部ERP连接管理
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 3,
            mb: 3,
          }}
        >
          <Box
            sx={{
              backgroundColor: "#ffffff",
              p: 3,
              borderRadius: 8,
              boxShadow: 1,
              border: "2px solid #bfdbfe",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>🗄️</span> 金蝶K/3
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.875rem", color: "#4b5563", mb: 2 }}>
              连接金蝶K/3 WMS Cloud系统，实现数据同步
            </Typography>
            <a
              href="/integration/external-erp"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                color: "#ffffff",
                borderRadius: 8,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              管理连接
            </a>
          </Box>

          <Box
            sx={{
              backgroundColor: "#ffffff",
              p: 3,
              borderRadius: 8,
              boxShadow: 1,
              border: "2px solid #fed7aa",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>📊</span> 用友U8/NC
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.875rem", color: "#4b5563", mb: 2 }}>
              连接用友U8或NC系统，实现财务数据同步
            </Typography>
            <a
              href="/integration/external-erp"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#ea580c",
                color: "#ffffff",
                borderRadius: 8,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              管理连接
            </a>
          </Box>

          <Box
            sx={{
              backgroundColor: "#ffffff",
              p: 3,
              borderRadius: 8,
              boxShadow: 1,
              border: "2px solid #bbf7d0",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "#111827",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>🌐</span> SAP S/4HANA
              </Typography>
            </Box>
            <Typography sx={{ fontSize: "0.875rem", color: "#4b5563", mb: 2 }}>
              连接SAP S/4HANA系统，实现业务数据集成
            </Typography>
            <a
              href="/integration/external-erp"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                backgroundColor: "#16a34a",
                color: "#ffffff",
                borderRadius: 8,
                fontSize: "0.875rem",
                textDecoration: "none",
              }}
            >
              管理连接
            </a>
          </Box>
        </Box>

        <Box
          sx={{
            backgroundColor: "#ffffff",
            p: 3,
            borderRadius: 8,
            boxShadow: 1,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: "#111827", mb: 2 }}
          >
            🔗 外部ERP连接说明
          </Typography>
          <Typography sx={{ fontSize: "0.875rem", color: "#4b5563" }}>
            管理和配置与外部ERP系统的连接，包括金蝶、用友、SAP等。支持数据映射、同步配置和实时监控。
            详细信息请访问外部ERP连接页面。
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default IntegrationExternalErpOverviewPage;
